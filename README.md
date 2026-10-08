# Zoom Clone

A Zoom-style video meetings web app built as a 2-hour full-stack assignment. You can start an instant meeting, join one by ID or invite link, schedule meetings for later, and see upcoming and recent meetings on a dashboard modeled on the Zoom Workplace home screen.

**Live demo**

- Frontend: `<add Vercel URL>`
- Backend API docs: `<add Render URL>/docs`

## Features

- **Dashboard**: live clock and date, New meeting / Join / Schedule tiles, Upcoming and Recent meeting lists from the API, empty states.
- **Instant meeting**: one click creates a live meeting and drops you into the room as host.
- **Join meeting**: accepts `123 4567 890`, `1234567890`, or a full `.../j/1234567890` link; shows "Meeting not found" for bad IDs.
- **Schedule meeting**: title, description, date, time and duration; shows the meeting ID and a copyable invite link when saved.
- **Pre-join screen** (`/j/{code}`): camera preview via `getUserMedia`, mic/video toggles, name input; falls back to an initials avatar if camera access is denied.
- **Meeting room** (`/meeting/{code}`): participant tile grid (your own tile shows your camera), mute, video, participants panel, copy invite link, Leave (participant) / End (host).

## Tech stack

| Layer    | Tech                                                                       |
| -------- | -------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react |
| Backend  | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2, Uvicorn                    |
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
│   ├── routers/                 # HTTP endpoints: meetings.py, users.py
│   ├── services/
│   │   └── meeting_service.py   # Unique meeting code generation, invite links
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx             # Dashboard (/)
    │   ├── meetings/page.tsx    # Meetings list (/meetings)
    │   ├── j/[code]/            # Pre-join screen
    │   └── meeting/[code]/      # Meeting room
    ├── components/              # AppShell, modals, meeting lists, VideoTile, ParticipantsPanel, ...
    ├── lib/
    │   ├── api.ts               # Every API call, through one fetch wrapper with error handling
    │   ├── utils.ts             # Formatting, meeting-code parsing, sessionStorage helpers
    │   └── useLocalMedia.ts     # Camera/mic hook (getUserMedia)
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

To reset the demo data, stop the server, delete `backend/zoom.db`, and start it again.

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
| GET    | `/users/me`                  |                                                           | The default "logged in" user                                                   |
| POST   | `/meetings/instant`          | `{title?}`                                                | Create a live meeting hosted by the default user; host is added as participant |
| POST   | `/meetings`                  | `{title, description?, scheduled_start, duration_minutes}` | Create a scheduled meeting                                                     |
| GET    | `/meetings/upcoming`         |                                                           | Scheduled meetings starting from now, soonest first                            |
| GET    | `/meetings/recent`           |                                                           | Last 10 ended meetings, most recent first                                      |
| GET    | `/meetings/{code}`           |                                                           | Meeting with its current participants. 404 if missing or ended                 |
| POST   | `/meetings/{code}/join`      | `{display_name}`                                          | Add a participant; a scheduled meeting becomes live. Returns `{meeting, participant}` |
| POST   | `/meetings/{code}/start`     |                                                           | Host enters the room; meeting becomes live. Returns `{meeting, participant}`. Safe to repeat |
| POST   | `/meetings/{code}/leave`     | `{participant_id}`                                        | Set the participant's `left_at`                                                |
| POST   | `/meetings/{code}/end`       |                                                           | End the meeting (moves it to Recent) and mark everyone as left                 |

Meeting and invite responses include `invite_link` (`{FRONTEND_URL}/j/{code}`). Errors use FastAPI's `{detail: "..."}` format.

## Assumptions

- **No authentication.** One seeded user ("Kartikeya") is always the logged-in user and hosts every meeting created from the dashboard.
- **No real audio/video between people (no WebRTC).** Each person sees their own camera; other participants appear as avatar tiles. This was a deliberate scope decision for the time limit.
- **No polling or websockets.** The participant list is fetched when the room loads and again whenever the Participants panel is opened.
- **Identity is per browser tab.** Your display name, host status and participant ID live in `sessionStorage`.
- **Meeting IDs are 10 digits**, shown as `123 4567 890`.
- **SQLite on Render's free tier is not persistent.** Data resets when the service redeploys or restarts; the startup seed recreates the demo data so the app never boots empty.

## Not built (time limit)

- Host controls: mute or remove participants, waiting room, lock meeting.
- Fully responsive design: the meeting room grid adapts to screen size, but the dashboard is desktop-first.
- In-meeting chat, reactions, screen sharing, recordings.
- Real-time updates: participants are not notified when someone joins or when the host ends the meeting.

## Known limitations

- Closing the tab without clicking Leave keeps that person listed in the meeting.
- Turning video off pauses the camera track rather than releasing it, so the camera light stays on.
- On Render's free tier the first request after inactivity can take up to a minute while the service wakes up.

## Deployment

### Backend on Render

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. It reads `render.yaml` (root directory `backend`, Python 3.12.10, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`).
3. Enter `FRONTEND_URL` and `CORS_ORIGINS` when prompted (use your Vercel URL; a placeholder is fine for now and can be updated later).
4. Check `https://<your-service>.onrender.com/health` returns `{"status":"ok"}`.

### Frontend on Vercel

1. In Vercel, choose **Add New → Project** and import the repo.
2. Set **Root Directory** to `frontend` (framework is detected as Next.js).
3. Add the environment variable `NEXT_PUBLIC_API_URL` = your Render URL, e.g. `https://<your-service>.onrender.com`.
4. Deploy.

### Connect them

1. In Render, set `FRONTEND_URL` and `CORS_ORIGINS` to the Vercel production URL (e.g. `https://<your-app>.vercel.app`) and save; the service redeploys.
2. If you later change `NEXT_PUBLIC_API_URL`, redeploy the frontend, because the value is baked in at build time.
