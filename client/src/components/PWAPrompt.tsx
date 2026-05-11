import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, X } from "lucide-react";

type PromptMode = "install" | "update" | null;

function isRunningAsStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PWAPrompt() {
  const [mode, setMode] = useState<PromptMode>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // ── UPDATE DETECTION ──────────────────────────────────────────────────────
    const onUpdateReady = (e: Event) => {
      const reg = (e as CustomEvent).detail?.registration as ServiceWorkerRegistration;
      if (reg) setSwRegistration(reg);
      setMode("update");
    };
    window.addEventListener("sw-update-ready", onUpdateReady);

    // ── INSTALL PROMPT ────────────────────────────────────────────────────────
    // Only capture the prompt for users who have NOT installed the app yet
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Stop the browser's native mini-infobar
      if (isRunningAsStandalone()) return; // Already installed — never show install prompt
      const dismissed = localStorage.getItem("arya_pwa_install_dismissed");
      if (dismissed) return; // User already said "not now"
      setDeferredPrompt(e);
      setMode("install");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // If already running as installed PWA, don't show install banner on load
    if (isRunningAsStandalone()) {
      setMode(null);
    }

    return () => {
      window.removeEventListener("sw-update-ready", onUpdateReady);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.removeItem("arya_pwa_install_dismissed");
    }
    setDeferredPrompt(null);
    setMode(null);
  }, [deferredPrompt]);

  const handleUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      // controllerchange in main.tsx will trigger window.location.reload()
    }
  }, [swRegistration]);

  const handleDismiss = useCallback(() => {
    if (mode === "install") {
      localStorage.setItem("arya_pwa_install_dismissed", Date.now().toString());
    }
    setMode(null);
  }, [mode]);

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          key={mode}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
          role="banner"
          aria-label={mode === "update" ? "App update available" : "Install ARYA"}
        >
          <div className={`
            flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border
            ${mode === "update"
              ? "bg-cyan-950 border-cyan-700/60 text-cyan-50"
              : "bg-slate-900 border-slate-700/60 text-slate-100"
            }
          `}>
            {/* Icon */}
            <div className={`
              shrink-0 w-9 h-9 rounded-full flex items-center justify-center
              ${mode === "update" ? "bg-cyan-500/20" : "bg-emerald-500/20"}
            `}>
              {mode === "update"
                ? <RefreshCw className="w-4 h-4 text-cyan-400" />
                : <Download className="w-4 h-4 text-emerald-400" />
              }
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {mode === "update" ? (
                <>
                  <p className="text-sm font-semibold text-cyan-300 leading-tight">Update ready</p>
                  <p className="text-xs text-cyan-400/80 mt-0.5">ARYA has new features. Tap to apply.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-emerald-300 leading-tight">Add ARYA to home screen</p>
                  <p className="text-xs text-slate-400 mt-0.5">Works offline · No app store needed</p>
                </>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={mode === "update" ? handleUpdate : handleInstall}
              data-testid={mode === "update" ? "button-pwa-update" : "button-pwa-install"}
              className={`
                shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors
                ${mode === "update"
                  ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                  : "bg-emerald-500 hover:bg-emerald-400 text-white"
                }
              `}
            >
              {mode === "update" ? "Update" : "Install"}
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              data-testid="button-pwa-dismiss"
              aria-label="Dismiss"
              className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
