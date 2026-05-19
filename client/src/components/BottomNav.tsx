import { useState } from "react";
import { useLocation } from "wouter";
import { House, Target, Scale, Star, MoreHorizontal } from "lucide-react";
import MoreTray from "./MoreTray";
import { getTranslation, getStoredUiLanguage } from "@/lib/i18n";

interface BottomNavProps {
  onOpenCustomize?: () => void;
}

export default function BottomNav({ onOpenCustomize }: BottomNavProps = {}) {
  const [location, setLocation] = useLocation();
  const [moreTrayOpen, setMoreTrayOpen] = useState(false);
  const lang = getStoredUiLanguage();
  const t = (key: string, fallback: string) => {
    const result = getTranslation(lang, key as any);
    return result === key ? fallback : result;
  };

  function handleNav(path: string) {
    setLocation(path);
  }

  return (
    <>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60,
        background: "rgba(8, 8, 16, 0.97)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {[
          { path: "/",           label: t("nav_home", "Home"),  Icon: House },
          { path: "/my-goals",   label: t("goals", "Goals"),    Icon: Target },
          { path: "/vedic-lens", label: "KAAL",                 Icon: Star },
          { path: "/niti",       label: "Niti",                 Icon: Scale },
        ].map(({ path, label, Icon }) => {
          const active = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <button
              key={label}
              onClick={() => handleNav(path)}
              data-testid={`bottom-nav-${label.toLowerCase()}`}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, padding: "8px 4px 10px",
                border: "none", background: "transparent",
                color: active ? "#f5a623" : "rgba(255,255,255,0.55)",
                cursor: "pointer", transition: "color 0.18s",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.7} />
              <span style={{
                fontSize: 9, fontFamily: "Inter, sans-serif",
                letterSpacing: "0.03em", fontWeight: active ? 600 : 400,
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreTrayOpen(true)}
          data-testid="bottom-nav-more"
          style={{
            flex: 1,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, padding: "8px 4px 10px",
            border: "none", background: "transparent",
            color: moreTrayOpen ? "#f5a623" : "rgba(255,255,255,0.55)",
            cursor: "pointer", transition: "color 0.18s",
          }}
        >
          <MoreHorizontal size={18} strokeWidth={1.7} />
          <span style={{
            fontSize: 9, fontFamily: "Inter, sans-serif",
            letterSpacing: "0.03em", fontWeight: 400,
            whiteSpace: "nowrap",
          }}>
            More
          </span>
        </button>
      </div>

      <MoreTray
        isOpen={moreTrayOpen}
        onClose={() => setMoreTrayOpen(false)}
        onOpenCustomize={onOpenCustomize}
      />
    </>
  );
}
