import { createServer } from "node:http";
import path from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { connectToDatabase, disconnectFromDatabase } from "./database.js";
import { routeRequest } from "./routes/index.js";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(backendDirectory, "../.env") });

const port = Number(process.env.PORT ?? 4000);

const server = createServer(async (request, response) => {
  try {
    if (await routeRequest(request, response)) return;
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ message: "Not found." }));
  } catch {
    if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }));
  }
});

async function startServer() {
  try {
    await connectToDatabase();
  } catch (error) {
    const e = error instanceof Error ? error as Error & { code?: unknown; meta?: unknown; cause?: unknown } : undefined;
    const details = e ? { name: e.name, message: e.message, code: e.code, meta: e.meta, cause: e.cause instanceof Error ? e.cause.message : e.cause } : String(error);
    const safeDetails = JSON.stringify(details).replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s/]+@/gi, "$1[redacted]@");
    console.error("Database connection failed; backend was not started. Check DATABASE_URL.");
    console.error(safeDetails);
    await disconnectFromDatabase().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  server.listen(port, () => {
    console.log(`Database connected. Backend listening on port ${port}.`);
  });
}

void startServer();
