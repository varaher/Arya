import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { House, MessageCircle, UserRound } from "lucide-react";
import MoreTray from "./MoreTray";
import { GlassDock, VoiceLaunch } from "@/design-system/components";

interface BottomNavProps {
  onOpenCustomize?: () => void;
}

type PrimaryTab = "home" | "talk" | "you";

function dispatchAryaEvent(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

export default function BottomNav({ onOpenCustomize }: BottomNavProps = {}) {
  const [location, setLocation] = useLocation();
  const [moreTrayOpen, setMoreTrayOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PrimaryTab>("home");

  useEffect(() => {
    if (location !== "/") setActiveTab("you");
    else if (!moreTrayOpen) setActiveTab("home");
  }, [location, moreTrayOpen]);

  function openHome(destination: "home" | "talk" | "voice") {
    setMoreTrayOpen(false);
    setActiveTab(destination === "voice" ? "talk" : destination);
    const eventName = destination === "home" ? "arya:go-home"
      : destination === "talk" ? "arya:go-talk"
      : "arya:launch-voice";

    if (location === "/") {
      dispatchAryaEvent(eventName);
      return;
    }

    setLocation("/");
    window.setTimeout(() => dispatchAryaEvent(eventName), 350);
  }

  return (
    <>
      <div
        className="fixed left-3 right-3 z-[60] mx-auto flex max-w-lg items-center gap-2.5"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <GlassDock
          aria-label="Primary navigation"
          className="flex h-[66px] min-w-0 flex-1 items-center justify-around rounded-full px-1.5"
        >
          <button
            type="button"
            onClick={() => openHome("home")}
            aria-current={activeTab === "home" ? "page" : undefined}
            className={`flex min-h-12 min-w-[68px] flex-col items-center justify-center gap-1 rounded-full px-3 text-xs transition-colors ${
              activeTab === "home"
                ? "bg-[var(--arya-primary-soft)] font-semibold text-[var(--arya-primary)]"
                : "text-[var(--arya-text-muted)] hover:text-[var(--arya-text)]"
            }`}
            data-testid="bottom-nav-home"
          >
            <House aria-hidden="true" className="size-5" strokeWidth={activeTab === "home" ? 2.2 : 1.7} />
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => openHome("talk")}
            aria-current={activeTab === "talk" ? "page" : undefined}
            className={`flex min-h-12 min-w-[68px] flex-col items-center justify-center gap-1 rounded-full px-3 text-xs transition-colors ${
              activeTab === "talk"
                ? "bg-[var(--arya-primary-soft)] font-semibold text-[var(--arya-primary)]"
                : "text-[var(--arya-text-muted)] hover:text-[var(--arya-text)]"
            }`}
            data-testid="bottom-nav-talk"
          >
            <MessageCircle aria-hidden="true" className="size-5" strokeWidth={activeTab === "talk" ? 2.2 : 1.7} />
            <span>Talk</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("you");
              setMoreTrayOpen(true);
            }}
            aria-expanded={moreTrayOpen}
            aria-haspopup="dialog"
            className={`flex min-h-12 min-w-[68px] flex-col items-center justify-center gap-1 rounded-full px-3 text-xs transition-colors ${
              activeTab === "you"
                ? "bg-[var(--arya-primary-soft)] font-semibold text-[var(--arya-primary)]"
                : "text-[var(--arya-text-muted)] hover:text-[var(--arya-text)]"
            }`}
            data-testid="bottom-nav-you"
          >
            <UserRound aria-hidden="true" className="size-5" strokeWidth={activeTab === "you" ? 2.2 : 1.7} />
            <span>You</span>
          </button>
        </GlassDock>
        <VoiceLaunch
          onClick={() => openHome("voice")}
          className="size-[54px] shrink-0"
        />
      </div>

      <MoreTray
        isOpen={moreTrayOpen}
        onClose={() => setMoreTrayOpen(false)}
        onOpenCustomize={onOpenCustomize}
      />
    </>
  );
}
