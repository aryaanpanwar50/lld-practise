import type { IncomingMessage, ServerResponse } from "node:http";
import { getAppOrigin } from "../middleware/cors.middleware.js";
import { readCookie, serializeCookie } from "../middleware/cookie.middleware.js";
import { AuthService, SESSION_COOKIE, SESSION_TTL } from "../services/auth.service.js";

const transientCookies = ["google_oauth_state", "google_oauth_nonce", "google_oauth_verifier"];
const transientMaxAge = 600;

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  startGoogle(request: IncomingMessage, response: ServerResponse) {
    try {
      const flow = this.auth.startGoogleOAuth();
      response.writeHead(302, {
        location: flow.authorizationUrl,
        "set-cookie": [
          serializeCookie("google_oauth_state", flow.state, transientMaxAge),
          serializeCookie("google_oauth_nonce", flow.nonce, transientMaxAge),
          serializeCookie("google_oauth_verifier", flow.verifier, transientMaxAge)
        ],
        "cache-control": "no-store"
      });
      response.end();
    } catch {
      this.redirectFailure(response, getAppOrigin(), "not-configured");
    }
  }

  async googleCallback(request: IncomingMessage, response: ServerResponse, url: URL) {
    const configBase = getAppOrigin();
    if (url.searchParams.has("error")) {
      this.redirectFailure(response, configBase, "google-denied");
      return;
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const savedState = readCookie(request, "google_oauth_state");
    const nonce = readCookie(request, "google_oauth_nonce");
    const verifier = readCookie(request, "google_oauth_verifier");
    if (!code || !state || !savedState || state !== savedState || !nonce || !verifier) {
      this.redirectFailure(response, configBase, "invalid-oauth-state");
      return;
    }
    try {
      const result = await this.auth.completeGoogleOAuth(code, nonce, verifier);
      const config = new URL(configBase);
      response.writeHead(302, {
        location: new URL("/problems", config).toString(),
        "set-cookie": [
          serializeCookie(SESSION_COOKIE, result.sessionToken, SESSION_TTL),
          ...transientCookies.map((name) => serializeCookie(name, "", 0))
        ],
        "cache-control": "no-store"
      });
      response.end();
    } catch (error) {
      const name = error instanceof Error ? error.name : "UnknownError";
      const hint = name === "PrismaClientValidationError"
        ? "Regenerate Prisma Client from the current schema and restart the backend."
        : name === "PrismaClientKnownRequestError"
          ? "Check that pending Prisma migrations have been deployed."
          : "Check the backend OAuth configuration and provider response.";
      console.error("[auth] Google OAuth callback failed", { name, hint });
      this.redirectFailure(response, configBase, "google-sign-in-failed");
    }
  }

  async currentUser(request: IncomingMessage, response: ServerResponse) {
    try {
      const user = await this.auth.getCurrentUser(readCookie(request, SESSION_COOKIE));
      if (!user) {
        sendJson(response, 401, { error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
        return;
      }
      sendJson(response, 200, { user });
    } catch (error) {
      if (error instanceof Error && error.message.includes("AUTH_SESSION_SECRET")) {
        sendJson(response, 503, { error: { code: "AUTH_NOT_CONFIGURED", message: "Set AUTH_SESSION_SECRET on the backend." } });
        return;
      }
      console.error("[auth] Current session lookup failed", { name: error instanceof Error ? error.name : "UnknownError" });
      sendJson(response, 503, { error: { code: "DATABASE_UNAVAILABLE", message: "The account could not be loaded." } });
    }
  }

  logout(response: ServerResponse) {
    response.writeHead(204, { "set-cookie": serializeCookie(SESSION_COOKIE, "", 0), "cache-control": "no-store" });
    response.end();
  }

  private redirectFailure(response: ServerResponse, base: string, reason: string) {
    response.writeHead(302, {
      location: new URL("/sign-in?error=" + reason, base).toString(),
      "set-cookie": transientCookies.map((name) => serializeCookie(name, "", 0)),
      "cache-control": "no-store"
    });
    response.end();
  }
}
