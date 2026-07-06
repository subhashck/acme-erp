import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { pool } from "./db/client.ts";

let rawAuthUrl = process.env.BETTER_AUTH_URL;

if (!rawAuthUrl && process.env.RAILWAY_STATIC_URL) {
  rawAuthUrl = `https://${process.env.RAILWAY_STATIC_URL}`;
} else if (!rawAuthUrl && process.env.RAILWAY_PUBLIC_DOMAIN) {
  rawAuthUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

const cleanAuthUrl = (rawAuthUrl ?? "http://localhost:8787").replace(/\/$/, "");

const extraOrigins: string[] = ["http://localhost:5173"];
if (process.env.RAILWAY_STATIC_URL) {
  extraOrigins.push(`https://${process.env.RAILWAY_STATIC_URL}`);
}
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  extraOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}
extraOrigins.push("https://acme-erp-production.up.railway.app");

export const auth = betterAuth({
  database: pool,
  baseURL: cleanAuthUrl,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-dev-secret-change-me",
  trustedOrigins: [cleanAuthUrl, ...extraOrigins],
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
