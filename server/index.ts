import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { auth, type AuthEnv } from "./auth.ts";
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

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Hono API listening on http://localhost:${info.port}`);
});

export type { AppType } from "./routes.ts";
