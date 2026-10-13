import type { IncomingMessage, ServerResponse } from "node:http";
import { HealthController } from "../controllers/health.controller.js";

const controller = new HealthController();

export function handleHealthRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  return controller.database(request, response);
}
