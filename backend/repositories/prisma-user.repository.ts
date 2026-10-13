import { randomUUID } from "node:crypto";
import { getPrismaClient } from "../database.js";
import type { GoogleIdentity } from "../auth/google-oauth.js";
import type { AuthUser } from "../models/user.js";
import type { UserRepository } from "./user.repository.js";

export class PrismaUserRepository implements UserRepository {
  private get users() {
    return getPrismaClient().user;
  }

  findByGoogleSub(googleSub: string) {
    return this.users.findUnique({ where: { googleSub } });
  }

  findByEmail(email: string) {
    return this.users.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.users.findUnique({ where: { id } });
  }

  updateGoogleUser(id: string, identity: GoogleIdentity) {
    return this.users.update({ where: { id }, data: { googleSub: identity.googleSub, email: identity.email, name: identity.name, pictureUrl: identity.pictureUrl } });
  }

  createGoogleUser(identity: GoogleIdentity) {
    return this.users.create({ data: { id: randomUUID(), googleSub: identity.googleSub, email: identity.email, name: identity.name, pictureUrl: identity.pictureUrl } });
  }
}
