import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ProfileInfo, KanbanBoard, KanbanTask, AgentState, AgentStatus } from "./types";
import { fetchOfficeState, officeStateToAgentStates } from "./api";
import { deriveVisualState, getWorkerPlacement, selectPrimaryTask } from "./officeLayout";
import WorkerAvatar from "./components/WorkerAvatar";
import AgentDrawer from "./components/AgentDrawer";

const POLL_INTERVAL_MS = 5000;

function demoProfile(name: string, description: string): ProfileInfo {
  return {
    name,
    path: `demo://${name}`,
    is_default: false,
    has_env: false,
    skill_count: 0,
    gateway_running: false,
    description,
    description_auto: false,
    has_alias: false,
  };
}

const DEMO_PROFILES: ProfileInfo[] = [
  demoProfile("frontend", "Demo fallback: frontend worker"),
  demoProfile("backend", "Demo fallback: backend worker"),
  demoProfile("reviewer", "Demo fallback: reviewer/tester"),
];

function demoTask(id: string, title: string, status: string, assignee: string): KanbanTask {
  return {
    id,
    title,
    status,
    assignee,
    body: "Demo task used only when Hermes API is unavailable.",
    priority: 30,
    latest_summary: `Demo lifecycle state: ${status}`,
    link_counts: { parents: 0, children: 0 },
    comment_count: 0,
    age: {},
  };
}

function agentFromDemo(profile: ProfileInfo, task?: KanbanTask): AgentState {
  const tasks = task ? [task] : [];
  return {
    profile,
    status: deriveVisualState(tasks, profile.name),
    currentTask: task,
    taskCount: tasks.length,
    blockedCount: task?.status === "blocked" ? 1 : 0,
  };
}

function buildDemoAgents(phase: number): AgentState[] {
  const step = phase % 5;
  const frontendStatus = ["ready", "running", "running", "completed", "ready"][step];
  const backendStatus = [undefined, undefined, "blocked", undefined, "ready"][step];
  const reviewerStatus = ["review", "review", "pending_review", undefined, "review"][step];

  return [
    agentFromDemo(
      DEMO_PROFILES[0],
      demoTask("demo_frontend", "Build animated office map", frontendStatus, "frontend")
    ),
    agentFromDemo(
      DEMO_PROFILES[1],
      backendStatus
        ? demoTask("demo_backend", "Provide office API bridge", backendStatus, "backend")
        : undefined
    ),
    agentFromDemo(
      DEMO_PROFILES[2],
      reviewerStatus
        ? demoTask("demo_reviewer", "Review worker animation lifecycle", reviewerStatus, "reviewer")
        : undefined
    ),
  ];
}

function buildAgentStates(
  profiles: ProfileInfo[],
  board: KanbanBoard
): AgentState[] {
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
    const status = deriveVisualState(tasks, p.name);
    const blocked = tasks.filter((t) => t.status === "blocked");
    return {
      profile: p,
      status,
      currentTask: selectPrimaryTask(tasks),
      taskCount: tasks.length,
      blockedCount: blocked.length,
    };
  });
}

function LoadingView(): React.ReactElement {
  return (
    <div className="ao-loading">
      <div className="ao-spinner" />
      <p>Loading Agent Office...</p>
    </div>
  );
}

function ErrorView({ message }: { message: string }): React.ReactElement {
  return (
    <div className="ao-error">
      <div className="ao-error-icon">⚠</div>
      <h3>Failed to load</h3>
      <p>{message}</p>
      <p className="ao-error-hint">
        Make sure Hermes dashboard is running on port 9119.
      </p>
    </div>
  );
}

function EmptyView(): React.ReactElement {
  return (
    <div className="ao-empty">
      <div className="ao-empty-icon">🏢</div>
      <h3>Office is empty</h3>
      <p>No agents found. Create a profile or assign a kanban task to populate the office.</p>
    </div>
  );
}

function DegradedBanner({ message }: { message: string }): React.ReactElement {
  return (
    <div className="ao-degraded-banner">
      ⚠ API partially unavailable — {message}
    </div>
  );
}

