// src/lib/api.ts

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:5001";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem("access_token");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    sessionStorage.removeItem("access_token");
    window.location.href = "/login";
  }


  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  // Prevent crash for 204 No Content
  if (res.status === 204) return null as unknown as T;

  return (await res.json()) as T;
}

export async function login(username: string, password: string) {
  return apiFetch<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function deletePlot(plotId: string) {
  return apiFetch<{ ok: true; deleted_plot_id: string }>(`/api/plots/${plotId}`, {
    method: "DELETE",
  });
}


// ---------- Types ----------
export type PlotStatus = "Proceed" | "Pending" | "Stop";

export type Plot = {
  id: string;
  name: string;
  planting_date: string; // YYYY-MM-DD recommended
  location_x: number | null; // grid-based position
  location_y: number | null; // grid-based position
  status: PlotStatus;
  created_at: string;

  // ✅ fields used by FarmMap / PlotDetails UI (keep optional for backward compatibility)
  area_ha?: number | null;
  crop_type?: string | null;
  growth_stage?: string | null;
};

export type Task = {
  id: string;
  plot_id: string;
  title: string;
  type: string;
  task_date: string; // YYYY-MM-DD

  // ✅ frontend single-truth field (mapped from backend "status")
  decision: PlotStatus;

  description?: string | null;
  original_date?: string | null;
  proposed_date?: string | null;
  reason?: string | null;
};

// ---------- Plots ----------
export async function listPlots() {
  const res = await apiFetch<{ ok: true; data: any[] }>("/api/plots");
  const normalized = (res.data ?? []).map((plot) => {
    const rawId = plot?.id ?? plot?.plot_id;
    return {
      ...plot,
      id: rawId == null ? "" : String(rawId),
    } as Plot;
  });

  return { ...res, data: normalized };
}

export async function createPlotWithPlan(payload: {
  name: string;
  area_ha: number;
  crop_type: string;
  planting_date: string; // YYYY-MM-DD
  growth_stage: string;
  location_x?: number | null;
  location_y?: number | null;
}) {
  return apiFetch<{ message: string; plot_id: string; tasks_created: number }>(
    "/api/plots/create-with-plan",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/**
 * ✅ Helper: always get ONE plot by id using the same source
 * (later we can switch to a dedicated backend endpoint without changing pages)
 */
export async function getPlotById(plotId: string): Promise<Plot> {
  const res = await listPlots();
  const targetId = String(plotId);
  const plot = res.data.find((p) => String(p.id) === targetId);
  if (!plot) throw new Error("Plot not found");
  return plot;
}

// ---------- Tasks ----------
export async function listTasks(params?: { plot_id?: string }) {
  const query = params?.plot_id ? `?plot_id=${encodeURIComponent(params.plot_id)}` : "";
  const res = await apiFetch<{ ok: true; data: any[] }>(`/api/tasks${query}`);

  return {
    ...res,
    data: res.data.map((t) => ({
      ...t,
      decision: t.status as PlotStatus, // ✅ standard mapping
    })),
  } as { ok: true; data: Task[] };
}

/** ✅ Helper: always get tasks for ONE plot */
export async function getTasksByPlotId(plotId: string): Promise<Task[]> {
  const res = await listTasks({ plot_id: plotId });
  return res.data;
}

// ---------- Reschedule Center ----------
/**
 * ✅ Keep same mapping as listTasks so Schedule & Reschedule never disagree.
 * If backend later supports filtering by plot_id, we can add params safely.
 */
export async function listRescheduleProposals() {
  const res = await apiFetch<{ ok: true; data: any[] }>("/api/tasks/reschedule-proposals");

  return {
    ...res,
    data: res.data.map((t) => ({
      ...t,
      decision: t.status as PlotStatus,
    })),
  } as { ok: true; data: Task[] };
}

export async function approveReschedule(taskId: string) {
  const res = await apiFetch<{ ok: true; data: any }>(`/api/tasks/${taskId}/approve-reschedule`, {
    method: "POST",
  });

  return {
    ...res,
    data: {
      ...res.data,
      decision: res.data.status as PlotStatus,
    } as Task,
  } as { ok: true; data: Task };
}

export async function rejectReschedule(taskId: string) {
  const res = await apiFetch<{ ok: true; data: any }>(`/api/tasks/${taskId}/reject-reschedule`, {
    method: "POST",
  });

  return {
    ...res,
    data: {
      ...res.data,
      decision: res.data.status as PlotStatus,
    } as Task,
  } as { ok: true; data: Task };
}

export async function getAnalyticsHistory(days: number = 30) {
  const res = await fetch(`${API_BASE}/analytics/history?days=${days}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // Add Authorization header if needed later
      // "Authorization": `Bearer ${token}` 
    }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch historical data");
  }

  return res.json();
}

export async function getAnalyticsForecast(days: number = 7) {
  // Map friendly strings to integers if passed (e.g. '1W' -> 7 handled in component, or here)
  // For now expecting integer
  const res = await fetch(`${API_BASE}/analytics/forecast?days=${days}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch forecast data");
  }

  return res.json();
}

export async function getRecommendations(deviceId: number = 205) {
  const res = await fetch(`${API_BASE}/analytics/recommendations?device_id=${deviceId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}
