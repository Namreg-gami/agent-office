import React, { useState, useEffect, useCallback } from "react";
import type { ProfileInfo, KanbanBoard, KanbanTask, AgentState, AgentStatus } from "./types";
import { fetchProfiles, fetchKanbanBoard } from "./api";
import { deriveStatus } from "./officeLayout";
import ReviewDesk from "./components/ReviewDesk";
import ProblemZone from "./components/ProblemZone";
import CoffeeMachine from "./components/CoffeeMachine";
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

function buildDemoAgents(): AgentState[] {
  return [
    { profile: DEMO_PROFILES[0], status: "working", taskCount: 1, blockedCount: 0 },
    { profile: DEMO_PROFILES[1], status: "idle", taskCount: 0, blockedCount: 0 },
    { profile: DEMO_PROFILES[2], status: "reviewing", taskCount: 1, blockedCount: 0 },
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
    const status = deriveStatus(tasks, p.name);
    const running = tasks.filter((t) => t.status === "running");
    const blocked = tasks.filter((t) => t.status === "blocked");
    return {
      profile: p,
      status,
      currentTask: running[0] || tasks[0],
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

export default function App(): React.ReactElement {
  const [agents, setAgents] = useState<AgentState[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [degradedMsg, setDegradedMsg] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileResult, boardResult] = await Promise.allSettled([
        fetchProfiles(),
        fetchKanbanBoard(),
      ]);

      if (profileResult.status === "rejected") {
        const message = profileResult.reason instanceof Error
          ? profileResult.reason.message
          : "Profiles API unavailable";
        setAgents(buildDemoAgents());
        setError(null);
        setDegraded(true);
        setDegradedMsg(`Profiles API unavailable (${message}). Showing clearly marked demo office so the visual layout remains testable.`);
        return;
      }

      const profileResp = profileResult.value;
      if (!profileResp?.profiles) {
        setAgents(buildDemoAgents());
        setError(null);
        setDegraded(true);
        setDegradedMsg("Invalid profile response. Showing clearly marked demo office so the visual layout remains testable.");
        return;
      }

      if (boardResult.status === "rejected" || !boardResult.value?.columns) {
        const message = boardResult.status === "rejected" && boardResult.reason instanceof Error
          ? boardResult.reason.message
          : "Kanban board data unavailable";
        const fallbackStates: AgentState[] = profileResp.profiles.map((p) => ({
          profile: p,
          status: "idle" as AgentStatus,
          taskCount: 0,
          blockedCount: 0,
        }));
        setAgents(fallbackStates);
        setError(null);
        setDegraded(true);
        setDegradedMsg(`${message}. Showing real profiles without task status.`);
        return;
      }

      const agentStates = buildAgentStates(profileResp.profiles, boardResult.value);
      setAgents(agentStates);
      setError(null);
      setDegraded(false);
      setDegradedMsg("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown fetch error";
      setAgents(buildDemoAgents());
      setError(null);
      setDegraded(true);
      setDegradedMsg(`Unexpected API failure (${message}). Showing clearly marked demo office.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // States
  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;
  if (!agents || agents.length === 0) return <EmptyView />;

  // Group agents by status for zone placement
  const groups = {
    working: agents.filter((a) => a.status === "working"),
    reviewing: agents.filter((a) => a.status === "reviewing"),
    idle: agents.filter((a) => a.status === "idle"),
    blocked: agents.filter((a) => a.status === "blocked"),
  };

  return (
    <div className="ao-office">
      {degraded && <DegradedBanner message={degradedMsg} />}

      {/* Top header bar */}
      <header className="ao-header">
        <h1 className="ao-title">🏢 Agent Office</h1>
        <p className="ao-subtitle">
          {agents.length} agent{agents.length !== 1 ? "s" : ""} · polling every {POLL_INTERVAL_MS / 1000}s
        </p>
      </header>

      {/* Office floor */}
      <div className="ao-floor">
        {/* Floor plan background */}
        <div className="ao-floor-wall">
          {/* Window decorations */}
          <div className="ao-window ao-window--left" />
          <div className="ao-window ao-window--right" />

          {/* Zone: Desks */}
          <div
            className="ao-zone ao-zone--desks"
          >
            <div className="ao-zone-label">🖥 Desks</div>
            <div className="ao-desks-grid">
              {groups.working.map((agent, i) => (
                <WorkerAvatar
                  key={agent.profile.name}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
              {groups.working.length === 0 && (
                <span className="ao-zone-empty">No one working</span>
              )}
            </div>
          </div>

          {/* Zone: Review / Test */}
          <div className="ao-zone ao-zone--review">
            <ReviewDesk />
            <div className="ao-review-workers">
              {groups.reviewing.map((agent) => (
                <WorkerAvatar
                  key={agent.profile.name}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
              {groups.reviewing.length === 0 && (
                <span className="ao-zone-empty" />
              )}
            </div>
          </div>

          {/* Zone: Coffee / Lounge */}
          <div className="ao-zone ao-zone--lounge">
            <CoffeeMachine />
            <div className="ao-lounge-workers">
              {groups.idle.map((agent) => (
                <WorkerAvatar
                  key={agent.profile.name}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
              {groups.idle.length === 0 && (
                <span className="ao-zone-empty">Everyone's busy!</span>
              )}
            </div>
          </div>

          {/* Zone: Blocked / Help */}
          <div className="ao-zone ao-zone--problem">
            <ProblemZone />
            <div className="ao-problem-workers">
              {groups.blocked.map((agent) => (
                <WorkerAvatar
                  key={agent.profile.name}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
              {groups.blocked.length === 0 && (
                <span className="ao-zone-empty">No blocked agents</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side drawer */}
      {selectedAgent && (
        <AgentDrawer
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
