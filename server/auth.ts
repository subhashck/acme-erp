import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { pool } from "./db/client.ts";

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8787",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-dev-secret-change-me",
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:8787", "http://localhost:5173"],
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    admin({
      defaultRole: "staff",
      adminRoles: ["admin"]
    })
  ]
});

export type AuthSession = typeof auth.$Infer.Session;

export type AuthEnv = {
  Variables: {
    session: Exclude<Awaited<ReturnType<typeof auth.api.getSession>>, null>;
  };
};
