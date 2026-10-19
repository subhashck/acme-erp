import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Download, RefreshCw, WifiOff, ServerOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../ui/button";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallContext = createContext<{ available: boolean; nativePrompt: boolean; install: () => void }>({
  available: false,
  nativePrompt: false,
  install: () => {}
});

export function PwaInstallButton() {
  const { available, nativePrompt, install } = useContext(InstallContext);
  if (!available) return null;
  return (
    <Button variant="outline" className="min-h-11 print:hidden" onClick={install}>
      <Download size={16} aria-hidden="true" /> {nativePrompt ? "Install app" : "How to install"}
    </Button>
  );
}

export function PwaInstallHelp() {
  const { available, install } = useContext(InstallContext);
  if (!available) return null;
  return <Button variant="outline" className="min-h-11 w-full" onClick={install}><Download size={16} aria-hidden="true" />Install ACME ERP</Button>;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [serverAvailable, setServerAvailable] = useState(true);
  const [checkingServer, setCheckingServer] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) {
      console.error("PWA registration failed:", error);
    }
  });

  const checkServer = async (manual = false) => {
    if (!navigator.onLine) {
      setOnline(false);
      return;
    }
    if (manual) setCheckingServer(true);
    try {
      // 401 is expected when signed out; any response below 500 proves the API is reachable.
      const response = await fetch("/api/auth/get-session", {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      setServerAvailable(response.status < 500);
    } catch {
      setServerAvailable(false);
    } finally {
      if (manual) setCheckingServer(false);
    }
  };

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const syncInstalled = () => setInstalled(standalone.matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    syncInstalled();
    setIsSecureContext(window.isSecureContext);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistration("/").then(registration => {
        setServiceWorkerReady(Boolean(registration?.active));
      }).catch(() => setServiceWorkerReady(false));
    }
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIos(isIos);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      setShowInstallHelp(false);
    };
    const didInstall = () => {
      setInstalled(true);
      setPrompt(null);
      setShowInstallHelp(false);
    };
    const syncOnline = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) void checkServer();
    };
    void checkServer();
    const serverCheckTimer = window.setInterval(() => void checkServer(), 15000);
    // Check on returning to the app, without reloading an active form.
    const checkUpdate = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void navigator.serviceWorker?.getRegistration().then(registration => registration?.update())
          .catch(error => console.warn("PWA update check failed:", error));
      }
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", didInstall);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    const syncDisplayMode = () => {
      syncInstalled();
      if (standalone.matches) {
        setInstalled(true);
        setShowInstallHelp(false);
      }
    };
    standalone.addEventListener("change", syncDisplayMode);
    document.addEventListener("visibilitychange", checkUpdate);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", didInstall);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      window.clearInterval(serverCheckTimer);
      standalone.removeEventListener("change", syncDisplayMode);
      document.removeEventListener("visibilitychange", checkUpdate);
    };
  }, []);

  const install = () => {
    const installPrompt = prompt;
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    // Invoke the browser prompt synchronously from the click handler so its
    // user-activation requirement is preserved across browsers.
    const choice = installPrompt.prompt()
      .then(() => installPrompt.userChoice)
      .then(result => {
        if (result.outcome === "accepted") setShowInstallHelp(false);
      })
      .catch(error => {
        console.warn("PWA installation prompt failed:", error);
        setShowInstallHelp(true);
      })
      .finally(() => setPrompt(current => current === installPrompt ? null : current));
    void choice;
  };
  const update = async () => {
    setUpdating(true);
    setUpdateError("");
    try {
      await updateServiceWorker(true);
    } catch {
      setUpdateError("Update failed. Please try again when connected.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <InstallContext.Provider value={{ available: !installed && isSecureContext, nativePrompt: !!prompt, install }}>
      <div inert={!online || !serverAvailable || undefined}>{children}</div>
      {(!online || !serverAvailable) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-6 print:hidden">
          <section role="alert" aria-live="assertive" className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-lg">
            {!online
              ? <WifiOff className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
              : <ServerOff className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />}
            <h1 className="text-xl font-semibold">{!online ? "You’re offline" : "ERP server unavailable"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {!online
                ? "Reconnect to the internet to access hospital data and save changes. This page stays open, but unsaved work is not stored after you reload or close this window."
                : "The ERP server is not responding. Check your network or ask your administrator to check the server. This page stays open; unsaved changes have not been confirmed as saved."}
            </p>
            <Button className="mt-4 min-h-11" disabled={checkingServer} onClick={() => {
              setOnline(navigator.onLine);
              void checkServer(true);
            }}>
              <RefreshCw size={16} aria-hidden="true" className={checkingServer ? "animate-spin" : undefined} />
              {checkingServer ? "Checking…" : "Check connection"}
            </Button>
          </section>
        </div>
      )}
      {online && (needRefresh || showInstallHelp) && (
        <section role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-lg rounded-xl border bg-card p-4 text-card-foreground shadow-xl print:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{needRefresh ? "App update available" : "Install ACME ERP"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{needRefresh
                ? "Save your work, then reload to use the latest version."
                : !isSecureContext
                  ? "Installation requires HTTPS or localhost. Open the secure ERP address, then use your browser’s install option."
                  : !serviceWorkerReady
                    ? "The installable app is available in a production build. Start or deploy the production ERP server over HTTPS, then reload this page."
                    : ios ? "In Safari, tap Share, choose Add to Home Screen, then confirm."
                      : "This browser has no in-page install prompt. Open its menu and choose Install app or Add to Home Screen."}</p>
            </div>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Dismiss" onClick={() => { setNeedRefresh(false); setShowInstallHelp(false); }}><X size={18} /></Button>
          </div>
          {needRefresh && <Button className="mt-3 min-h-11" disabled={updating} onClick={update}><RefreshCw size={16} />{updating ? "Updating…" : "Reload and update"}</Button>}
          {updateError && <p role="alert" className="mt-2 text-sm text-destructive">{updateError}</p>}
        </section>
      )}
    </InstallContext.Provider>
  );
}
