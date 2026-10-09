# Zoom Clone – SDE Fullstack Assignment (2-hour build)

Goal: a working, deployed Zoom-style web app. Must-haves: Landing Dashboard, Instant Meeting, Join Meeting, Schedule Meeting. UI should look as close to Zoom's web app as possible. Time is very limited, so follow the phases in order, do not gold-plate, and do not stop between phases unless genuinely blocked.

## Stack (fixed, do not change)
- Frontend: Next.js (App Router, TypeScript, Tailwind CSS, lucide-react) in `/frontend`. Behaves as a single-page app: all pages are client components that fetch from the API in `useEffect`.
- Backend: Python FastAPI + SQLAlchemy + SQLite in `/backend`.
- Database: SQLite file `backend/zoom.db` locally. In production, set `DATABASE_URL` to a Postgres URL (free Neon database) so data survives Render restarts.
- Authentication: the app opens on a login screen. Seeded demo account `siddhartha@gmail.com` / `123456`, or sign up (bcrypt passwords, 7-day JWT). Guests join meetings from an invite link without an account. With no token, the API falls back to the demo account.

## Hard rules
1. Original work only. Use lucide-react icons. Do not copy Zoom's assets, logos, or code.
2. The code must be simple enough that I can explain every line in an interview. Prefer plain, readable code over clever abstractions. Add short comments only where logic is non-obvious.
3. Keep separation of concerns. Backend: `models/`, `schemas/`, `routers/`, `services/`, `database.py`, `seed.py`, `main.py`. Frontend: `app/` for routes, `components/` for reusable UI, `lib/api.ts` for all API calls, `lib/utils.ts` for helpers.
4. After every phase: run it, fix errors, then `git add . && git commit -m "phase N: <name>"`.
5. Never hardcode URLs. Frontend uses `NEXT_PUBLIC_API_URL`. Backend uses env vars `FRONTEND_URL` and `CORS_ORIGINS` (comma separated, default `http://localhost:3000`).
6. If a screenshot exists in `/reference`, read it and match layout, spacing and colors. If none exists, use the design tokens below.

## Design tokens (Zoom look and feel)
- Zoom blue `#0B5CFF` (hover `#0948CC`), orange for New Meeting `#FF742E`, text `#232333`, muted text `#747487`, borders `#E8E8EF`, page background `#FFFFFF`, light panel `#F7F7FA`.
- Meeting room background `#1C1C1C`, toolbar `#232323`, danger red `#E02828`.
- Font: Inter (or system sans). Rounded corners 8-12px, subtle shadows, generous whitespace.
- Dashboard layout: slim top navbar (logo text "zoom" in blue on the left, search box in the middle, settings and profile avatar on the right). Left sidebar with Home, Meetings, Team Chat, Phone, Calendar, Contacts (placeholders, only Home and Meetings need to be clickable). Main area: greeting with current time and date, then a row of big action tiles: New Meeting (orange), Join (blue), Schedule (blue), then an "Upcoming" card and a "Recent" card/list below.

## Database schema (evaluated, so design carefully)
`users`: id (PK), name, email (unique), avatar_color, created_at
`meetings`: id (PK), meeting_code (string, 10 digits, UNIQUE, indexed), title, description (nullable), host_id (FK -> users.id), type ("instant" | "scheduled"), scheduled_start (datetime UTC, nullable for instant, indexed), duration_minutes (int, default 40), status ("scheduled" | "live" | "ended"), created_at, started_at (nullable), ended_at (nullable)
`participants`: id (PK), meeting_id (FK -> meetings.id, indexed), user_id (FK -> users.id, nullable for guests), display_name, role ("host" | "participant"), joined_at, left_at (nullable)

Relationships: User 1-N Meetings (as host); Meeting 1-N Participants; User 1-N Participants (optional). Store all datetimes in UTC; the frontend converts to local time for display.

