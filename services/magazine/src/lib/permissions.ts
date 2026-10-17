import { useRpcQuery } from './query';

export function useUserPermissions() {
  const config = useRpcQuery<{ loginUrl: string; erpUrl: string }>(
    ['magazine-auth-config'], () => fetch('/magazine-api/auth-config'), { retry: false },
  );
  const query = useRpcQuery<{ isAdmin: boolean; isEditor: boolean; user: { name: string } }>(
    ['magazine-session'], () => fetch('/magazine-api/session'), { retry: false, staleTime: 0 },
  );
  return { isAdmin: query.data?.isAdmin ?? false, canManageMagazine: query.data?.isEditor ?? false,
    isLoading: query.isLoading, error: query.error, user: query.data?.user,
    loginUrl: config.data?.loginUrl, erpUrl: config.data?.erpUrl,
    retry: () => { void query.refetch(); void config.refetch(); } };
}
