import React, { useState, useEffect } from "react";
import type { AgentState, TaskDetail, Run, Event } from "../types";
import { fetchTaskDetail } from "../api";

interface Props {
  agent: AgentState;
  onClose: () => void;
}

const RUN_STATUS_LABELS: Record<string, string> = {
  running: "▶ Running",
  completed: "✅ Complete",
  failed: "❌ Failed",
  timed_out: "⏳ Timed out",
  cancelled: "⏹ Cancelled",
};

const RUN_STATUS_COLORS: Record<string, string> = {
  running: "#3b82f6",
  completed: "#10b981",
  failed: "#ef4444",
  timed_out: "#f59e0b",
  cancelled: "#6b7280",
};

function timeAgo(ts: number | undefined): string {
  if (!ts) return "—";
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AgentDrawer({
  agent,
  onClose,
}: Props): React.ReactElement {
  const { profile, status, currentTask, taskCount, blockedCount } = agent;
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTask) return;
    let cancelled = false;

    setDetailLoading(true);
    setDetailError(null);

    fetchTaskDetail(currentTask.id)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setDetailLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailError(
            err instanceof Error ? err.message : "Failed to load task detail"
          );
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentTask?.id]);

  return (
    <div
      className="ao-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ao-drawer">
        {/* Header */}
        <div className="ao-drawer-header">
          <div>
            <h3 className="ao-drawer-title">{profile.name}</h3>
            <p className="ao-drawer-subtitle">
              {profile.is_default ? "Default profile" : "Profile"}
              {profile.description ? ` • ${profile.description}` : ""}
            </p>
          </div>
          <button
            className="ao-drawer-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Stats row */}
        <div className="ao-drawer-stats">
          <div className="ao-stat">
            <span className="ao-stat-value">{status}</span>
            <span className="ao-stat-label">Status</span>
          </div>
          <div className="ao-stat">
            <span className="ao-stat-value">{taskCount}</span>
            <span className="ao-stat-label">Tasks</span>
          </div>
          <div className="ao-stat">
            <span className="ao-stat-value">{blockedCount}</span>
            <span className="ao-stat-label">Blocked</span>
          </div>
          <div className="ao-stat">
            <span className="ao-stat-value">{profile.skill_count}</span>
            <span className="ao-stat-label">Skills</span>
          </div>
        </div>

        {/* Model info */}
        {profile.model && (
          <div className="ao-drawer-model">
            <strong>Model: </strong>
            {profile.provider ? `${profile.provider} / ` : ""}
            {profile.model}
          </div>
        )}

        {/* Current task */}
        <div className="ao-drawer-section">
          <h4 className="ao-section-title">Current Task</h4>
          {currentTask ? (
            <div>
              <div className="ao-task-header">
                <span
                  className={`ao-task-status ao-task-status--${currentTask.status}`}
                >
                  {currentTask.status}
                </span>
                <span className="ao-task-id">
                  {currentTask.id.slice(0, 8)}
                </span>
              </div>
              <p className="ao-task-title-text">{currentTask.title}</p>
              {currentTask.latest_summary && (
                <pre className="ao-task-summary">
                  {currentTask.latest_summary.length > 500
                    ? currentTask.latest_summary.slice(0, 500) + "..."
                    : currentTask.latest_summary}
                </pre>
              )}
            </div>
          ) : (
            <p className="ao-none">No current task.</p>
          )}
        </div>

        {/* Run history */}
        <div className="ao-drawer-section">
          <h4 className="ao-section-title">Recent Runs</h4>
          {detailLoading ? (
            <p className="ao-none">Loading...</p>
          ) : detailError ? (
            <p className="ao-none ao-error-text">{detailError}</p>
          ) : detail?.runs && detail.runs.length > 0 ? (
            <div className="ao-runs-list">
              {detail.runs.slice(0, 10).map((run: Run) => (
                <div
                  key={run.id}
                  className={`ao-run-item ao-run-item--${run.status}`}
                >
                  <span
                    className="ao-run-status"
                    style={{
                      color: RUN_STATUS_COLORS[run.status] || "#6b7280",
                    }}
                  >
                    {RUN_STATUS_LABELS[run.status] || run.status}
                  </span>
                  <span className="ao-run-time">{timeAgo(run.started_at)}</span>
                  {run.summary && (
                    <span className="ao-run-summary">
                      {run.summary.slice(0, 100)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="ao-none">No runs recorded.</p>
          )}
        </div>

        {/* Recent events */}
        <div className="ao-drawer-section">
          <h4 className="ao-section-title">Recent Events</h4>
          {detail?.events && detail.events.length > 0 ? (
            <div className="ao-events-list">
              {detail.events.slice(0, 8).map((ev: Event) => (
                <div key={ev.id} className="ao-event-item">
                  <span className="ao-event-kind">{ev.kind}</span>
                  <span className="ao-event-time">{timeAgo(ev.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="ao-none">No events recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}