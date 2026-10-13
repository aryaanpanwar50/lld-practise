import type { IncomingMessage, ServerResponse } from "node:http";

export function getAppOrigin(): string {
  try { return new URL(process.env.APP_BASE_URL ?? "http://localhost:3000").origin; }
  catch { return "http://localhost:3000"; }
}

export function applyCors(request: IncomingMessage, response: ServerResponse): boolean {
  const origin = request.headers.origin;
  response.setHeader("Vary", "Origin");
  if (origin && origin === getAppOrigin()) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  return !origin || origin === getAppOrigin();
}

export function isAllowedMutationOrigin(request: IncomingMessage): boolean {
  return !request.headers.origin || request.headers.origin === getAppOrigin();
}
