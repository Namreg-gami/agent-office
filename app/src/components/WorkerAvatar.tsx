import React from "react";
import type { AgentState } from "../types";

const STATUS_COLORS: Record<string, string> = {
  idle: "#6b7280",
  working: "#10b981",
  blocked: "#ef4444",
  reviewing: "#8b5cf6",
};

const STATUS_ANIMATIONS: Record<string, string> = {
  idle: "",
  working: "ao-avatar--typing",
  blocked: "ao-avatar--blocked",
  reviewing: "ao-avatar--reviewing",
};

interface Props {
  agent: AgentState;
  onClick: () => void;
}

export default function WorkerAvatar({
  agent,
  onClick,
}: Props): React.ReactElement {
  const { profile, status } = agent;
  const color = STATUS_COLORS[status] || "#6b7280";
  const animClass = STATUS_ANIMATIONS[status] || "";
  // Use first two letters of profile name as initials
  const initials = profile.name.slice(0, 2).toUpperCase();

  return (
    <button
      className={`ao-avatar ${animClass}`}
      style={{ borderColor: color }}
      onClick={onClick}
      title={`${profile.name} — ${status}`}
      aria-label={`${profile.name}: ${status}`}
    >
      <span className="ao-avatar-inner">{initials}</span>
      <span
        className="ao-status-dot"
        style={{ backgroundColor: color }}
      />
      <span className="ao-avatar-name">{profile.name}</span>
      <span className="ao-avatar-status" style={{ color }}>
        {status}
      </span>
    </button>
  );
}