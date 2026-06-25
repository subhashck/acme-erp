import { hc } from "hono/client";
import { useQuery } from "@tanstack/react-query";
import type { AppType } from "../../server/routes";

export const client = hc<AppType>("/api");
export const api = { useQuery };
