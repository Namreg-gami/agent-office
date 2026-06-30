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
  idle: "ao-sprite--idle",
  walking_to_desk: "ao-sprite--walking",
  working_at_desk: "ao-sprite--typing",
  walking_to_review: "ao-sprite--walking",
  reviewing: "ao-sprite--reviewing",
  walking_to_lounge: "ao-sprite--walking",
  blocked: "ao-sprite--blocked",
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
      className={`ao-map-worker ${animClass}`}
      style={style}
      onClick={onClick}
      title={`${profile.name} — ${STATUS_LABELS[status] || status} @ ${placement.label}`}
      aria-label={`${profile.name}: ${STATUS_LABELS[status] || status} at ${placement.label}`}
      data-zone={placement.zone}
      data-moving={isMovingState(status) ? "true" : "false"}
    >
      <span className="ao-avatar-shadow" />

      {/* CSS-only pixel sprite: head, body, arms, legs */}
      <span className="ao-sprite" aria-hidden="true">
        <span className="ao-sprite-head" />
        <span className="ao-sprite-body" />
        <span className="ao-sprite-arm ao-sprite-arm--left" />
        <span className="ao-sprite-arm ao-sprite-arm--right" />
        <span className="ao-sprite-leg ao-sprite-leg--left" />
        <span className="ao-sprite-leg ao-sprite-leg--right" />
        <span className="ao-sprite-badge">{initials}</span>
      </span>

      <span className="ao-status-dot" style={{ backgroundColor: color }} />
      <span className="ao-avatar-name">{profile.name}</span>
      <span className="ao-avatar-status" style={{ color }}>
        {STATUS_LABELS[status] || status}
      </span>
    </button>
  );
}
