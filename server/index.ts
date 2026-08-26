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
import { magazineIssues, magazineSections } from "./db/schema-magazine.ts";
import { renderMagazineHtml } from "./services/magazine-ssr.ts";
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

import { getHospitalSettingsFromDb } from "./services/hospital-settings.ts";

// ---------------------------------------------------------------------------
// Public Server-Side Rendered (SSR) Electronic Magazine Reader
// ---------------------------------------------------------------------------
async function renderMagazineSsr(c: any) {
  const slug = c.req.param("slug");

  // Slug validation regex
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return c.html(
      `<!DOCTYPE html><html><head><title>Invalid Request</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;color:#334155;}</style></head><body><h1>400 - Invalid Issue Slug</h1><p>The magazine slug format is invalid.</p></body></html>`,
      400
    );
  }

  const [issue] = await db
    .select()
    .from(magazineIssues)
    .where(eq(magazineIssues.slug, slug))
    .limit(1);

  if (!issue || issue.status !== "published") {
    return c.html(
      `<!DOCTYPE html><html><head><title>Magazine Issue Not Found</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;color:#334155;}a{color:#0284c7;text-decoration:none;font-weight:600;}</style></head><body><h1>404 - Magazine Issue Not Found</h1><p>The requested monthly edition is not published or does not exist.</p><p><a href="/">Return to Home</a></p></body></html>`,
      404
    );
  }

  const sections = await db
    .select({
      id: magazineSections.id,
      title: magazineSections.title,
      subtitle: magazineSections.subtitle,
      authorName: magazineSections.authorName,
      authorRole: magazineSections.authorRole,
      contentHtml: magazineSections.contentHtml,
      sortOrder: magazineSections.sortOrder,
    })
    .from(magazineSections)
    .where(eq(magazineSections.issueId, issue.id))
    .orderBy(magazineSections.sortOrder, magazineSections.id);

  const hospital = await getHospitalSettingsFromDb();

  const html = renderMagazineHtml(issue as any, sections as any, hospital as any);
  return c.html(html);
}

app.get("/magazine/view/:slug", renderMagazineSsr);
app.get("/magazine/ssr/:slug", renderMagazineSsr);
app.get("/magazine/:slug", renderMagazineSsr);

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
  });
}

export type { AppType } from "./routes.ts";
