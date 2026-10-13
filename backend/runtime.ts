import { getPrismaClient } from "./database";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function db() {
  try {
    return getPrismaClient();
  } catch (error) {
    const configured = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR-PASSWORD]"));
    const value = error instanceof Error ? error as Error & { code?: unknown; cause?: unknown } : undefined;
    const message = (value?.message ?? String(error)).replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s/]+@/gi, "$1[redacted]@");
    console.error("[database] Prisma client initialization failed", { configured, errorName: value?.name, code: value?.code, message });
    throw new ApiError(503, "DATABASE_UNAVAILABLE", configured ? "Database client could not be initialized." : "DATABASE_URL is missing or still uses the placeholder.");
  }
}
