export type AuthUser = {
  id: string;
  googleSub: string | null;
  email: string;
  name: string;
  pictureUrl: string | null;
};

export type PublicUser = Pick<AuthUser, "id" | "email" | "name" | "pictureUrl">;
