import { useLocation } from "wouter";
import { House, Target, Scale, Star, BookOpen, Activity, SlidersHorizontal } from "lucide-react";

const ITEMS = [
  { path: "/",           label: "Home",      Icon: House,             action: "nav"       },
  { path: "/my-goals",   label: "Goals",     Icon: Target,            action: "nav"       },
  { path: "/niti",       label: "Niti",      Icon: Scale,             action: "nav"       },
  { path: "/vedic-lens", label: "KAAL",      Icon: Star,              action: "nav"       },
  { path: "/prana",      label: "Prana",     Icon: Activity,          action: "nav"       },
  { path: "/review",     label: "Review",    Icon: BookOpen,          action: "nav"       },
  { path: "/",           label: "Customize", Icon: SlidersHorizontal, action: "customize" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  function handleClick(item: typeof ITEMS[0]) {
    if (item.action === "customize") {
      window.dispatchEvent(new CustomEvent("arya-open-customize"));
      if (location !== "/") setLocation("/");
      return;
    }
    setLocation(item.path);
  }

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60,
      background: "rgba(8, 8, 16, 0.97)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      overflowX: "auto",
      scrollbarWidth: "none",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {ITEMS.map(({ path, label, Icon, action }) => {
        const active = action === "customize"
          ? false
          : (path === "/" ? location === "/" : location.startsWith(path));
        return (
          <button
            key={label}
            onClick={() => handleClick({ path, label, Icon, action })}
            data-testid={`bottom-nav-${label.toLowerCase()}`}
            style={{
              flex: "1 0 auto",
              minWidth: 52,
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
    </div>
  );
}
