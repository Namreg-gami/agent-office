# Agent Office API Bridge

FastAPI backend that bridges Hermes Kanban data (read via CLI subprocess)
to the standalone Agent Office frontend.

## Quick start

```bash
# 1. Create venv (system python3.11, no pip needed)
cd server
python3.11 -m venv .venv

# 2. Install deps
.venv/bin/pip install fastapi uvicorn

# 3. Run (binds 127.0.0.1:8800 by default; set AO_PORT env to override)
.venv/bin/python main.py
```

## Endpoints

| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/api/health`               | Liveness check                     |
| GET    | `/api/office/state`         | All workers + tasks for office map |
| GET    | `/api/office/workers/{p}`   | Single worker + task detail        |
| GET    | `/api/office/tasks/{id}`    | Full task detail (show)            |

All endpoints return JSON. CLI errors return HTTP 503 with a JSON error body.

## Env vars

- `AO_PORT` — listen port (default 8800)
- `HERMES_BIN` — path to `hermes` CLI (default `hermes`)

## Architecture

- Reads Hermes Kanban data via `hermes kanban list --json` and
  `hermes kanban show <id> --json` (subprocess)
- Does NOT touch the SQLite DB directly
- 2-second TTL cache on `kanban list` to avoid spawning a process
  on every poll
- Frontend Vite proxy routes `/api/office/*` → `127.0.0.1:8800`
- Legacy `/api/*` routes still proxy to Hermes dashboard on 9119
  for the demo fallback path

## Smoke test

```bash
# With server running:
bash server/smoke-test.sh

# Or against a custom URL:
bash server/smoke-test.sh http://127.0.0.1:8800
```
