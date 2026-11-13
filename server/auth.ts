import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, customSession } from "better-auth/plugins";
import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "./db/client.ts";
import { account, staff, user as userTable } from "./db/schema.ts";
import { doctorProfiles, moduleUsers } from "./db/schema-doctor-cbt.ts";
import { verifyAndAuthorizeGoogleUser } from "./services/doctor-cbt-auth.ts";

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
        mapProfileToUser: async (profile) => {
          const authResult = await verifyAndAuthorizeGoogleUser(profile);
          if (!authResult.authorized || !authResult.user) {
            const code = authResult.code || "user_not_found";
            const reason = authResult.reason || "This Google account is not configured in Doctor CBT or Hospital Staff directory.";
            throw new APIError("FOUND", undefined, new Headers({
              location: `/login?error=${encodeURIComponent(code)}&error_description=${encodeURIComponent(reason)}`
            }));
          }
          return {
            ...authResult.user,
            mustChangePassword: false,
          };
        },
      }
    }
  } : {}),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
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
    customSession(async ({ user, session }) => {
      let mustChange = (user as any).mustChangePassword ?? false;
      try {
        const cleanEmail = (user?.email ?? "").trim().toLowerCase();
        if (cleanEmail && user?.id) {
          // If the user signed in with Google or is a doctor candidate, do NOT force password entry
          const [googleAccount] = await db
            .select({ id: account.id })
            .from(account)
            .where(and(eq(account.userId, user.id), eq(account.providerId, "google")))
            .limit(1);

          const isCandidate = (user as any).role === "doctor_candidate";

          if ((googleAccount || isCandidate) && mustChange) {
            await db
              .update(userTable)
              .set({ mustChangePassword: false, updatedAt: new Date() })
              .where(eq(userTable.id, user.id));
            mustChange = false;
          }

          // Link doctor_profiles if userId is not set or differs
          await db
            .update(doctorProfiles)
            .set({ userId: user.id })
            .where(
              and(
                sql`LOWER(TRIM(${doctorProfiles.email})) = ${cleanEmail}`,
                sql`(${doctorProfiles.userId} IS NULL OR ${doctorProfiles.userId} != ${user.id})`
              )
            );

          // Link module_users if userId is not set or differs
          await db
            .update(moduleUsers)
            .set({ userId: user.id })
            .where(
              and(
                sql`LOWER(TRIM(${moduleUsers.email})) = ${cleanEmail}`,
                sql`(${moduleUsers.userId} IS NULL OR ${moduleUsers.userId} != ${user.id})`
              )
            );

          // Link staff if userId is not set or differs
          await db
            .update(staff)
            .set({ userId: user.id })
            .where(
              and(
                sql`LOWER(TRIM(${staff.email})) = ${cleanEmail}`,
                sql`(${staff.userId} IS NULL OR ${staff.userId} != ${user.id})`
              )
            );
        }
      } catch (err) {
        console.error("Failed to synchronize user id to profiles on session:", err);
      }

      return {
        ...session,
        user: {
          ...user,
          role: (user as any).role as string | null,
          banned: (user as any).banned as boolean | null,
          banReason: (user as any).banReason as string | null,
          banExpires: (user as any).banExpires as Date | null,
          mustChangePassword: mustChange
        }
      };
    })
  ]
});

export type AuthSession = typeof auth.$Infer.Session;

export type AuthEnv = {
  Variables: {
    session: Exclude<Awaited<ReturnType<typeof auth.api.getSession>>, null>;
  };
};
