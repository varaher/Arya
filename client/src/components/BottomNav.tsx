import { useLocation } from "wouter";
import { House, Target, Scale, Star, BookOpen } from "lucide-react";

const ITEMS = [
  { path: "/",           label: "Home",   Icon: House    },
  { path: "/my-goals",   label: "Goals",  Icon: Target   },
  { path: "/niti",       label: "Niti",   Icon: Scale    },
  { path: "/vedic-lens", label: "KAAL",   Icon: Star     },
  { path: "/review",     label: "Review", Icon: BookOpen },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60,
      background: "rgba(8, 8, 16, 0.97)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {ITEMS.map(({ path, label, Icon }) => {
        const active = path === "/" ? location === "/" : location.startsWith(path);
        return (
          <button
            key={path}
            onClick={() => setLocation(path)}
            data-testid={`bottom-nav-${label.toLowerCase()}`}
            style={{
              flex: 1,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4, padding: "10px 4px 12px",
              border: "none", background: "transparent",
              color: active ? "#f5a623" : "rgba(255,255,255,0.55)",
              cursor: "pointer", transition: "color 0.18s",
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.7} />
            <span style={{
              fontSize: 10, fontFamily: "Inter, sans-serif",
              letterSpacing: "0.03em", fontWeight: active ? 600 : 400,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
