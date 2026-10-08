# Zoom Clone

A Zoom-style video meetings web app built as a 2-hour full-stack assignment. You can start an instant meeting, join one by ID or invite link, schedule meetings for later, and see upcoming and recent meetings on a dashboard modeled on the Zoom Workplace home screen.

**Live demo**

- Frontend: `<add Vercel URL>`
- Backend API docs: `<add Render URL>/docs`
- **Demo login:** `siddhartha@gmail.com` / `123456`

## Features

- **Dashboard**: live clock and date, New meeting / Join / Schedule tiles, Upcoming and Recent meeting lists from the API, empty states. Meetings in progress are listed with a **Rejoin** button so the host can get back in.
- **Accounts**: the app opens on a login screen. Log in with the demo account (one click fills it in) or sign up at `/signup` (bcrypt passwords, 7-day JWT). You only see and host your own meetings. Guests join from an invite link without an account. The navbar profile menu shows your name with Log out.
- **Instant meeting**: one click creates a live meeting and drops you into the room as host.
- **Join meeting**: accepts `123 4567 890`, `1234567890`, or a full `.../j/1234567890` link; shows "Meeting not found" for bad IDs.
- **Schedule meeting**: title, description, date, time and duration; shows the meeting ID and a copyable invite link when saved.
- **Pre-join screen** (`/j/{code}`): camera preview via `getUserMedia`, mic/video toggles, name input; falls back to an initials avatar and explains why if the camera can't be used.
- **Mic check**: the mic icon fills green as you speak (Web Audio `AnalyserNode`), and **Test mic** on the pre-join screen records 3 seconds and plays them back (`MediaRecorder`).
- **Meeting room** (`/meeting/{code}`): participant tile grid (your own tile shows your camera), mute, video, participants panel with each person's mic state, copy invite link, Leave (participant) / End (host).
- **Host controls**: in the Participants panel the host can **Mute all** and **Remove** a participant (with a confirm step). The room polls the meeting every 3 seconds, so a muted participant's mic turns off (they can unmute themselves), and a removed participant's camera and mic stop and they are sent back to the dashboard with "You were removed by the host".

## Tech stack

| Layer    | Tech                                                                       |
| -------- | -------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react |
| Backend  | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2, Uvicorn, bcrypt, PyJWT     |
| Database | SQLite (`backend/zoom.db`, created and seeded on startup)                  |
| Hosting  | Vercel (frontend), Render (backend)                                        |

## Folder structure

```
.
├── render.yaml                  # Render blueprint for the backend
├── backend/
│   ├── main.py                  # FastAPI app: CORS, startup (create tables + seed), routers
│   ├── database.py              # SQLAlchemy engine, session, get_db dependency
│   ├── seed.py                  # Idempotent demo data (default user + meetings)
│   ├── models/                  # SQLAlchemy tables: user, meeting, participant
│   ├── schemas/                 # Pydantic request/response models
│   ├── routers/                 # HTTP endpoints: auth.py, meetings.py
│   ├── services/
│   │   ├── auth_service.py      # Password hashing, JWTs, signup/login, get_current_user dependency
│   │   ├── meeting_service.py   # Unique meeting codes, invite links, open/live meeting lookups
│   │   └── participant_service.py # Who is in a meeting; host controls (mute all, remove)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx             # Dashboard (/)
    │   ├── login/, signup/      # Optional accounts
    │   ├── meetings/page.tsx    # Meetings list (/meetings)
    │   ├── j/[code]/            # Pre-join screen
    │   └── meeting/[code]/      # Meeting room
    ├── components/              # AppShell, modals, meeting lists, VideoTile, ParticipantsPanel, ...
    ├── lib/
    │   ├── api.ts               # Every API call, through one fetch wrapper (adds the login token, handles errors)
    │   ├── auth.tsx             # AuthContext: current user, login/signup/logout, token in localStorage
    │   ├── utils.ts             # Formatting, meeting-code parsing, sessionStorage helpers
    │   ├── useLocalMedia.ts     # Camera/mic hook (getUserMedia)
    │   ├── useMicLevel.ts       # Live mic loudness for the green mic meter
    │   └── useMicTest.ts        # "Test mic": record 3 seconds, play them back
    └── .env.example
```

## Running locally

Requirements: **Python 3.12** and **Node.js 20.9+**.

### 1. Backend (http://localhost:8000)

