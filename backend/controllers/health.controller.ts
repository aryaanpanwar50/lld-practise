import type { IncomingMessage, ServerResponse } from "node:http";
import { checkDatabaseConnection } from "../database.js";

export class HealthController {
  async database(request: IncomingMessage, response: ServerResponse) {
    if (request.method !== "GET" || request.url !== "/api/db-check") return false;
    try {
      const connected = await checkDatabaseConnection();
      if (!connected) {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: false, message: "Database connection is not configured." }));
        return true;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return true;
    } catch {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, message: "Database connection failed." }));
      return true;
    }
  }
}
