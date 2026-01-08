const API_BASE = "http://localhost:8000";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Login failed");
  }

  return data as { access_token: string; token_type: string };
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
