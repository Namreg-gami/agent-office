import React, { useState, useEffect } from "react";
import type { AgentState, TaskDetail, Run, Event, Comment } from "./types";

interface Props {
  agent: AgentState;
  onClose: () => void;
}

const RUN_STATUS_LABELS: Record<string, string> = {
  running: "\u25B6 Running",
  completed: "\u2705 Complete",
  failed: "\u274C Failed",
  timed_out: "\u23F3 Timed out",
  cancelled: "\u23F9 Cancelled",
};

const RUN_STATUS_COLORS: Record<string, string> = {
  running: "#3b82f6",
  completed: "#10b981",
  failed: "#ef4444",
  timed_out: "#f59e0b",
  cancelled: "#6b7280",
};

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return "\u2014";
  return new Date(ts * 1000).toLocaleString();
}

function timeAgo(ts: number | undefined): string {
  if (!ts) return "\u2014";
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AgentPanel({ agent, onClose }: Props): React.ReactElement {
  const { profile, status, currentTask, taskCount, blockedCount } = agent;
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const SDK = window.__HERMES_PLUGIN_SDK__;

  // Fetch task detail when a currentTask exists
  useEffect(() => {
    if (!currentTask) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    SDK.fetchJSON<TaskDetail>(`/api/plugins/kanban/tasks/${currentTask.id}`)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setDetailLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "Failed to load task detail");
          setDetailLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [currentTask?.id]);

  return React.createElement(
    "div",
    {
      className: "ao-panel-overlay",
      onClick: (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      },
    },
    React.createElement(
      "div",
      { className: "ao-panel" },
      // Header
      React.createElement(
        "div",
        { className: "ao-panel-header" },
        React.createElement(
          "div",
          null,
          React.createElement("h3", { className: "ao-panel-title" }, profile.name),
          React.createElement(
            "p",
            { className: "ao-panel-subtitle" },
            profile.is_default ? "Default profile" : "Profile",
            profile.description ? ` \u2022 ${profile.description}` : ""
          )
        ),
        React.createElement(
          "button",
          {
            className: "ao-panel-close",
            onClick: onClose,
            "aria-label": "Close panel",
          },
          "\u2715"
        )
      ),
      // Stats row
      React.createElement(
        "div",
        { className: "ao-panel-stats" },
        React.createElement(
          "div",
          { className: "ao-stat" },
          React.createElement("span", { className: "ao-stat-value" }, status),
          React.createElement("span", { className: "ao-stat-label" }, "Status")
        ),
        React.createElement(
          "div",
          { className: "ao-stat" },
          React.createElement("span", { className: "ao-stat-value" }, String(taskCount)),
          React.createElement("span", { className: "ao-stat-label" }, "Tasks")
        ),
        React.createElement(
          "div",
          { className: "ao-stat" },
          React.createElement("span", { className: "ao-stat-value" }, String(blockedCount)),
          React.createElement("span", { className: "ao-stat-label" }, "Blocked")
        ),
        React.createElement(
          "div",
          { className: "ao-stat" },
          React.createElement("span", { className: "ao-stat-value" }, String(profile.skill_count)),
          React.createElement("span", { className: "ao-stat-label" }, "Skills")
        )
      ),
      // Model info
      profile.model
        ? React.createElement(
            "div",
            { className: "ao-panel-model" },
            React.createElement("strong", null, "Model: "),
            profile.provider ? `${profile.provider} / ` : "",
            profile.model
          )
        : null,
      // Current task section
      React.createElement(
        "div",
        { className: "ao-panel-section" },
        React.createElement("h4", { className: "ao-section-title" }, "Current Task"),
        currentTask
          ? React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { className: "ao-task-header" },
                React.createElement("span", { className: `ao-task-status ao-task-status--${currentTask.status}` }, currentTask.status),
                React.createElement("span", { className: "ao-task-id" }, currentTask.id.slice(0, 8))
              ),
              React.createElement("p", { className: "ao-task-title" }, currentTask.title),
              currentTask.latest_summary
                ? React.createElement(
                    "pre",
                    { className: "ao-task-summary" },
                    currentTask.latest_summary.length > 500
                      ? currentTask.latest_summary.slice(0, 500) + "..."
                      : currentTask.latest_summary
                  )
                : null
            )
          : React.createElement("p", { className: "ao-none" }, "No current task.")
      ),
      // Run history
      React.createElement(
        "div",
        { className: "ao-panel-section" },
        React.createElement("h4", { className: "ao-section-title" }, "Recent Runs"),
        detailLoading
          ? React.createElement("p", { className: "ao-none" }, "Loading...")
          : detailError
            ? React.createElement("p", { className: "ao-none ao-error-text" }, detailError)
            : detail?.runs && detail.runs.length > 0
              ? React.createElement(
                  "div",
                  { className: "ao-runs-list" },
                  detail.runs.slice(0, 10).map((run: Run) =>
                    React.createElement(
                      "div",
                      {
                        key: run.id,
                        className: `ao-run-item ao-run-item--${run.status}`,
                      },
                      React.createElement(
                        "span",
                        {
                          className: "ao-run-status",
                          style: { color: RUN_STATUS_COLORS[run.status] || "#6b7280" },
                        },
                        RUN_STATUS_LABELS[run.status] || run.status
                      ),
                      React.createElement(
                        "span",
                        { className: "ao-run-time" },
                        timeAgo(run.started_at)
                      ),
                      run.summary
                        ? React.createElement(
                            "span",
                            { className: "ao-run-summary" },
                            run.summary.slice(0, 100)
                          )
                        : null
                    )
                  )
                )
              : React.createElement("p", { className: "ao-none" }, "No runs recorded.")
      ),
      // Recent events
      React.createElement(
        "div",
        { className: "ao-panel-section" },
        React.createElement("h4", { className: "ao-section-title" }, "Recent Events"),
        detail?.events && detail.events.length > 0
          ? React.createElement(
              "div",
              { className: "ao-events-list" },
              detail.events.slice(0, 8).map((ev: Event) =>
                React.createElement(
                  "div",
                  { key: ev.id, className: "ao-event-item" },
                  React.createElement(
                    "span",
                    { className: "ao-event-kind" },
                    ev.kind
                  ),
                  React.createElement(
                    "span",
                    { className: "ao-event-time" },
                    timeAgo(ev.created_at)
                  )
                )
              )
            )
          : React.createElement("p", { className: "ao-none" }, "No events recorded.")
      )
    )
  );
}
