import React from "react";
import type { AgentState } from "../types";
import type { WorkerPlacement } from "../officeLayout";
import { isMovingState } from "../officeLayout";

const STATUS_COLORS: Record<string, string> = {
  idle: "#64748b",
  walking_to_desk: "#f59e0b",
  working_at_desk: "#10b981",
  walking_to_review: "#6366f1",
  reviewing: "#8b5cf6",
  walking_to_lounge: "#0ea5e9",
  blocked: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  walking_to_desk: "Walking",
  working_at_desk: "Working",
  walking_to_review: "To review",
  reviewing: "Reviewing",
  walking_to_lounge: "Resting",
  blocked: "Blocked",
};

const STATUS_ANIMATIONS: Record<string, string> = {
  idle: "ao-avatar--idle",
  walking_to_desk: "ao-avatar--walking",
  working_at_desk: "ao-avatar--typing",
  walking_to_review: "ao-avatar--walking",
  reviewing: "ao-avatar--reviewing",
  walking_to_lounge: "ao-avatar--walking ao-avatar--coffee-bound",
  blocked: "ao-avatar--blocked",
};

interface Props {
  agent: AgentState;
  placement: WorkerPlacement;
  onClick: () => void;
}

export default function WorkerAvatar({
  agent,
  placement,
  onClick,
}: Props): React.ReactElement {
  const { profile, status } = agent;
  const color = STATUS_COLORS[status] || "#6b7280";
  const animClass = STATUS_ANIMATIONS[status] || "";
  const initials = profile.name.slice(0, 2).toUpperCase();
  const style = {
    "--worker-x": `${placement.point.x}%`,
    "--worker-y": `${placement.point.y}%`,
    "--worker-color": color,
  } as React.CSSProperties;

  return (
    <button
      className={`ao-avatar ao-map-worker ${animClass}`}
      style={style}
      onClick={onClick}
      title={`${profile.name} — ${STATUS_LABELS[status] || status} @ ${placement.label}`}
      aria-label={`${profile.name}: ${STATUS_LABELS[status] || status} at ${placement.label}`}
      data-zone={placement.zone}
      data-moving={isMovingState(status) ? "true" : "false"}
    >
      <span className="ao-avatar-shadow" />
      <span className="ao-avatar-inner">{initials}</span>
      <span className="ao-status-dot" style={{ backgroundColor: color }} />
      <span className="ao-avatar-name">{profile.name}</span>
      <span className="ao-avatar-status" style={{ color }}>
        {STATUS_LABELS[status] || status}
      </span>
    </button>
  );
}
