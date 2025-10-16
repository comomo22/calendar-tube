import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      googleId: string;
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    } & DefaultSession["user"];
  }

  interface User {
    googleId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
