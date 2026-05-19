import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BookOpen, SlidersHorizontal, Brain, Users, Lock, Megaphone, X } from "lucide-react";
import { getTranslation, getStoredUiLanguage } from "@/lib/i18n";

interface MoreTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomize?: () => void;
}

export default function MoreTray({ isOpen, onClose, onOpenCustomize }: MoreTrayProps) {
  const [, setLocation] = useLocation();
  const lang = getStoredUiLanguage();
  const t = (key: string) => getTranslation(lang, key as any);

  const mainFeatures = [
    {
      icon: <Activity size={22} />,
      emoji: "🫁",
      label: "Prana",
      sub: t("more_prana_sub"),
      color: "#22c55e",
      action: () => setLocation("/prana"),
    },
    {
      icon: <BookOpen size={22} />,
      emoji: "📖",
      label: "Review",
      sub: t("more_review_sub"),
      color: "#f59e0b",
      action: () => setLocation("/review"),
    },
    {
      icon: <SlidersHorizontal size={22} />,
      emoji: "🎨",
      label: t("customize_arya") || "Customize",
      sub: t("more_customize_sub"),
      color: "#a855f7",
      action: () => {
        if (onOpenCustomize) {
          onOpenCustomize();
        } else {
          window.dispatchEvent(new CustomEvent("arya-open-customize"));
        }
      },
    },
    {
      icon: <Brain size={22} />,
      emoji: "🧠",
      label: t("memory") || "Memory",
      sub: t("more_memory_sub"),
      color: "#6366f1",
      action: () => window.dispatchEvent(new CustomEvent("arya-open-memory")),
    },
    {
      icon: <Users size={22} />,
      emoji: "👥",
      label: t("community") || "Community",
      sub: t("more_community_sub"),
      color: "#ef4444",
      action: () => setLocation("/community"),
    },
  ];

  const utilityLinks = [
    {
      icon: <Lock size={15} />,
      label: t("menu_privacy") || "Privacy & Control",
      action: () => setLocation("/privacy-control"),
    },
    {
      icon: <Megaphone size={15} />,
      label: t("menu_report") || "Report an Issue",
      action: () => window.dispatchEvent(new CustomEvent("arya-open-report")),
    },
  ];

  function handleItem(action: () => void) {
    onClose();
    // small delay so the tray animates out before navigating
    setTimeout(action, 80);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="more-tray-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 90,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* Tray sheet */}
          <motion.div
            key="more-tray-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            style={{
              position: "fixed",
              bottom: 0, left: 0, right: 0,
              zIndex: 91,
              background: "rgba(10, 10, 20, 0.97)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px 20px 0 0",
              paddingBottom: "env(safe-area-inset-bottom, 20px)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.18)",
              margin: "12px auto 0",
            }} />

            {/* Header row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px 6px",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                fontFamily: "Inter, sans-serif",
              }}>
                {t("more_title") || "ARYA FEATURES"}
              </span>
              <button
                onClick={onClose}
                data-testid="more-tray-close"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none", borderRadius: 8,
                  color: "rgba(255,255,255,0.45)",
                  width: 28, height: 28,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Main features */}
            <div style={{ padding: "4px 10px 0" }}>
              {mainFeatures.map((item) => (
                <button
                  key={item.label}
                  data-testid={`more-tray-item-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                  onClick={() => handleItem(item.action)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    width: "100%", padding: "11px 10px",
                    borderRadius: 14, border: "none",
                    background: "transparent",
                    cursor: "pointer", textAlign: "start",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Icon bubble */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${item.color}1a`,
                    border: `1px solid ${item.color}33`,
                    color: item.color,
                  }}>
                    {item.icon}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{
                      fontSize: 15, fontWeight: 600,
                      color: "rgba(255,255,255,0.92)",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {item.sub}
                    </span>
                  </div>

                  {/* Arrow */}
                  <span style={{
                    fontSize: 18,
                    color: "rgba(255,255,255,0.2)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    ›
                  </span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: "rgba(255,255,255,0.07)",
              margin: "8px 18px",
            }} />

            {/* Utility links */}
            <div style={{
              padding: "4px 10px 12px",
              display: "flex", gap: 8,
            }}>
              {utilityLinks.map((item) => (
                <button
                  key={item.label}
                  data-testid={`more-tray-util-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                  onClick={() => handleItem(item.action)}
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 7, padding: "11px 8px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
