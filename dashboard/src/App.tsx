import React, { useState, useEffect, useCallback } from "react";
import type {
  ProfileInfo,
  KanbanBoard,
  KanbanTask,
  AgentState,
  AgentStatus,
} from "./types";
import AgentPanel from "./AgentPanel";

const POLL_INTERVAL_MS = 5000;

/** Derive agent status from kanban tasks. */
function deriveStatus(tasks: KanbanTask[]): {
  status: AgentStatus;
  currentTask?: KanbanTask;
  taskCount: number;
  blockedCount: number;
} {
  if (tasks.length === 0) {
    return { status: "idle", taskCount: 0, blockedCount: 0 };
  }
  // Prefer running > blocked > active (ready/triage/todo/review) > idle
  const running = tasks.filter((t) => t.status === "running");
  if (running.length > 0) {
    return {
      status: "working",
      currentTask: running[0],
      taskCount: tasks.length,
      blockedCount: tasks.filter((t) => t.status === "blocked").length,
    };
  }
  const blocked = tasks.filter((t) => t.status === "blocked");
  if (blocked.length > 0) {
    return {
      status: "blocked",
      currentTask: blocked[0],
      taskCount: tasks.length,
      blockedCount: blocked.length,
    };
  }
  // Has tasks but none running/blocked — consider idle with pending
  const ready = tasks.find(
    (t) => t.status === "ready" || t.status === "triage" || t.status === "review"
  );
  return {
    status: ready ? "working" : "idle",
    currentTask: ready,
    taskCount: tasks.length,
    blockedCount: 0,
  };
}

function buildAgentStates(
  profiles: ProfileInfo[],
  board: KanbanBoard
): AgentState[] {
  // Map assignee → tasks
  const tasksByAssignee: Record<string, KanbanTask[]> = {};
  for (const col of board.columns) {
    for (const task of col.tasks) {
      const key = task.assignee || "__unassigned__";
      if (!tasksByAssignee[key]) tasksByAssignee[key] = [];
      tasksByAssignee[key].push(task);
    }
  }

  return profiles.map((p) => {
    const tasks = tasksByAssignee[p.name] || [];
    const derived = deriveStatus(tasks);
    return { profile: p, ...derived };
  });
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  working: "Working",
  blocked: "Blocked",
};

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "#6b7280",
  working: "#10b981",
  blocked: "#ef4444",
};

// ----- Sub-components (plain functions, no hooks) -----

function LoadingView(): React.ReactElement {
  return React.createElement(
    "div",
    { className: "ao-loading" },
    React.createElement("div", { className: "ao-spinner" }),
    React.createElement("p", null, "Loading Agent Office...")
  );
}

function ErrorView({ message }: { message: string }): React.ReactElement {
  return React.createElement(
    "div",
    { className: "ao-error" },
    React.createElement("div", { className: "ao-error-icon" }, "\u26A0"),
    React.createElement("h3", null, "Failed to load"),
    React.createElement("p", null, message)
  );
}

function EmptyView(): React.ReactElement {
  return React.createElement(
    "div",
    { className: "ao-empty" },
    React.createElement("div", { className: "ao-empty-icon" }, "\uD83C\uDFE2"),
    React.createElement("h3", null, "No agents found"),
    React.createElement(
      "p",
      null,
      "Create a profile or assign a kanban task to populate the office."
    )
  );
}

function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentState;
  onClick: () => void;
}): React.ReactElement {
  const { profile, status, currentTask, taskCount, blockedCount } = agent;
  const color = STATUS_COLORS[status];

  return React.createElement(
    "div",
    {
      className: `ao-card ao-card--${status}`,
      onClick,
      role: "button",
      tabIndex: 0,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      },
    },
    // Desk avatar area
    React.createElement(
      "div",
      { className: "ao-card-avatar" },
      React.createElement(
        "div",
        { className: "ao-avatar-circle", style: { borderColor: color } },
        profile.name.slice(0, 2).toUpperCase()
      ),
      React.createElement(
        "div",
        {
          className: "ao-status-dot",
          style: { backgroundColor: color },
        }
      )
    ),
    // Agent info
    React.createElement(
      "div",
      { className: "ao-card-info" },
      React.createElement(
        "div",
        { className: "ao-card-name" },
        profile.name
      ),
      React.createElement(
        "div",
        { className: "ao-card-role" },
        profile.description_auto
          ? profile.description
          : profile.description || (profile.is_default ? "Default profile" : "Profile")
      ),
      React.createElement(
        "div",
        { className: "ao-card-status", style: { color } },
        STATUS_LABELS[status]
      ),
      currentTask
        ? React.createElement(
            "div",
            { className: "ao-card-task" },
            React.createElement("span", { className: "ao-card-task-label" }, "Task:"),
            " ",
            currentTask.title
          )
        : null
    ),
    // Badges
    React.createElement(
      "div",
      { className: "ao-card-badges" },
      taskCount > 0
        ? React.createElement(
            "span",
            { className: "ao-badge" },
            `${taskCount} task${taskCount > 1 ? "s" : ""}`
          )
        : null,
      blockedCount > 0
        ? React.createElement(
            "span",
            { className: "ao-badge ao-badge--blocked" },
            `${blockedCount} blocked`
          )
        : null
    )
  );
}

// ----- Main App -----

export default function App(): React.ReactElement {
  const [agents, setAgents] = useState<AgentState[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);

  const SDK = window.__HERMES_PLUGIN_SDK__;

  const fetchData = useCallback(async () => {
    try {
      const [profileResp, boardResp] = await Promise.all([
        SDK.fetchJSON<{ profiles: ProfileInfo[] }>("/api/profiles"),
        SDK.fetchJSON<KanbanBoard>("/api/plugins/kanban/board"),
      ]);

      if (!profileResp?.profiles) {
        setError("Invalid profile response from API.");
        return;
      }
      if (!boardResp?.columns) {
        setError("Invalid kanban board response from API.");
        return;
      }

      const agentStates = buildAgentStates(profileResp.profiles, boardResp);
      setAgents(agentStates);
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown fetch error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [SDK.fetchJSON]);

  // Initial fetch + polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // States
  if (loading) return React.createElement(LoadingView);
  if (error) return React.createElement(ErrorView, { message: error });
  if (!agents || agents.length === 0) return React.createElement(EmptyView);

  return React.createElement(
    "div",
    { className: "ao-office" },
    // Header
    React.createElement(
      "div",
      { className: "ao-header" },
      React.createElement("h2", { className: "ao-title" }, "\uD83C\uDFE2 Agent Office"),
      React.createElement(
        "p",
        { className: "ao-subtitle" },
        `${agents.length} agent${agents.length > 1 ? "s" : ""} \u00B7 ` +
          `polling every ${POLL_INTERVAL_MS / 1000}s`
      )
    ),
    // Grid
    React.createElement(
      "div",
      { className: "ao-grid" },
      agents.map((agent) =>
        React.createElement(AgentCard, {
          key: agent.profile.name,
          agent,
          onClick: () => setSelectedAgent(agent),
        })
      )
    ),
    // Side panel
    selectedAgent
      ? React.createElement(AgentPanel, {
          agent: selectedAgent,
          onClose: () => setSelectedAgent(null),
        })
      : null
  );
}
