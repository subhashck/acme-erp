/**
 * Auth Helper for Integration Tests
 *
 * Provides authenticated request helpers for integration tests.
 */
import { app } from "../../server/index.ts";

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const headers: Record<string, string> = {
    "x-test-admin": "true",
    ...extraHeaders,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return app.request(path.startsWith("/") ? path : `/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export const api = {
  get: (path: string) => apiRequest("GET", path),
  post: (path: string, body: unknown) => apiRequest("POST", path, body),
  patch: (path: string, body: unknown) => apiRequest("PATCH", path, body),
  delete: (path: string) => apiRequest("DELETE", path),
};