```bash
cd backend
python -m venv venv

# Activate the virtual environment:
#   Windows PowerShell:  venv\Scripts\Activate.ps1
#   Windows Git Bash:    source venv/Scripts/activate
#   macOS / Linux:       source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

The database file and demo data are created automatically on first start. API docs: http://localhost:8000/docs

Log in with the demo account, `siddhartha@gmail.com` / `123456`. Its data includes a live meeting, **Team standup (demo)**, with 3 guests in it: click **Rejoin** on the dashboard to try the host controls.

There are no migrations (`create_all` only creates missing tables, it never adds columns to existing ones). To reset the demo data, or after pulling changes that add columns, stop the server, delete `backend/zoom.db`, and start it again.

### 2. Frontend (http://localhost:3000)

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Environment variables

| App      | Variable              | Default (local)         | Purpose                                                   |
| -------- | --------------------- | ----------------------- | --------------------------------------------------------- |
| Backend  | `FRONTEND_URL`        | `http://localhost:3000` | Base URL used to build invite links (`{FRONTEND_URL}/j/{code}`) |
| Backend  | `CORS_ORIGINS`        | `http://localhost:3000` | Comma-separated list of origins allowed to call the API   |
| Backend  | `SECRET_KEY`          | random at startup       | Signs login tokens. If unset, logins reset when the server restarts; Render generates one |
| Frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL. Read at **build time**                  |

## Database schema

All datetimes are stored in UTC. The frontend converts them to the viewer's local time.

**`users`**

