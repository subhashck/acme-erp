import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth, type AuthEnv } from "./auth.ts";
import { api } from "./routes.ts";

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

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));
app.use("/api/*", async (c, next) => {
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

serve({ fetch: app.fetch, port: 8787 }, (info) => {
  console.log(`Hono API listening on http://localhost:${info.port}`);
});

export type { AppType } from "./routes.ts";
