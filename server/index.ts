import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth, type AuthEnv } from "./auth.ts";
import { api } from "./routes.ts";
import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono<AuthEnv>();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);

app.use("/api/*", async (c, next) => {
  // Auth endpoints: delegate directly to better-auth and return its response
  if (c.req.path.startsWith("/api/auth/")) {
    return auth.handler(c.req.raw);
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
// app.use(
//   "*",
//   serveStatic({
//     root: "dist",
//   })
// );

// // Fallback: Serve index.html for Single Page Application (SPA) routing
// app.use(
//   "/*",
//   serveStatic({
//     root: "dist",
//     path: "index.html",
//   })
// );



serve({ fetch: app.fetch, port: 8787 }, (info) => {
  console.log(`Hono API listening on http://localhost:${info.port}`);
});

export type { AppType } from "./routes.ts";