| Column       | Type     | Notes            |
| ------------ | -------- | ---------------- |
| id           | integer  | Primary key      |
| name         | string   |                  |
| email        | string   | Unique           |
| avatar_color | string   | Hex color        |
| password_hash | string  | Nullable bcrypt hash (a user without one can't log in) |
| created_at   | datetime |                  |

**`meetings`**

| Column           | Type     | Notes                                              |
| ---------------- | -------- | -------------------------------------------------- |
| id               | integer  | Primary key                                        |
| meeting_code     | string   | 10 digits, **unique**, **indexed**                 |
| title            | string   |                                                    |
| description      | string   | Nullable                                           |
| host_id          | integer  | Foreign key → `users.id`                           |
| type             | string   | `instant` or `scheduled`                           |
| scheduled_start  | datetime | Nullable (instant meetings), **indexed**           |
| duration_minutes | integer  | Default 40                                         |
| status           | string   | `scheduled` → `live` → `ended`                     |
| created_at       | datetime |                                                    |
| started_at       | datetime | Nullable, set when the meeting goes live           |
| ended_at         | datetime | Nullable, set when the host ends the meeting       |

**`participants`**

| Column       | Type     | Notes                                            |
| ------------ | -------- | ------------------------------------------------ |
| id           | integer  | Primary key                                      |
| meeting_id   | integer  | Foreign key → `meetings.id`, **indexed**         |
| user_id      | integer  | Foreign key → `users.id`, nullable (guests)      |
| display_name | string   |                                                  |
| role         | string   | `host` or `participant`                          |
| is_muted     | boolean  | Default false. Set by "Mute all" or by the participant |
| is_removed   | boolean  | Default false. Set when the host removes the participant |
| joined_at    | datetime |                                                  |
| left_at      | datetime | Nullable. `NULL` means still in the meeting      |

**Relationships**

- User 1 — N Meetings (as host, via `meetings.host_id`)
- Meeting 1 — N Participants (via `participants.meeting_id`)
- User 1 — N Participants, optional (via `participants.user_id`; guests have no user)

## API

| Method | Path                         | Body                                                      | Description                                                                    |
| ------ | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/health`                    |                                                           | `{status: "ok"}`                                                               |
| POST   | `/auth/signup`               | `{name, email, password}`                                 | Create an account (valid email, password 6+ characters, unique email: 409). Returns `{token, user}` |
| POST   | `/auth/login`                | `{email, password}`                                       | Returns `{token, user}`; 401 on a wrong email or password                      |
| GET    | `/auth/me`                   |                                                           | The current user (see below)                                                   |
| POST   | `/meetings/instant`          | `{title?}`                                                | Create a live meeting hosted by the current user; host is added as participant |
| POST   | `/meetings`                  | `{title, description?, scheduled_start, duration_minutes}` | Create a scheduled meeting hosted by the current user                          |
| GET    | `/meetings/upcoming`         |                                                           | The current user's scheduled meetings from now on, soonest first              |
| GET    | `/meetings/recent`           |                                                           | The current user's last 10 ended meetings, most recent first                  |
| GET    | `/meetings/live`             |                                                           | The current user's meetings in progress, newest first                         |
| GET    | `/meetings/{code}`           |                                                           | Meeting with its current participants (incl. `is_muted`, `is_removed`); removed people are left out. 404 if missing or ended |
| POST   | `/meetings/{code}/join`      | `{display_name}`                                          | Add a participant; a scheduled meeting becomes live. Returns `{meeting, participant}`. 403 if that name was removed by the host |
| POST   | `/meetings/{code}/start`     |                                                           | Host enters the room; meeting becomes live. Returns `{meeting, participant}`. Safe to repeat. 403 if the current user isn't the host |
| POST   | `/meetings/{code}/leave`     | `{participant_id}`                                        | Set the participant's `left_at`                                                |
| POST   | `/meetings/{code}/end`       |                                                           | End the meeting (moves it to Recent) and mark everyone as left. 403 if the current user isn't the host |
| POST   | `/meetings/{code}/mute-all`  | `{requester_participant_id}`                              | Host only (403 otherwise): mute every non-host participant                     |
| POST   | `/meetings/{code}/participants/{id}/remove` | `{requester_participant_id}`               | Host only (403 otherwise), can't remove the host (400): sets `is_removed` and `left_at` |
| POST   | `/meetings/{code}/participants/{id}/mute`   | `{muted}`                                  | A participant mutes or unmutes themselves                                      |

**Current user:** endpoints that need one use the `get_current_user` dependency. It reads `Authorization: Bearer <token>`; with no token it returns the seeded demo account (handy for `/docs` and curl), and an invalid or expired token gets a 401.

Meeting and invite responses include `invite_link` (`{FRONTEND_URL}/j/{code}`). Errors use FastAPI's `{detail: "..."}` format.

## Assumptions

- **Log in first.** The dashboard needs a logged-in user (the demo account works), and the token is stored in `localStorage`. Guests can still join a meeting from its invite link without an account. The API itself falls back to the demo account when a request has no token.
- **No real audio/video between people (no WebRTC).** Each person sees their own camera; other participants appear as avatar tiles. This was a deliberate scope decision for the time limit.
- **Polling, no websockets.** The meeting room re-fetches the meeting every 3 seconds to pick up joins, leaves, mutes and removals.
- **Host checks:** starting and ending a meeting require the current user to be its host. Mute all and Remove send the host's participant ID (`requester_participant_id`), which the server checks belongs to this meeting's host. Requests without a token act as the demo account, so these checks protect every other account's meetings.
- **Identity is per browser tab.** Your display name, host status and participant ID live in `sessionStorage`.
- **Meeting IDs are 10 digits**, shown as `123 4567 890`.
- **SQLite on Render's free tier is not persistent.** Data resets when the service redeploys or restarts; the startup seed recreates the demo data so the app never boots empty.

## Not built (time limit)

- More host controls: mute one person, waiting room, lock meeting, make someone else host.
- In-meeting chat, reactions, screen sharing, recordings.
- Instant updates: changes reach other people through polling, so they can take up to 3 seconds to show.

## Known limitations

- Closing the tab without clicking Leave keeps that person listed in the meeting.
- A removed participant is blocked by display name only, so they could rejoin under a different name.
- Turning video off pauses the camera track rather than releasing it, so the camera light stays on.
- On Render's free tier the first request after inactivity can take up to a minute while the service wakes up.

## Deployment

### Backend on Render

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. It reads `render.yaml` (root directory `backend`, Python 3.12.10, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`).
3. Enter `FRONTEND_URL` and `CORS_ORIGINS` when prompted (use your Vercel URL; a placeholder is fine for now and can be updated later). `SECRET_KEY` is generated by Render automatically.
4. Check `https://<your-service>.onrender.com/health` returns `{"status":"ok"}`.

### Frontend on Vercel

1. In Vercel, choose **Add New → Project** and import the repo.
2. Set **Root Directory** to `frontend` (framework is detected as Next.js).
3. Add the environment variable `NEXT_PUBLIC_API_URL` = your Render URL, e.g. `https://<your-service>.onrender.com`.
4. Deploy.

### Connect them

1. In Render, set `FRONTEND_URL` and `CORS_ORIGINS` to the Vercel production URL (e.g. `https://<your-app>.vercel.app`) and save; the service redeploys.
2. If you later change `NEXT_PUBLIC_API_URL`, redeploy the frontend, because the value is baked in at build time.
