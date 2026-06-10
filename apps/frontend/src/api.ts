export type User = { id: number; username: string };

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (username: string, password: string) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  me: () => request<{ user: User }>("/auth/me"),
  dashboard: () => request<{ stats: { totalPlans: number; completedSessions: number }; activeSession: any }>("/dashboard"),
  history: () => request<{ history: any[] }>("/history"),
  plans: () => request<{ plans: any[] }>("/plans"),
  createPlan: (name: string, notes?: string) =>
    request<any>("/plans", {
      method: "POST",
      body: JSON.stringify({ name, notes })
    }),
  planById: (id: number) => request<{ plan: any; exercises: any[] }>(`/plans/${id}`),
  addPlanExercise: (id: number, payload: any) =>
    request<any>(`/plans/${id}/exercises`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  startSession: (planId?: number) =>
    request<{ id: number }>("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ planId })
    }),
  addSet: (sessionId: number, payload: any) =>
    request<any>(`/sessions/${sessionId}/sets`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  completeSession: (sessionId: number) =>
    request<any>(`/sessions/${sessionId}/complete`, {
      method: "POST"
    })
};

export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}
