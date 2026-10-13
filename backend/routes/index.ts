import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAuthRequest } from "./auth.routes.js";
import { handleHealthRequest } from "./health.routes.js";

export async function routeRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  if (await handleAuthRequest(request, response)) return true;
  return handleHealthRequest(request, response);
}
