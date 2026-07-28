export const API_BASE_URL = "http://localhost:5000/api";

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
