import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth, type AuthEnv } from "./auth.ts";
import { api } from "./routes.ts";
import { publicRoutes } from "./routes/public.ts";
import { serveStatic } from "@hono/node-server/serve-static";

export const app = new Hono<AuthEnv>();

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

//Serve static assets (js, css, images) from the Vite build directory
app.use(
  "*",
  serveStatic({
    root: "dist",
  })
);

// Fallback: Serve index.html for Single Page Application (SPA) routing
app.use(
  "/*",
  serveStatic({
    root: "dist",
    path: "index.html",
  })
);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Hono API listening on http://localhost:${info.port}`);
});

export type { AppType } from "./routes.ts";
