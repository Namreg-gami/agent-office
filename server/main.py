"""
Agent Office API Bridge — FastAPI backend that reads Hermes Kanban via CLI
and exposes clean JSON for the standalone visual office frontend.
"""

import json
import os
import pathlib
import re
import subprocess
import time
from functools import lru_cache
from typing import Any

import httpx
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
# OpenRouter usage helpers
# ---------------------------------------------------------------------------

# Regex to detect OpenRouter key prefix (sk-or-...) for masking
_OR_KEY_RE = re.compile(r"^sk-or-", re.IGNORECASE)


def _read_profile_env(profile: str) -> dict[str, str]:
    """Read OPENROUTER_API_KEY from a profile's or default .env file.

    Priority:
      1. ~/.hermes/profiles/{profile}/.env
      2. ~/.hermes/.env (fallback)
    Returns dict with at least 'key' (str or None).
    """
    env_vars: dict[str, str] = {}

    def _load_env(path: pathlib.Path) -> None:
        if not path.is_file():
            return
        try:
            for line in path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                k = k.strip()
                v = v.strip().strip("\"'")
                if k not in env_vars:
                    env_vars[k] = v
        except (OSError, PermissionError):
            pass

    hermes_home = pathlib.Path.home() / ".hermes"
    _load_env(hermes_home / "profiles" / profile / ".env")
    if "OPENROUTER_API_KEY" not in env_vars:
        _load_env(hermes_home / ".env")

    return env_vars


def _mask_key(key: str) -> str:
    """Return a safe identifier for an OpenRouter API key.

    Shows last 4 chars if it matches the OpenRouter pattern,
    otherwise shows 'sk-...xxxx'.
    """
    if len(key) <= 8:
        return "sk-..." + key[-4:]
    if _OR_KEY_RE.match(key):
        return key[:5] + "..." + key[-4:]
    # Generic: show first 3 + last 4
    return key[:3] + "..." + key[-4:]


def _normalize_activity_item(item: Any) -> dict[str, Any]:
    """Normalize OpenRouter activity rows to the frontend contract.

    The activity API returns aggregated rows with prompt_tokens,
    completion_tokens, reasoning_tokens and usage. The frontend expects
    tokens/cost plus optional details.
    """
    if not isinstance(item, dict):
        return {"model": "unknown", "tokens": 0, "cost": 0.0}

    prompt = int(item.get("prompt_tokens") or 0)
    completion = int(item.get("completion_tokens") or 0)
    reasoning = int(item.get("reasoning_tokens") or 0)
    tokens = prompt + completion

    return {
        "created_at": item.get("created_at") or item.get("date"),
        "model": item.get("model") or item.get("model_permaslug") or "unknown",
        "provider": item.get("provider_name") or item.get("provider"),
        "tokens": tokens,
        "cost": float(item.get("usage") or item.get("cost") or 0.0),
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "reasoning_tokens": reasoning,
        "requests": item.get("requests"),
    }


