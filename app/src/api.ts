// app/src/api.ts — Agent Office API bridge client

import type {
  ProfilesResponse,
  KanbanBoard,
  KanbanTask,
  TaskDetail,
  AgentState,
  AgentStatus,
} from "./types";

const API_BASE = "";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} for ${url}`);
  }
  return res.json() as Promise<T>;
}

// ── API bridge (new FastAPI backend on port 8800) ──────────────────────────

export interface OfficeWorker {
  profile: string;
  role: string;
  visual_state: string;
  current_task_id: string | null;
  current_task_title: string | null;
  task_status: string | null;
  task_column: string | null;
  task_count: number;
  blocked_count: number;
}

export interface OfficeStateResponse {
  workers: OfficeWorker[];
  tasks: KanbanTask[];
  now: number;
  board: string;
}

export interface WorkerDetailResponse {
  worker: OfficeWorker & { tasks: KanbanTask[] };
  task_detail: TaskDetail | null;
}

export function fetchOfficeState(): Promise<OfficeStateResponse> {
  return fetchJSON<OfficeStateResponse>("/api/office/state");
}

export function fetchWorkerDetail(profile: string): Promise<WorkerDetailResponse> {
  return fetchJSON<WorkerDetailResponse>(`/api/office/workers/${profile}`);
}

export function fetchTaskDetailApi(taskId: string): Promise<TaskDetail> {
  return fetchJSON<TaskDetail>(`/api/office/tasks/${taskId}`);
}

export function officeStateToAgentStates(resp: OfficeStateResponse): AgentState[] {
  return resp.workers.map((w) => ({
    profile: {
      name: w.profile,
      path: `profile://${w.profile}`,
      is_default: false,
      has_env: false,
      skill_count: 0,
      gateway_running: false,
      description: `${w.role} worker — ${w.visual_state.replace(/_/g, " ")}`,
      description_auto: true,
      has_alias: false,
    },
    status: w.visual_state as AgentStatus,
    currentTask: w.current_task_id
      ? resp.tasks.find((t) => t.id === w.current_task_id)
      : undefined,
    taskCount: w.task_count,
    blockedCount: w.blocked_count,
  }));
}

// ── Legacy Hermes API (proxied to 9119, kept for fallback) ─────────────────

export function fetchProfiles(): Promise<ProfilesResponse> {
  return fetchJSON<ProfilesResponse>("/api/profiles");
}

export function fetchKanbanBoard(): Promise<KanbanBoard> {
  return fetchJSON<KanbanBoard>("/api/plugins/kanban/board");
}

export function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  // Drawer compatibility: route task detail through the Agent Office bridge,
  // not the protected Hermes dashboard API that returns 401 for standalone app.
  return fetchTaskDetailApi(taskId);
}