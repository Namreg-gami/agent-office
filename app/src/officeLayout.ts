// app/src/officeLayout.ts — determine worker position in the office scene

import type { AgentState, AgentStatus } from "./types";

export interface OfficePosition {
  x: number;   // percentage from left
  y: number;   // percentage from top
  zone: string; // zone label
}

// Zone definitions as CSS-able areas
export const ZONES = {
  desks: { label: "Desks", xRange: [5, 55], yRange: [10, 50] },
  review: { label: "Review / Test", xRange: [60, 80], yRange: [10, 40] },
  lounge: { label: "Coffee / Lounge", xRange: [70, 95], yRange: [55, 90] },
  problem: { label: "Blocked / Help", xRange: [5, 30], yRange: [60, 90] },
} as const;

// Deterministic but scattered positions per profile name
function nameToOffset(name: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  // Return offsets in range [0, 1)
  return [(hash % 100) / 100, ((hash >> 8) % 100) / 100];
}

export function getWorkerPosition(
  agent: AgentState,
  index: number,
  totalInZone: number
): OfficePosition {
  switch (agent.status) {
    case "working": {
      const [ox, oy] = nameToOffset(agent.profile.name);
      return {
        x: ZONES.desks.xRange[0] + ox * (ZONES.desks.xRange[1] - ZONES.desks.xRange[0]),
        y: ZONES.desks.yRange[0] + oy * (ZONES.desks.yRange[1] - ZONES.desks.yRange[0]),
        zone: "Desks",
      };
    }
    case "reviewing": {
      const [ox, oy] = nameToOffset(agent.profile.name);
      return {
        x: ZONES.review.xRange[0] + ox * (ZONES.review.xRange[1] - ZONES.review.xRange[0]),
        y: ZONES.review.yRange[0] + oy * (ZONES.review.yRange[1] - ZONES.review.yRange[0]),
        zone: "Review / Test",
      };
    }
    case "blocked": {
      const step = totalInZone > 1 ? (ZONES.problem.xRange[1] - ZONES.problem.xRange[0]) / (totalInZone - 1) : 0;
      return {
        x: ZONES.problem.xRange[0] + (totalInZone > 1 ? index * step : 15),
        y: ZONES.problem.yRange[0] + (ZONES.problem.yRange[1] - ZONES.problem.yRange[0]) / 2,
        zone: "Blocked / Help",
      };
    }
    case "idle": {
      const step = totalInZone > 1 ? (ZONES.lounge.xRange[1] - ZONES.lounge.xRange[0]) / (totalInZone - 1) : 0;
      return {
        x: ZONES.lounge.xRange[0] + (totalInZone > 1 ? index * step : 75),
        y: ZONES.lounge.yRange[0] + (ZONES.lounge.yRange[1] - ZONES.lounge.yRange[0]) / 2,
        zone: "Coffee / Lounge",
      };
    }
    default:
      return { x: 50, y: 80, zone: "Unknown" };
  }
}

export function deriveStatus(
  tasks: import("./types").KanbanTask[],
  profileName: string
): AgentStatus {
  if (tasks.length === 0) return "idle";

  // Special case: profiles named "reviewer" or containing "review" that have tasks in review column
  const hasReviewTask = tasks.some(
    (t) =>
      t.status === "review" ||
      t.status === "pending_review" ||
      t.status === "approved"
  );
  if (hasReviewTask || profileName.toLowerCase().includes("review")) {
    return "reviewing";
  }

  const running = tasks.filter((t) => t.status === "running");
  if (running.length > 0) return "working";

  const blocked = tasks.filter((t) => t.status === "blocked");
  if (blocked.length > 0) return "blocked";

  const hasActive = tasks.some(
    (t) =>
      t.status === "ready" || t.status === "triage" || t.status === "todo"
  );
  return hasActive ? "working" : "idle";
}