function stateText(status: AgentStatus): string {
  return status.replaceAll("_", " ");
}

export default function App(): React.ReactElement {
  const [agents, setAgents] = useState<AgentState[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [degradedMsg, setDegradedMsg] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const demoPhaseRef = useRef(0);

  const showDemoOffice = useCallback((message: string) => {
    const phase = demoPhaseRef.current++;
    setAgents(buildDemoAgents(phase));
    setError(null);
    setDegraded(true);
    setDegradedMsg(`${message}. Showing clearly marked demo office with lifecycle movement states.`);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const officeState = await fetchOfficeState();

      if (!officeState?.workers || !Array.isArray(officeState.workers)) {
        showDemoOffice("Invalid office state response");
        return;
      }

      const agentStates = officeStateToAgentStates(officeState);
      setAgents(agentStates);
      setError(null);
      setDegraded(false);
      setDegradedMsg("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown fetch error";
      showDemoOffice(`Office API unavailable (${message})`);
    } finally {
      setLoading(false);
    }
  }, [showDemoOffice]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;
  if (!agents || agents.length === 0) return <EmptyView />;

  return (
    <div className="ao-office">
      {degraded && <DegradedBanner message={degradedMsg} />}

      <header className="ao-header">
        <div>
          <h1 className="ao-title">🏢 Agent Office</h1>
          <p className="ao-subtitle">
            Kanban lifecycle → worker position → office animation
          </p>
        </div>
        <p className="ao-subtitle">
          {agents.length} agent{agents.length !== 1 ? "s" : ""} · polling every {POLL_INTERVAL_MS / 1000}s
        </p>
      </header>

      <main className="ao-floor">
        <section className="ao-map-stage" aria-label="Animated office floor plan">
          <div className="ao-room ao-room--work">
            <span className="ao-room-label">Work room</span>
          </div>
          <div className="ao-room ao-room--review">
            <span className="ao-room-label">Review / Test</span>
          </div>
          <div className="ao-room ao-room--help">
            <span className="ao-room-label">Blocked / Help</span>
          </div>
          <div className="ao-room ao-room--lounge">
            <span className="ao-room-label">Lounge</span>
          </div>

          <div className="ao-window ao-window--left" />
          <div className="ao-window ao-window--right" />
          <div className="ao-door ao-door--main" />

          <div className="ao-desk ao-desk--frontend">
            <span className="ao-monitor ao-monitor--active" />
            <span className="ao-chair" />
            <span className="ao-furniture-label">Frontend desk</span>
          </div>
          <div className="ao-desk ao-desk--backend">
            <span className="ao-monitor" />
            <span className="ao-chair" />
            <span className="ao-furniture-label">Backend desk</span>
          </div>
          <div className="ao-desk ao-desk--review-desk">
            <span className="ao-monitor ao-monitor--review" />
            <span className="ao-chair" />
            <span className="ao-furniture-label">Review desk</span>
          </div>

          <div className="ao-sofa">
            <span className="ao-furniture-label">Sofa</span>
          </div>
          <div className="ao-coffee-machine">
            <span className="ao-coffee-cup">☕</span>
            <span className="ao-furniture-label">Coffee</span>
          </div>
          <div className="ao-help-board">
            <span className="ao-help-icon">🚨</span>
            <span className="ao-furniture-label">Help</span>
          </div>

          <div className="ao-path ao-path--lounge-desk" />
          <div className="ao-path ao-path--desk-review" />

          {agents.map((agent) => {
            const placement = getWorkerPlacement(agent, agents);
            return (
              <WorkerAvatar
                key={agent.profile.name}
                agent={agent}
                placement={placement}
                onClick={() => setSelectedAgent(agent)}
              />
            );
          })}

          <div className="ao-map-legend">
            {agents.map((agent) => (
              <span key={agent.profile.name}>
                <strong>{agent.profile.name}</strong>: {stateText(agent.status)}
              </span>
            ))}
          </div>
        </section>
      </main>

      {selectedAgent && (
        <AgentDrawer
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
