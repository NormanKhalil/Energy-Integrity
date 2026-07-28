const fallbackApiBase = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "/api"
  : "http://localhost:5000/api";

export const API_BASE_URL = import.meta.env.VITE_API_URL || fallbackApiBase;

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
