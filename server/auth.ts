import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, customSession } from "better-auth/plugins";
import { pool } from "./db/client.ts";

let rawAuthUrl = process.env.BETTER_AUTH_URL;

if (!rawAuthUrl && process.env.RAILWAY_STATIC_URL) {
  rawAuthUrl = `https://${process.env.RAILWAY_STATIC_URL}`;
} else if (!rawAuthUrl && process.env.RAILWAY_PUBLIC_DOMAIN) {
  rawAuthUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

const cleanAuthUrl = (rawAuthUrl ?? "http://localhost:8787").trim().replace(/\/+$/, "");

const extraOrigins: string[] = [
  "http://localhost:5173",
  "https://*.trycloudflare.com",
  "http://*.trycloudflare.com",
  "*.trycloudflare.com",
];
if (process.env.RAILWAY_STATIC_URL) {
  extraOrigins.push(`https://${process.env.RAILWAY_STATIC_URL}`);
}
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  extraOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

const envOrigins = process.env.TRUSTED_ORIGINS
  ? process.env.TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  : [];

export const trustedOrigins = Array.from(
  new Set([cleanAuthUrl, ...extraOrigins, ...envOrigins].map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean))
);

export const auth = betterAuth({
  database: pool,
  baseURL: cleanAuthUrl,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-dev-secret-change-me",
  trustedOrigins,
  emailAndPassword: {
    enabled: true
  },
  ...(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim() ? {
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
        requireEmailVerification: true,
        disableImplicitSignUp: true,
        mapProfileToUser: (profile) => {
          const email = profile.email?.trim().toLowerCase() ?? "";
          if (!email.endsWith("@gmail.com") || profile.email_verified !== true) {
            throw new APIError("BAD_REQUEST", {
              message: "Use a verified Gmail address to connect or sign in.",
            });
          }
          return {
            email,
            name: profile.name,
            image: profile.picture,
            emailVerified: profile.email_verified,
          };
        },
      }
    }
  } : {}),
  account: {
    accountLinking: {
      // Users connect Google from their authenticated profile first.
      disableImplicitLinking: true,
    }
  },
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
        input: false
      }
    }
  },
  plugins: [
    admin({
      defaultRole: "staff",
      adminRoles: ["admin"]
    }),
    customSession(async ({ user, session }) => ({
      ...session,
      user: {
        ...user,
        role: (user as any).role as string | null,
        banned: (user as any).banned as boolean | null,
        banReason: (user as any).banReason as string | null,
        banExpires: (user as any).banExpires as Date | null,
        mustChangePassword: (user as any).mustChangePassword ?? false
      }
    }))
  ]
});

export type AuthSession = typeof auth.$Infer.Session;

export type AuthEnv = {
  Variables: {
    session: Exclude<Awaited<ReturnType<typeof auth.api.getSession>>, null>;
  };
};
