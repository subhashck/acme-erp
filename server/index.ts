import { startPushWorker } from "./services/push.ts";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth, type AuthEnv } from "./auth.ts";
import { db } from "./db/client.ts";
import { user } from "./db/schema.ts";
import { api } from "./routes.ts";
import { publicRoutes } from "./routes/public.ts";
import { serveStatic } from "@hono/node-server/serve-static";

export const app = new Hono<AuthEnv>();

app.use(trimTrailingSlash());

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof z.ZodError) {
    const message = err.issues.map((i) => i.message).join(", ");
    return c.json({ error: message }, 400);
  }
  console.error("Unhandled server error:", err);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => origin,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);

// Mount public (unauthenticated) API routes BEFORE the auth middleware
app.route("/api", publicRoutes);

app.use("/api/*", async (c, next) => {
  // Auth endpoints: delegate directly to better-auth and return its response
  if (c.req.path.startsWith("/api/auth/")) {
    let req = c.req.raw;
    const proto = c.req.header("x-forwarded-proto");
    const host = c.req.header("x-forwarded-host") || c.req.header("host");
    if (proto && host) {
      const url = new URL(c.req.raw.url);
      url.protocol = proto + ":";
      url.host = host;
      req = new Request(url.toString(), c.req.raw);
    }
    return auth.handler(req);
  }
  // Public API routes: skip session check
  if (c.req.path.startsWith("/api/public/")) {
    return next();
  }
  // Test environment: resolve test admin session when x-test-admin header is provided
  if (process.env.NODE_ENV === "test" && c.req.header("x-test-admin") === "true") {
    const [adminUser] = await db.select().from(user).where(eq(user.role, "admin")).limit(1);
    if (adminUser) {
      c.set("session", {
        session: {
          id: "test-admin-session-id",
          userId: adminUser.id,
          expiresAt: new Date(Date.now() + 86400000),
          token: "test-admin-token",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          ...adminUser,
          role: "admin",
          banned: false,
          banReason: null,
          banExpires: null,
          mustChangePassword: false,
        },
      } as any);
      return next();
    }
  }

  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", session);
  await next();
});
app.route("/api", api);

// Custom 404 handler: Ensure /api/* routes NEVER fall through to serve index.html
app.notFound(async (c) => {
  if (c.req.path.startsWith("/api")) {
    return c.json({ error: `API route not found: ${c.req.method} ${c.req.path}` }, 404);
  }
  if (c.req.method === "GET" || c.req.method === "HEAD") {
    const res = await serveStatic({ root: "dist", path: "index.html" })(c, async () => {});
    if (res) return res;
  }
  return c.json({ error: "Not Found" }, 404);
});

// Serve static assets (js, css, images) from the Vite build directory for non-API GET requests
// Browsers must revalidate these files so installed apps discover new deployments.
app.use("*", async (c, next) => {
  if (["/sw.js", "/push-sw.js", "/manifest.webmanifest", "/", "/index.html"].includes(c.req.path)) {
    c.header("Cache-Control", "no-cache");
  }
  await next();
});

app.use(
  "*",
  async (c, next) => {
    if (c.req.path.startsWith("/api")) {
      return next();
    }
    return serveStatic({ root: "dist" })(c, next);
  }
);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
    console.log(`Hono API listening on http://localhost:${info.port}`);
    startPushWorker();

    // Clean up any stale 'running' sync log entries from a previous crashed server
    import("./services/docterz.ts")
      .then(({ resetStuckSync }) => resetStuckSync())
      .catch((err) => console.warn("[Docterz] Startup reset failed:", err.message));

    // ─── Docterz Patient Auto-Sync Scheduler ─────────────────────────────────
    // Polls every 5 minutes. If auto-sync is enabled and the configured interval
    // has elapsed since the last finished sync, triggers a new sync in the background.
    const POLL_MS = 5 * 60 * 1000; // 5 minutes

    setInterval(async () => {
      try {
        const { getDocterzSyncStatus, syncDocterzPatients } = await import("./services/docterz.ts");
        const status = await getDocterzSyncStatus().catch(() => null);
        if (!status || !status.syncEnabled) return;

        const intervalMs = (status.syncIntervalMinutes || 60) * 60 * 1000;
        const lastFinished = status.latestLog?.finishedAt
          ? new Date(status.latestLog.finishedAt).getTime()
          : 0;
        const isRunning = status.latestLog?.status === "running";

        if (!isRunning && Date.now() - lastFinished >= intervalMs) {
          console.log("[Docterz Auto-Sync] Triggering scheduled patient sync...");
          syncDocterzPatients("auto")
            .then((r) => {
              console.log(
                `[Docterz Auto-Sync] Done — ${r.newRecords} new, ${r.updatedRecords} updated, ${r.totalFetched} total`
              );
            })
            .catch((err) => {
              console.error("[Docterz Auto-Sync] Error:", err.message);
            });
        }
      } catch (err: any) {
        console.error("[Docterz Auto-Sync] Scheduler error:", err.message);
      }
    }, POLL_MS);
    // ─────────────────────────────────────────────────────────────────────────
  });
}

export type { AppType } from "./routes.ts";
