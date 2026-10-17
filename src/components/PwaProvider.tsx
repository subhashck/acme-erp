import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../ui/button";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallContext = createContext<{ available: boolean; install: () => void }>({
  available: false,
  install: () => {}
});

export function PwaInstallButton() {
  const { available, install } = useContext(InstallContext);
  if (!available) return null;
  return (
    <Button variant="outline" className="min-h-11 print:hidden" onClick={install}>
      <Download size={16} aria-hidden="true" /> Install app
    </Button>
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) {
      console.error("PWA registration failed:", error);
    }
  });

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const syncInstalled = () => setInstalled(standalone.matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    syncInstalled();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const didInstall = () => {
      setInstalled(true);
      setPrompt(null);
      setShowIosHelp(false);
    };
    const syncOnline = () => setOnline(navigator.onLine);
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
    standalone.addEventListener("change", syncInstalled);
    document.addEventListener("visibilitychange", checkUpdate);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", didInstall);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      standalone.removeEventListener("change", syncInstalled);
      document.removeEventListener("visibilitychange", checkUpdate);
    };
  }, []);

  const install = async () => {
    if (!prompt) {
      setShowIosHelp(true);
      return;
    }
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.warn("PWA installation prompt failed:", error);
    } finally {
      setPrompt(null);
    }
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
    <InstallContext.Provider value={{ available: !installed && window.isSecureContext && (!!prompt || ios), install }}>
      <div inert={!online || undefined}>{children}</div>
      {!online && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-6 print:hidden">
          <section role="alert" className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-lg">
            <WifiOff className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold">You’re offline</h1>
            <p className="mt-2 text-sm text-muted-foreground">Connect to the internet to access hospital data and save changes. Unsaved work in this window will stay here while you reconnect.</p>
            <Button className="mt-4 min-h-11" onClick={() => setOnline(navigator.onLine)}>Check connection</Button>
          </section>
        </div>
      )}
      {online && (needRefresh || showIosHelp) && (
        <section role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-lg rounded-xl border bg-card p-4 text-card-foreground shadow-xl print:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{needRefresh ? "App update available" : "Install ACME ERP"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{needRefresh
                ? "Save your work, then reload to use the latest version."
                : "In Safari, tap Share, then Add to Home Screen and confirm Add."}</p>
            </div>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Dismiss" onClick={() => { setNeedRefresh(false); setShowIosHelp(false); }}><X size={18} /></Button>
          </div>
          {needRefresh && <Button className="mt-3 min-h-11" disabled={updating} onClick={update}><RefreshCw size={16} />{updating ? "Updating…" : "Reload and update"}</Button>}
          {updateError && <p role="alert" className="mt-2 text-sm text-destructive">{updateError}</p>}
        </section>
      )}
    </InstallContext.Provider>
  );
}
