import type { IncomingMessage, ServerResponse } from "node:http";
import { AuthController } from "../controllers/auth.controller.js";
import { applyCors, isAllowedMutationOrigin } from "../middleware/cors.middleware.js";
import { PrismaUserRepository } from "../repositories/prisma-user.repository.js";
import { AuthService } from "../services/auth.service.js";

let controller: AuthController | undefined;
function getController() {
  controller ??= new AuthController(new AuthService(new PrismaUserRepository()));
  return controller;
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

export async function handleAuthRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://backend.local");
  if (!url.pathname.startsWith("/api/auth/")) return false;
  const corsAllowed = applyCors(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(corsAllowed ? 204 : 403);
    response.end();
    return true;
  }
  if (request.method === "GET" && url.pathname === "/api/auth/google") {
    getController().startGoogle(request, response);
    return true;
  }
  if (request.method === "GET" && url.pathname === "/api/auth/google/callback") {
    await getController().googleCallback(request, response, url);
    return true;
  }
  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    if (!corsAllowed) json(response, 403, { error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." } });
    else await getController().currentUser(request, response);
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    if (!corsAllowed || !isAllowedMutationOrigin(request)) json(response, 403, { error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." } });
    else getController().logout(response);
    return true;
  }

  json(response, 404, { error: { code: "NOT_FOUND", message: "Not found." } });
  return true;
}
