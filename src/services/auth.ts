import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:8787",
  basePath: "/api/auth",
  plugins: [
    adminClient({
      roles: {
        admin: {} as any,
        staff: {} as any
      }
    })
  ]
});
