import React, { useState, useEffect } from "react";
import type { AgentState, TaskDetail, Run, Event, WorkerUsageResponse } from "../types";
import { fetchTaskDetail, fetchWorkerUsage } from "../api";

interface Props {
  agent: AgentState;
  onClose: () => void;
}

type TabId = "kanban" | "usage";

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

/** Format a USD amount nicely. */
function fmtUsd(cents: number): string {
  return `$${cents.toFixed(2)}`;
}

/** Kanban tab — existing task/detail view. */
function KanbanTab({
  agent,
  currentTask,
  detailLoading,
  detailError,
  detail,
}: {
  agent: AgentState;
  currentTask: AgentState["currentTask"];
  detailLoading: boolean;
  detailError: string | null;
  detail: TaskDetail | null;
}): React.ReactElement {
  return (
    <>
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
    </>
  );
}

/** Usage tab — OpenRouter usage metrics. */
function UsageTab({
  profile,
  usage,
  usageLoading,
  usageError,
}: {
  profile: string;
  usage: WorkerUsageResponse | null;
  usageLoading: boolean;
  usageError: string | null;
}): React.ReactElement {
  if (usageLoading) {
    return (
      <div className="ao-drawer-section">
        <p className="ao-none">Loading usage data...</p>
      </div>
    );
  }

  if (!usage && usageError) {
    return (
      <div className="ao-drawer-section">
        <p className="ao-none ao-error-text">{usageError}</p>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="ao-drawer-section">
        <p className="ao-none">No usage data loaded.</p>
      </div>
    );
  }

  if (usage.error && !usage.configured) {
    return (
      <div className="ao-drawer-section">
        <h4 className="ao-section-title">OpenRouter Usage</h4>
        <p className="ao-none ao-error-text">{usage.error}</p>
      </div>
    );
  }

  if (!usage.configured) {
    return (
      <div className="ao-drawer-section">
        <h4 className="ao-section-title">OpenRouter Usage</h4>
        <p className="ao-none">
          {usage.error || "No API key configured for this profile."}
        </p>
      </div>
    );
  }

  const pct =
    usage.limit && usage.limit > 0
      ? Math.round((usage.usage / usage.limit) * 100)
      : null;

  return (
    <>
      {/* Key identity (masked) */}
      <div className="ao-drawer-section">
        <h4 className="ao-section-title">OpenRouter Key</h4>
        <div className="ao-usage-key-info">
          <span className="ao-usage-key-label">
            {usage.key_label || usage.key_id || "Unknown key"}
          </span>
          {usage.key_name && (
            <span className="ao-usage-key-name">{usage.key_name}</span>
          )}
          {usage.error && (
            <p className="ao-none" style={{ marginTop: "0.3rem" }}>
              {usage.error}
            </p>
          )}
        </div>
      </div>

      {/* Credit summary */}
      <div className="ao-drawer-section">
        <h4 className="ao-section-title">Credits</h4>
        <div className="ao-usage-grid">
          <div className="ao-usage-card">
            <span className="ao-usage-card-value">
              {fmtUsd(usage.usage_daily ?? usage.usage)}
            </span>
            <span className="ao-usage-card-label">Today</span>
          </div>
          <div className="ao-usage-card">
            <span className="ao-usage-card-value">
              {usage.usage_weekly != null
                ? fmtUsd(usage.usage_weekly)
                : "—"}
            </span>
            <span className="ao-usage-card-label">Week</span>
          </div>
          <div className="ao-usage-card">
            <span className="ao-usage-card-value">
              {fmtUsd(usage.usage_monthly)}
            </span>
            <span className="ao-usage-card-label">Month</span>
          </div>
          <div className="ao-usage-card">
            <span className="ao-usage-card-value">
              {fmtUsd(usage.usage)}
            </span>
            <span className="ao-usage-card-label">Total</span>
          </div>
        </div>
      </div>

      {/* Limit & remaining */}
      {usage.limit != null && (
        <div className="ao-drawer-section">
          <h4 className="ao-section-title">Limit</h4>
          <div className="ao-usage-bar-wrap">
            <div className="ao-usage-bar-label-row">
              <span>
                {fmtUsd(usage.usage)} used of {fmtUsd(usage.limit)}
              </span>
              <span>
                {usage.remaining != null
                  ? `${fmtUsd(usage.remaining)} left`
                  : `${pct}%`}
              </span>
            </div>
            <div className="ao-usage-bar">
              <div
                className="ao-usage-bar-fill"
                style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
              />
            </div>
          </div>
          {usage.limit_reset && (
            <p className="ao-none" style={{ marginTop: "0.3rem" }}>
              Resets {usage.limit_reset}
            </p>
          )}
        </div>
      )}

      {/* Activity (token data) */}
      {usage.activity_available && usage.activity && usage.activity.length > 0 && (
        <div className="ao-drawer-section">
          <h4 className="ao-section-title">Recent Activity</h4>
          <div className="ao-activity-list">
            {usage.activity.slice(0, 20).map((act, i) => (
              <div key={i} className="ao-activity-item">
                <span className="ao-activity-model">
                  {act.model || "unknown"}
                </span>
                <span className="ao-activity-tokens">
                  {act.tokens?.toLocaleString() || 0} tokens
                </span>
                <span className="ao-activity-cost">
                  {act.cost != null ? fmtUsd(act.cost) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No activity available */}
      {usage.configured && !usage.activity_available && !usage.error && (
        <div className="ao-drawer-section">
          <p className="ao-none">
            Token-level activity is not available for this key.
          </p>
        </div>
      )}
    </>
  );
}

export default function AgentDrawer({
  agent,
  onClose,
}: Props): React.ReactElement {
  const { profile, status, currentTask, taskCount, blockedCount } = agent;
  const [activeTab, setActiveTab] = useState<TabId>("kanban");

  // Kanban data
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Usage data
  const [usage, setUsage] = useState<WorkerUsageResponse | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  // Fetch kanban detail when tab switches to kanban, or on mount if needed
  useEffect(() => {
    if (activeTab !== "kanban" || !currentTask) return;
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
  }, [activeTab, currentTask?.id]);

  // Fetch usage data when tab switches to usage
  useEffect(() => {
    if (activeTab !== "usage") return;
    let cancelled = false;

    setUsageLoading(true);
    setUsageError(null);

    fetchWorkerUsage(profile.name)
      .then((data) => {
        if (!cancelled) {
          setUsage(data);
          setUsageLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setUsageError(
            err instanceof Error ? err.message : "Failed to load usage data"
          );
          setUsageLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, profile.name]);

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

        {/* Tabs */}
        <div className="ao-drawer-tabs">
          <button
            className={`ao-drawer-tab ${activeTab === "kanban" ? "ao-drawer-tab--active" : ""}`}
            onClick={() => setActiveTab("kanban")}
          >
            Kanban
          </button>
          <button
            className={`ao-drawer-tab ${activeTab === "usage" ? "ao-drawer-tab--active" : ""}`}
            onClick={() => setActiveTab("usage")}
          >
            Usage
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "kanban" ? (
          <KanbanTab
            agent={agent}
            currentTask={currentTask}
            detailLoading={detailLoading}
            detailError={detailError}
            detail={detail}
          />
        ) : (
          <UsageTab
            profile={profile.name}
            usage={usage}
            usageLoading={usageLoading}
            usageError={usageError}
          />
        )}
      </div>
    </div>
  );
}