// app/src/types.ts — Agent Office standalone app types

export interface ProfileInfo {
  name: string;
  path: string;
  is_default: boolean;
  model?: string;
  provider?: string;
  has_env: boolean;
  skill_count: number;
  gateway_running: boolean;
  description: string;
  description_auto: boolean;
  distribution_name?: string;
  distribution_version?: string;
  distribution_source?: string;
  has_alias: boolean;
}

export interface KanbanTask {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  body: string;
  priority: number;
  tenant?: string;
  latest_summary?: string;
  link_counts: { parents: number; children: number };
  comment_count: number;
  progress?: { done: number; total: number };
  age: {
    created_age_seconds?: number;
    started_age_seconds?: number;
    time_to_complete_seconds?: number;
  };
  warnings?: {
    count: number;
    kinds: Record<string, number>;
    latest_at: number;
    highest_severity?: string;
  };
  diagnostics?: Diagnostic[];
}

export interface Diagnostic {
  kind: string;
  severity: string;
  message: string;
  count: number;
  last_seen_at?: number;
  recovery_hint?: string;
}

export interface KanbanBoard {
  columns: { name: string; tasks: KanbanTask[] }[];
  assignees: string[];
  tenants: string[];
  latest_event_id: number;
  now: number;
}

export interface TaskDetail {
  task: KanbanTask;
  comments: Comment[];
  events: Event[];
  attachments: Attachment[];
  links: { parents: string[]; children: string[] };
  runs: Run[];
}

export interface Comment {
  id: number;
  task_id: string;
  author: string;
  body: string;
  created_at: number;
}

export interface Event {
  id: number;
  task_id: string;
  kind: string;
  payload: Record<string, unknown>;
  created_at: number;
  run_id?: number;
}

export interface Attachment {
  id: number;
  task_id: string;
  filename: string;
  content_type: string;
  size: number;
  uploaded_by?: string;
  stored_path: string;
  created_at: number;
}

export interface Run {
  id: number;
  task_id: string;
  profile: string;
  step_key?: string;
  status: string;
  claim_lock?: string;
  claim_expires?: number;
  worker_pid?: number;
  max_runtime_seconds?: number;
  last_heartbeat_at?: number;
  started_at?: number;
  ended_at?: number;
  outcome?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

// UI domain types — visual state of a worker inside the office map.
export type AgentStatus =
  | "idle"
  | "walking_to_desk"
  | "working_at_desk"
  | "walking_to_review"
  | "reviewing"
  | "walking_to_lounge"
  | "blocked";

export interface AgentState {
  profile: ProfileInfo;
  status: AgentStatus;
  currentTask?: KanbanTask;
  taskCount: number;
  blockedCount: number;
}

export interface ProfilesResponse {
  profiles: ProfileInfo[];
}

// ── OpenRouter usage ─────────────────────────────────────────────────────

export interface UsageActivity {
  /** Unix timestamp of the request */
  created_at?: number;
  /** Model slug used */
  model?: string;
  /** Provider slug */
  provider?: string;
  /** Number of tokens */
  tokens?: number;
  /** Cost in USD */
  cost?: number;
  /** Prompt tokens */
  prompt_tokens?: number;
  /** Completion tokens */
  completion_tokens?: number;
}

export interface WorkerUsageResponse {
  profile: string;
  provider: "openrouter";
  configured: boolean;
  key_label?: string;
  key_id?: string | null;
  key_name?: string | null;
  /** Total usage in USD */
  usage: number;
  /** Daily usage in USD */
  usage_daily: number | null;
  /** Weekly usage in USD */
  usage_weekly: number | null;
  /** Monthly usage in USD */
  usage_monthly: number;
  /** Credit limit in USD */
  limit: number | null;
  /** Remaining credits in USD */
  remaining: number | null;
  /** ISO timestamp or null */
  limit_reset: string | null;
  /** Whether token-level activity is available */
  activity_available: boolean;
  /** Token-level activity entries (capped at 50) */
  activity?: UsageActivity[];
  /** Error message if the request failed */
  error: string | null;
}
