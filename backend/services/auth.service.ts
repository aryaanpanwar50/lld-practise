import { createHash, randomBytes } from "node:crypto";
import { createSessionToken, googleOAuthConfig, SESSION_COOKIE, SESSION_TTL, verifyGoogleIdToken, verifySessionToken, authSessionSecret } from "../auth/google-oauth.js";
import type { AuthUser, PublicUser } from "../models/user.js";
import type { UserRepository } from "../repositories/user.repository.js";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export type OAuthStart = { authorizationUrl: string; state: string; nonce: string; verifier: string };
export type OAuthCompletion = { user: AuthUser; sessionToken: string };

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  startGoogleOAuth(): OAuthStart {
    const config = googleOAuthConfig();
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account"
    }).toString();
    return { authorizationUrl: authorizationUrl.toString(), state, nonce, verifier };
  }

  async completeGoogleOAuth(code: string, nonce: string, verifier: string): Promise<OAuthCompletion> {
    const config = googleOAuthConfig();
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier
      }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed.");
    const payload = await tokenResponse.json() as { id_token?: string };
    if (!payload.id_token) throw new Error("Google did not return an ID token.");

    const identity = await verifyGoogleIdToken(payload.id_token, nonce, config.clientId);
    const byGoogleId = await this.users.findByGoogleSub(identity.googleSub);
    let user: AuthUser;
    if (byGoogleId) {
      user = await this.users.updateGoogleUser(byGoogleId.id, identity);
    } else {
      const byEmail = await this.users.findByEmail(identity.email);
      if (byEmail?.googleSub && byEmail.googleSub !== identity.googleSub) throw new Error("Google identity conflict.");
      user = byEmail
        ? await this.users.updateGoogleUser(byEmail.id, identity)
        : await this.users.createGoogleUser(identity);
    }
    return { user, sessionToken: createSessionToken(user.id, config.sessionSecret) };
  }

  async getCurrentUser(sessionToken: string | undefined): Promise<PublicUser | null> {
    const userId = verifySessionToken(sessionToken, authSessionSecret());
    if (!userId) return null;
    const user = await this.users.findById(userId);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, pictureUrl: user.pictureUrl };
  }
}

export { SESSION_COOKIE, SESSION_TTL };
