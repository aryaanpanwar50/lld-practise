import type { GoogleIdentity } from "../auth/google-oauth.js";
import type { AuthUser } from "../models/user.js";

export interface UserRepository {
  findByGoogleSub(googleSub: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  updateGoogleUser(id: string, identity: GoogleIdentity): Promise<AuthUser>;
  createGoogleUser(identity: GoogleIdentity): Promise<AuthUser>;
}
