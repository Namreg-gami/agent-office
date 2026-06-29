// app/src/officeLayout.ts — Kanban lifecycle → office visual state/position

import type { AgentState, AgentStatus, KanbanTask } from "./types";

export interface OfficePoint {
  x: number; // percentage from left
  y: number; // percentage from top
}

export interface WorkerPlacement {
  point: OfficePoint;
  zone: "desk" | "lounge" | "review" | "help";
  deskId?: string;
  label: string;
}

type Role = "frontend" | "backend" | "reviewer" | "default";

export const OFFICE_POINTS = {
  desks: {
    frontend: { x: 22, y: 34 },
    backend: { x: 43, y: 34 },
    reviewer: { x: 64, y: 31 },
    default: { x: 31, y: 34 },
  },
  lounge: {
    frontend: { x: 73, y: 73 },
    backend: { x: 82, y: 74 },
    reviewer: { x: 78, y: 84 },
    default: { x: 78, y: 78 },
  },
  review: { x: 72, y: 31 },
  help: { x: 28, y: 76 },
} as const;

const STATUS_PRECEDENCE = [
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
] as const;

function roleForProfile(profileName: string): Role {
  const lower = profileName.toLowerCase();
  if (lower.includes("front")) return "frontend";
  if (lower.includes("back")) return "backend";
  if (lower.includes("review") || lower.includes("test")) return "reviewer";
  return "default";
}

export function normalizeTaskStatus(status: string | undefined): string {
  return (status || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function selectPrimaryTask(tasks: KanbanTask[]): KanbanTask | undefined {
  if (tasks.length === 0) return undefined;
  const sorted = [...tasks].sort((a, b) => {
    const aStatus = normalizeTaskStatus(a.status);
    const bStatus = normalizeTaskStatus(b.status);
    const aIdx = STATUS_PRECEDENCE.indexOf(aStatus as (typeof STATUS_PRECEDENCE)[number]);
    const bIdx = STATUS_PRECEDENCE.indexOf(bStatus as (typeof STATUS_PRECEDENCE)[number]);
    const aScore = aIdx === -1 ? 999 : aIdx;
    const bScore = bIdx === -1 ? 999 : bIdx;
    if (aScore !== bScore) return aScore - bScore;
    return (b.priority || 0) - (a.priority || 0);
  });
  return sorted[0];
}

export function deriveVisualState(tasks: KanbanTask[], profileName: string): AgentStatus {
  const task = selectPrimaryTask(tasks);
  if (!task) return "idle";

  const status = normalizeTaskStatus(task.status);
  const role = roleForProfile(profileName);

  if (status === "blocked") return "blocked";
  if (status === "running" || status === "in_progress") return "working_at_desk";
  if (status === "review" || status === "pending_review" || status === "approved") {
    return role === "reviewer" ? "reviewing" : "walking_to_review";
  }
  if (status === "todo" || status === "ready" || status === "triage") return "walking_to_desk";
  if (status === "done" || status === "completed") return "walking_to_lounge";

  return "idle";
}

function basePointForAgent(agent: AgentState): WorkerPlacement {
  const role = roleForProfile(agent.profile.name);

  switch (agent.status) {
    case "walking_to_desk":
    case "working_at_desk":
      return {
        point: OFFICE_POINTS.desks[role],
        zone: "desk",
        deskId: `desk_${role}`,
        label: `${role} desk`,
      };
    case "walking_to_review":
    case "reviewing":
      return { point: OFFICE_POINTS.review, zone: "review", label: "Review / Test" };
    case "blocked":
      return { point: OFFICE_POINTS.help, zone: "help", label: "Blocked / Help" };
    case "walking_to_lounge":
    case "idle":
    default:
      return {
        point: OFFICE_POINTS.lounge[role],
        zone: "lounge",
        label: "Coffee / Lounge",
      };
  }
}

export function getWorkerPlacement(agent: AgentState, allAgents: AgentState[]): WorkerPlacement {
  const base = basePointForAgent(agent);
  const sameZone = allAgents.filter((candidate) => {
    const other = basePointForAgent(candidate);
    return other.zone === base.zone && other.label === base.label;
  });
  const index = sameZone.findIndex((candidate) => candidate.profile.name === agent.profile.name);
  const offset = index <= 0 ? 0 : index * 4;

  return {
    ...base,
    point: {
      x: Math.min(94, base.point.x + offset),
      y: Math.min(90, base.point.y + (index % 2 === 0 ? 0 : 4)),
    },
  };
}

export function isMovingState(status: AgentStatus): boolean {
  return status === "walking_to_desk" || status === "walking_to_review" || status === "walking_to_lounge";
}

// Backward-compatible name used by older code/tests.
export const deriveStatus = deriveVisualState;