async def _fetch_openrouter_usage(key: str) -> dict[str, Any]:
    """Fetch usage data from OpenRouter API using the given key.

    Calls GET /api/v1/key and optionally GET /api/v1/activity.
    Returns a normalized dict — never includes the raw API key.
    """
    headers = {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }

    result: dict[str, Any] = {
        "provider": "openrouter",
        "configured": True,
        "key_label": _mask_key(key),
        "usage": 0.0,
        "usage_daily": None,
        "usage_weekly": None,
        "usage_monthly": 0.0,
        "limit": None,
        "remaining": None,
        "limit_reset": None,
        "activity_available": False,
        "error": None,
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        # Step 1: fetch key info (usage / limits)
        try:
            resp = await client.get(
                "https://openrouter.ai/api/v1/key",
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                key_data = data.get("data", data)
                # Do not forward OpenRouter label/name/id verbatim. Users sometimes
                # label keys with secret-like values, and /key may return labels
                # derived from the key. Keep only our deterministic masked key.
                result["key_id"] = result["key_label"]
                result["key_name"] = None

                _usage = key_data.get("usage", 0.0)
                result["usage"] = float(_usage) if _usage else 0.0

                _limit = key_data.get("limit")
                result["limit"] = float(_limit) if _limit else None

                _remaining = key_data.get("remaining")
                result["remaining"] = float(_remaining) if _remaining else None

                result["limit_reset"] = key_data.get("limit_reset")

                # If 'usage' represents total and limit is total,
                # remaining can be computed if not present
                if result["remaining"] is None and result["limit"] is not None:
                    result["remaining"] = max(0.0, result["limit"] - result["usage"])

                # Check for daily/monthly breakdowns
                result["usage_daily"] = key_data.get("usage_daily") or key_data.get("daily_usage")
                if result["usage_daily"] is not None:
                    result["usage_daily"] = float(result["usage_daily"])
                result["usage_weekly"] = key_data.get("usage_weekly") or key_data.get("weekly_usage")
                if result["usage_weekly"] is not None:
                    result["usage_weekly"] = float(result["usage_weekly"])
                result["usage_monthly"] = key_data.get("usage_monthly") or key_data.get("monthly_usage") or result["usage"]
                if result["usage_monthly"] is not None:
                    result["usage_monthly"] = float(result["usage_monthly"])
            elif resp.status_code in (401, 403):
                result["configured"] = False
                result["error"] = "Invalid or expired API key"
                return result
            else:
                result["error"] = f"OpenRouter returned HTTP {resp.status_code}"
                return result
        except httpx.TimeoutException:
            result["error"] = "OpenRouter API timed out"
            return result
        except httpx.RequestError as exc:
            result["error"] = f"Network error: {exc}"
            return result

        # Step 2: try activity endpoint (token data, optional)
        try:
            resp = await client.get(
                "https://openrouter.ai/api/v1/activity",
                headers=headers,
            )
            if resp.status_code == 200:
                act_data = resp.json()
                activity_list = act_data.get("data", act_data)
                if isinstance(activity_list, list) and len(activity_list) > 0:
                    result["activity"] = [_normalize_activity_item(item) for item in activity_list[:50]]
                    result["activity_available"] = True
                elif isinstance(activity_list, dict):
                    # Some API versions return {data: [...]}
                    inner = activity_list.get("data")
                    if isinstance(inner, list) and len(inner) > 0:
                        result["activity"] = [_normalize_activity_item(item) for item in inner[:50]]
                        result["activity_available"] = True
        except (httpx.TimeoutException, httpx.RequestError):
            # Activity is optional; degrade gracefully
            pass

    return result


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


@app.get("/api/office/workers/{profile}/usage")
async def worker_usage(profile: str) -> dict[str, Any]:
    """Return OpenRouter usage / credit data for a worker profile.

    Reads OPENROUTER_API_KEY from the profile's .env (or defaults to
    ~/.hermes/.env), calls the OpenRouter key/activity endpoints, and
    returns a normalized response without secrets.
    """
    env_vars = _read_profile_env(profile)
    or_key = env_vars.get("OPENROUTER_API_KEY")

    if not or_key:
        return {
            "profile": profile,
            "provider": "openrouter",
            "configured": False,
            "error": "No OPENROUTER_API_KEY found in profile or default .env",
            "usage": 0.0,
            "usage_daily": None,
            "usage_weekly": None,
            "usage_monthly": 0.0,
            "limit": None,
            "remaining": None,
            "limit_reset": None,
            "activity_available": False,
        }

    try:
        data = await _fetch_openrouter_usage(or_key)
    except Exception as exc:
        data = {
            "provider": "openrouter",
            "configured": True,
            "key_label": _mask_key(or_key),
            "error": f"Unexpected error: {exc}",
            "usage": 0.0,
            "usage_daily": None,
            "usage_weekly": None,
            "usage_monthly": 0.0,
            "limit": None,
            "remaining": None,
            "limit_reset": None,
            "activity_available": False,
        }

    data["profile"] = profile
    return data


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=PORT, log_level="info")
