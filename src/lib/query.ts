import { useQuery } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";

type ApiErrorBody = { error?: unknown; message?: unknown };

export async function getApiErrorMessage(response: Response, fallback = "The request could not be completed.") {
  let body: ApiErrorBody | null = null;
  try {
    const parsed = await response.clone().json() as ApiErrorBody;
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    // Some proxy and server failures return HTML or an empty body.
  }

  const backendMessage = typeof body?.error === "string"
    ? body.error
    : typeof body?.message === "string" ? body.message : "";
  if (backendMessage.trim()) return backendMessage.trim();

  if (response.status === 401) return "Your session has expired. Sign in again and retry.";
  if (response.status === 403) return "You don’t have permission to do that.";
  if (response.status === 404) return "The requested record or page could not be found.";
  if (response.status === 408 || response.status === 504) return "The server took too long to respond. Please retry.";
  if (response.status === 429) return "Too many requests. Wait a moment and try again.";
  if (response.status >= 500) return "The server couldn’t complete the request. Please retry shortly.";
  if (!response.ok) return fallback;
  return fallback;
}

export function getNetworkErrorMessage(error: unknown) {
  if (error instanceof TypeError || (error instanceof Error && /fetch|network|load failed/i.test(error.message))) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

export function useRpcQuery<T>(key: readonly unknown[], fn: () => Promise<Response>, options?: any) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: async () => {
      try {
        const response = await fn();
        if (!response.ok) throw new Error(await getApiErrorMessage(response, "Could not load this information. Please retry."));
        try {
          return (await response.json()) as T;
        } catch {
          throw new Error("The server returned an unreadable response. Please retry.");
        }
      } catch (error) {
        if (error instanceof Error && !/fetch|network|load failed/i.test(error.message)) throw error;
        throw new Error(getNetworkErrorMessage(error));
      }
    },
    ...options
  });
}
