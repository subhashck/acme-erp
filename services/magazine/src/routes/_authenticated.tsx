import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useUserPermissions } from '@/lib/permissions';
import { RpcError } from '@/lib/query';
export const Route = createFileRoute('/_authenticated')({ component: EditorLayout });
function EditorLayout() {
  const { isLoading, error, canManageMagazine, user, loginUrl, erpUrl, retry } = useUserPermissions();
  if (isLoading) return <main className="p-8">Checking editorial access…</main>;
  if (error) {
    const signedOut = error instanceof RpcError && error.status === 401;
    return <main className="p-8 space-y-4"><h1>{signedOut ? 'Magazine sign-in' : 'Magazine is unavailable'}</h1><p>{error.message}</p>
      {signedOut && loginUrl && <a className="inline-flex min-h-11 items-center underline" href={loginUrl}>Sign in to ERP</a>}
      <button className="block min-h-11 underline" onClick={retry}>Try again</button></main>;
  }
  if (!canManageMagazine) return <main className="p-8">Magazine editor access is required. Contact an ERP administrator.</main>;
  return <div className="min-h-screen bg-background text-foreground"><header className="border-b p-4 flex flex-wrap justify-between gap-4">
    <a href="/magazine/admin" className="font-bold">ACME Magazine</a><nav className="flex flex-wrap gap-4">
      <span>{user?.name}</span><a href="/magazine">Published issues</a>{erpUrl && <a href={erpUrl}>ERP</a>}
    </nav></header><main className="mx-auto max-w-[1600px] p-4 md:p-8"><Outlet /></main></div>;
}
