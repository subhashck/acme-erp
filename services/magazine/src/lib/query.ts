import { useQuery } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";

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

export class RpcError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'RpcError';
  }
}

export function useRpcQuery<T>(key: readonly unknown[], fn: () => Promise<Response>, options?: any) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: async () => {
      const response = await fn();
      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try { message = JSON.parse(text).error || text; } catch {}
        throw new RpcError(response.status, message || `Magazine service unavailable (HTTP ${response.status})`);
      }
      return (await response.json()) as T;
    },
    ...options
  });
}
