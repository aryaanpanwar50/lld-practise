import { createHmac, timingSafeEqual, type JsonWebKey } from "node:crypto";

const SESSION_ISSUER = "lld-practice";
const SESSION_AUDIENCE = "lld-practice-web";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type GoogleClaims = { sub: string; email: string; email_verified: boolean; name?: string; picture?: string; nonce?: string; iss: string; aud: string | string[]; azp?: string; exp: number; iat: number };
export type GoogleIdentity = { googleSub: string; email: string; name: string; pictureUrl: string | null };

export function authSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set AUTH_SESSION_SECRET to a random value with at least 32 characters.");
  return secret;
}

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const backendBaseUrl = process.env.BACKEND_BASE_URL;
  const appBaseUrl = process.env.APP_BASE_URL;
  const sessionSecret = authSessionSecret();
  if (!clientId || !clientSecret || !redirectUri || !backendBaseUrl || !appBaseUrl) {
    throw new Error("Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI, BACKEND_BASE_URL, and APP_BASE_URL.");
  }
  let app: URL;
  let backend: URL;
  let redirect: URL;
  try { app = new URL(appBaseUrl); backend = new URL(backendBaseUrl); redirect = new URL(redirectUri); } catch { throw new Error("APP_BASE_URL, BACKEND_BASE_URL, and GOOGLE_OAUTH_REDIRECT_URI must be valid URLs."); }
  for (const base of [app, backend]) if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) throw new Error("App and backend URLs must use HTTPS outside local development.");
  const expectedRedirect = new URL("/api/auth/google/callback", backend).toString();
  if (redirect.toString() !== expectedRedirect) throw new Error("GOOGLE_OAUTH_REDIRECT_URI must exactly match BACKEND_BASE_URL + /api/auth/google/callback.");
  return { clientId, clientSecret, redirectUri: redirect.toString(), backendBaseUrl: backend.origin, appBaseUrl: app.origin, sessionSecret };
}

export async function verifyGoogleIdToken(token: string, expectedNonce: string, clientId: string): Promise<GoogleIdentity> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Google identity token.");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string; kid?: string };
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as GoogleClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Invalid Google identity token.");
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Google signing keys could not be loaded.");
  const jwks = await response.json() as { keys?: (JsonWebKey & { kid?: string; alg?: string; use?: string })[] };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
  if (!jwk) throw new Error("Google signing key was not found.");
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, Buffer.from(parts[2], "base64url"), Buffer.from(parts[0] + "." + parts[1]));
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud.includes(clientId) && (claims.aud.length === 1 || claims.azp === clientId) : claims.aud === clientId;
  if (!validSignature || !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss) || !audience || !Number.isFinite(claims.exp) || !Number.isFinite(claims.iat) || claims.exp <= now || claims.iat > now + 60 || claims.nonce !== expectedNonce || claims.email_verified !== true || !claims.sub || !claims.email) {
    throw new Error("Google identity token validation failed.");
  }
  return { googleSub: claims.sub, email: claims.email.toLowerCase(), name: claims.name?.slice(0, 200) || claims.email, pictureUrl: claims.picture ?? null };
}

function encode(value: unknown) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
export function createSessionToken(userId: string, secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = encode({ alg: "HS256", typ: "JWT" }) + "." + encode({ sub: userId, iss: SESSION_ISSUER, aud: SESSION_AUDIENCE, iat: now, exp: now + SESSION_TTL_SECONDS });
  return unsigned + "." + createHmac("sha256", secret).update(unsigned).digest("base64url");
}
export function verifySessionToken(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const unsigned = parts[0] + "." + parts[1];
    const expected = createHmac("sha256", secret).update(unsigned).digest();
    const actual = Buffer.from(parts[2], "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string };
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { sub?: string; iss?: string; aud?: string; exp?: number };
    if (header.alg !== "HS256" || claims.iss !== SESSION_ISSUER || claims.aud !== SESSION_AUDIENCE || !claims.sub || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims.sub;
  } catch { return null; }
}
export const SESSION_COOKIE = "lld_session";
export const SESSION_TTL = SESSION_TTL_SECONDS;
