import type { Request } from "express";

export type AuthUser = {
  id: number;
  username: string;
};

export type AuthedRequest = Request & {
  user?: AuthUser;
};
