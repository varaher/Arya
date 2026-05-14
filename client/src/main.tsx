import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {

      // If there's already a waiting worker when the page loads, notify immediately
      if (reg.waiting) {
        window.dispatchEvent(new CustomEvent('sw-update-ready', { detail: { registration: reg } }));
      }

      // Watch for a new worker reaching the 'waiting' state
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // A new version is staged and ready — tell the app
            window.dispatchEvent(new CustomEvent('sw-update-ready', { detail: { registration: reg } }));
          }
        });
      });

      // Poll for updates every 30 minutes while the tab stays open
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

      // Also check for updates whenever the user comes back to the app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });

    }).catch(() => {});

    // When skipWaiting resolves and the controller changes, reload cleanly
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
