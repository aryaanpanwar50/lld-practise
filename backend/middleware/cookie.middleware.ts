import type { IncomingMessage } from "node:http";

export function readCookie(request: IncomingMessage, name: string): string | undefined {
  const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return pair?.slice(name.length + 1);
}

export function serializeCookie(name: string, value: string, maxAge: number): string {
  const domain = process.env.AUTH_COOKIE_DOMAIN;
  if (domain && !/^\.?[a-z0-9.-]+$/i.test(domain)) throw new Error("AUTH_COOKIE_DOMAIN must be a valid parent domain.");
  return name + "=" + value + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + maxAge + (domain ? "; Domain=" + domain : "") + (process.env.NODE_ENV === "production" ? "; Secure" : "");
}
