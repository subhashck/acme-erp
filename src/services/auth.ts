import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:8787",
  basePath: "/api/auth",
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
  plugins: [
    adminClient({
      roles: {
        admin: {} as any,
        hr: {} as any,
        staff: {} as any
      }
    }),
    inferAdditionalFields({
      user: {
        mustChangePassword: { type: "boolean" }
      }
    })
  ]
});