## Backend API
- `POST /meetings/instant` body `{title?}` -> creates a meeting hosted by the default user, status "live", starts now, adds the host as a participant, returns the meeting incl. `meeting_code` and `invite_link` (`{FRONTEND_URL}/j/{code}`).
- `POST /meetings` body `{title, description?, scheduled_start, duration_minutes}` -> creates a scheduled meeting (status "scheduled"), returns it with `invite_link`.
- `GET /meetings/upcoming` -> status "scheduled" AND scheduled_start >= now, ordered by scheduled_start ascending.
- `GET /meetings/recent` -> status "ended", ordered by ended_at descending, limit 10.
- `GET /meetings/{code}` -> returns the meeting with its current (not left) participants. 404 `{detail: "Meeting not found"}` if the code does not exist. Also 404-style error if status is "ended".
- `POST /meetings/{code}/join` body `{display_name}` -> validates the meeting exists and is not ended, adds a participant (role "participant"), and if the meeting was "scheduled" switches it to "live" with started_at set. Returns the meeting and the participant.
- `POST /meetings/{code}/leave` body `{participant_id}` -> sets left_at.
- `POST /meetings/{code}/end` -> sets status "ended" and ended_at (used by the host's Leave/End button so the meeting moves to Recent).
- `GET /health` -> `{status: "ok"}`.

Meeting code: generate a random 10-digit numeric string, retry in a loop until it is unique in the DB. Put this logic in `services/meeting_service.py`. Return codes unformatted from the API; the frontend displays them as `123 4567 8901`.

Seed (`seed.py`, idempotent: do nothing if the default user already exists): 1 default user ("Kartikeya", email like `user@example.com`), 3 upcoming scheduled meetings (dates computed relative to now, e.g. +2h, +1 day, +3 days, so they stay upcoming), 5 ended meetings in the past (relative dates) with 2-4 participants each. Run `Base.metadata.create_all` and the seed on app startup so a fresh deploy never boots empty.

## Frontend pages and behavior
- `/` Dashboard (design above). Upcoming and Recent lists come from the API. New Meeting tile calls `POST /meetings/instant` then redirects to `/meeting/{code}` after setting the display name to the default user's name (stored in sessionStorage). Join tile opens the Join modal. Schedule tile opens the Schedule modal. Show an empty state when lists are empty. Each upcoming item shows time range, title, meeting ID, a "Start" button (goes to `/meeting/{code}` as host) and a copy-invite-link button.
- Join modal: input for Meeting ID or invite link (accept `123 4567 8901`, `1234567891`, or a full `.../j/1234567891` URL; extract digits with a helper in `lib/utils.ts`), input for display name (prefilled with the default user's name), Join button disabled until both are filled. On submit validate with `GET /meetings/{code}`; show an inline red error "Meeting not found" if missing; otherwise save the name in sessionStorage and navigate to `/j/{code}`.
- Schedule modal: title (default "My Meeting"), description, date picker, time picker, duration (dropdown 15/30/40/60/90/120 min), Save button. Calls `POST /meetings`, then shows a success state with the Meeting ID and invite link plus a Copy button, and refreshes the Upcoming list.
- `/j/[code]` Pre-join screen: validate the code on load (friendly error page if invalid), display name input, camera preview using `navigator.mediaDevices.getUserMedia` (handle permission denied gracefully with an avatar fallback), mic and video toggle buttons, a "Join" button that calls `POST /meetings/{code}/join` and goes to `/meeting/{code}`.
- `/meeting/[code]` Meeting room: dark `#1C1C1C` background. Top bar with meeting title, meeting ID, and a copy-invite-link button. Center: responsive participant tile grid (avatar circle with initials and name label per participant from the API, your own tile shows the live camera if enabled). Bottom toolbar (centered): Mute/Unmute, Start/Stop Video, Participants (toggles a right side panel listing participants), Invite (copies link), and a red "Leave" button. Leave by the host calls `/end` and goes to the dashboard; Leave by a participant calls `/leave` and goes to the dashboard. No real multi-user video (no WebRTC); this is a deliberate scope decision.
- Loading states and error states on every API call. Wrap `fetch` in `lib/api.ts` with one error-handling helper.

## Phases (execute in order, commit after each)
1. **Setup**: `git init` if needed, folder structure, `.gitignore` (node_modules, .next, venv, `*.db`, `.env*`), `.env.example` files for both apps.
2. **Backend**: venv, `requirements.txt`, models, schemas, services, routers, seed, startup hook, CORS. Run with `uvicorn main:app --reload` and verify with curl or `/docs`: create instant, create scheduled, list upcoming/recent, get by code, join, end.
3. **Frontend scaffold**: Next.js + Tailwind + lucide-react, design tokens in `tailwind.config` / globals, shared layout (navbar + sidebar), `lib/api.ts`, `lib/utils.ts`.
4. **Dashboard + Join + Schedule modals**: build to match the screenshot in `/reference` if present, else the design tokens. Then run the app and test all three flows against the real backend.
5. **Pre-join and meeting room**: as specified above. Test: New Meeting -> room; Join with a bad ID -> error; Join with a valid ID -> pre-join -> room; Leave/End -> meeting appears in Recent.
6. **Visual pass (max 1 round)**: if a screenshot exists, compare against the running app and fix the 5 biggest differences only. Then stop polishing.
7. **Deploy prep**: backend `render.yaml` (root dir `backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`, env vars `FRONTEND_URL`, `CORS_ORIGINS`), pin the Python version. Frontend: make sure `npm run build` passes with no errors, and list the env var `NEXT_PUBLIC_API_URL` for Vercel (root dir `frontend`). Do not attempt to deploy yourself; print the exact steps for me.
8. **README.md** (repo root): overview, tech stack, folder structure, local setup for both apps (exact commands), schema table with relationships, API endpoint list, assumptions (default user, no auth, no real WebRTC, polling not used), features not built due to the 2-hour limit (host controls, responsive design, chat/reactions), deploy links placeholder.
9. **INTERVIEW_NOTES.md**: for each part (schema, meeting code generation, join validation, instant/schedule flows, seed, CORS, frontend data fetching, getUserMedia) explain what it does and why it was designed that way, in plain language, with file paths. Then trace one full request end to end: click New Meeting -> API call -> DB write -> redirect -> room load.

## Definition of done
- Backend runs, `/docs` works, seed populates data on a fresh DB.
- All four core features work end to end locally.
- `npm run build` passes.
- README.md and INTERVIEW_NOTES.md exist.
- Each phase is committed.
- At the end print a short summary: what is done, what is not, and the exact manual steps I still need for deployment (Render, Vercel, env vars, CORS).
