// app/src/api.ts — Hermes API client (proxied via Vite)

import type {
  ProfilesResponse,
  KanbanBoard,
  TaskDetail,
} from "./types";

const API_BASE = "/api";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} for ${url}`);
  }
  return res.json() as Promise<T>;
}

export function fetchProfiles(): Promise<ProfilesResponse> {
  return fetchJSON<ProfilesResponse>("/profiles");
}

export function fetchKanbanBoard(): Promise<KanbanBoard> {
  return fetchJSON<KanbanBoard>("/plugins/kanban/board");
}

export function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  return fetchJSON<TaskDetail>(`/plugins/kanban/tasks/${taskId}`);
}
