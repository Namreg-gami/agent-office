"""
Agent Office API Bridge — FastAPI backend that reads Hermes Kanban via CLI
and exposes clean JSON for the standalone visual office frontend.
"""

import json
import os
import subprocess
import time
from functools import lru_cache
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PORT = int(os.environ.get("AO_PORT", "8800"))
HERMES_BIN = os.environ.get("HERMES_BIN", "hermes")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Agent Office API Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# CLI bridge helpers
# ---------------------------------------------------------------------------

def _run_hermes(args: list[str]) -> dict[str, Any] | list[Any]:
    """Run a hermes CLI command and return parsed JSON.

    Raises subprocess.CalledProcessError on non-zero exit.
    Raises ValueError on invalid JSON.
    """
    cmd = [HERMES_BIN] + args
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=10,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.strip() or proc.stdout.strip()
        raise subprocess.CalledProcessError(
            proc.returncode, cmd, proc.stdout, proc.stderr
        )

    raw = proc.stdout.strip()
    if not raw:
        return [] if "list" in args else {}
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------

# Simple time-based TTL cache for kanban list (avoids spawning a process on
# every poll).  2-second TTL per spec.
_list_cache: dict[str, Any] = {"ts": 0.0, "data": []}


def _cached_kanban_list() -> list[dict[str, Any]]:
    now = time.time()
    if now - _list_cache["ts"] < 2.0:
        return _list_cache["data"]
    data = _run_hermes(["kanban", "list", "--json"])
    if not isinstance(data, list):
        data = []
    _list_cache["ts"] = now
    _list_cache["data"] = data
    return data


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------

def _role_for_profile(name: str) -> str:
    lower = name.lower()
    if "front" in lower:
        return "frontend"
    if "back" in lower:
        return "backend"
    if "review" in lower or "test" in lower:
        return "reviewer"
    return "default"


def _normalize_status(status: str | None) -> str:
    return (status or "").strip().lower().replace(" ", "_")


STATUS_PRECEDENCE = [
    "blocked",
    "running",
    "in_progress",
    "review",
    "pending_review",
    "ready",
    "todo",
    "triage",
    "done",
    "completed",
]


def _status_rank(s: str) -> int:
    try:
        return STATUS_PRECEDENCE.index(s)
    except ValueError:
        return 999


def _select_primary_task(tasks: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not tasks:
        return None
    ranked = sorted(
        tasks,
        key=lambda t: (_status_rank(_normalize_status(t.get("status"))), -(t.get("priority") or 0)),
    )
    return ranked[0]


def _visual_state(status: str | None, profile_name: str) -> str:
    if status is None:
        return "idle"
    s = _normalize_status(status)
    role = _role_for_profile(profile_name)
    if s in ("blocked",):
        return "blocked"
    if s in ("running", "in_progress"):
        return "working_at_desk"
    if s in ("review", "pending_review", "approved"):
        return "reviewing" if role == "reviewer" else "walking_to_review"
    if s in ("todo", "ready", "triage"):
        return "walking_to_desk"
    if s in ("done", "completed"):
        return "walking_to_lounge"
    return "idle"


def _column_for_status(status: str | None) -> str:
    """Derive a column label from the task status string."""
    s = _normalize_status(status)
    col_map = {
        "todo": "todo",
        "triage": "triage",
        "ready": "ready",
        "running": "in_progress",
        "in_progress": "in_progress",
        "review": "review",
        "pending_review": "review",
        "approved": "review",
        "blocked": "blocked",
        "done": "done",
        "completed": "done",
    }
    return col_map.get(s, "unknown")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/office/state")
def office_state() -> dict[str, Any]:
    """Return combined workers + tasks view for the office map."""
    try:
        tasks_raw = _cached_kanban_list()
        assignees_raw = _run_hermes(["kanban", "assignees", "--json"])
    except (subprocess.CalledProcessError, ValueError, OSError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Hermes CLI unavailable: {exc}",
        )

    if not isinstance(assignees_raw, list):
        raise HTTPException(status_code=503, detail="Invalid assignees data from CLI")

    # Index tasks by assignee
    tasks_by_assignee: dict[str, list[dict[str, Any]]] = {}
    for t in tasks_raw:
        key = t.get("assignee") or "__unassigned__"
        tasks_by_assignee.setdefault(key, []).append(t)

    # Build worker list from real profiles
    workers: list[dict[str, Any]] = []
    for entry in assignees_raw:
        name = entry.get("name", "")
        profile_tasks = tasks_by_assignee.get(name, [])
        primary = _select_primary_task(profile_tasks)
        blocked_tasks = [t for t in profile_tasks if _normalize_status(t.get("status")) == "blocked"]

        workers.append({
            "profile": name,
            "role": _role_for_profile(name),
            "visual_state": _visual_state(
                primary.get("status") if primary else None, name
            ),
            "current_task_id": primary.get("id") if primary else None,
            "current_task_title": primary.get("title") if primary else None,
            "task_status": primary.get("status") if primary else None,
            "task_column": _column_for_status(primary.get("status") if primary else None),
            "task_count": len(profile_tasks),
            "blocked_count": len(blocked_tasks),
        })

    return {
        "workers": workers,
        "tasks": tasks_raw,
        "now": int(time.time()),
        "board": "agent-office",
    }


@app.get("/api/office/workers/{profile}")
def worker_detail(profile: str) -> dict[str, Any]:
    """Return a worker plus task detail from 'hermes kanban show'."""
    try:
        tasks_raw = _cached_kanban_list()
    except (subprocess.CalledProcessError, ValueError, OSError) as exc:
        raise HTTPException(status_code=503, detail=f"Hermes CLI unavailable: {exc}")

    profile_tasks = [t for t in tasks_raw if t.get("assignee") == profile]
    primary = _select_primary_task(profile_tasks)
    blocked_tasks = [t for t in profile_tasks if _normalize_status(t.get("status")) == "blocked"]

    # If worker has a current task, fetch full detail
    task_detail = None
    if primary:
        task_id = primary.get("id", "")
        try:
            task_detail = _run_hermes(["kanban", "show", task_id, "--json"])
        except (subprocess.CalledProcessError, ValueError, OSError):
            # Gracefully degrade — return basic task info without detail
            task_detail = {"task": primary, "comments": [], "events": [], "runs": []}

    worker = {
        "profile": profile,
        "role": _role_for_profile(profile),
        "visual_state": _visual_state(
            primary.get("status") if primary else None, profile
        ),
        "current_task_id": primary.get("id") if primary else None,
        "current_task_title": primary.get("title") if primary else None,
        "task_status": primary.get("status") if primary else None,
        "task_column": _column_for_status(primary.get("status") if primary else None),
        "task_count": len(profile_tasks),
        "blocked_count": len(blocked_tasks),
        "tasks": profile_tasks,
    }

    return {
        "worker": worker,
        "task_detail": task_detail,
    }


@app.get("/api/office/tasks/{task_id}")
def task_detail(task_id: str) -> dict[str, Any]:
    """Return full task detail from 'hermes kanban show'."""
    try:
        detail = _run_hermes(["kanban", "show", task_id, "--json"])
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=503, detail=f"Hermes CLI error: {exc}")
    if not isinstance(detail, dict):
        raise HTTPException(status_code=503, detail="Unexpected CLI response format")
    return detail


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=PORT, log_level="info")
