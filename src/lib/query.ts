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

export function useRpcQuery<T>(key: readonly unknown[], fn: () => Promise<Response>, options?: any) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: async () => {
      const response = await fn();
      if (!response.ok) throw new Error(await response.text());
      return (await response.json()) as T;
    },
    ...options
  });
}
