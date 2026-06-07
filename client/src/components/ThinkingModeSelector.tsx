import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ThinkingModeInfo {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  color: string;         // Tailwind text colour class
  activeBg: string;     // Tailwind bg class for active state
  activeBorder: string; // Tailwind border class for active state
}

export const THINKING_MODES_CLIENT: ThinkingModeInfo[] = [
  { id: "default",          label: "ARYA",             emoji: "🤝", tagline: "Your thinking companion",          color: "text-emerald-400", activeBg: "bg-emerald-400/10",  activeBorder: "border-emerald-400/30" },
  { id: "founder",          label: "Founder",          emoji: "🔥", tagline: "Uncomfortable truth first",        color: "text-red-400",     activeBg: "bg-red-400/10",      activeBorder: "border-red-400/30"     },
  { id: "devil",            label: "Devil's Advocate", emoji: "😈", tagline: "Destroy before launch",            color: "text-purple-400",  activeBg: "bg-purple-400/10",   activeBorder: "border-purple-400/30"  },
  { id: "first_principles", label: "First Principles", emoji: "🔬", tagline: "Strip to what is true",            color: "text-blue-400",    activeBg: "bg-blue-400/10",     activeBorder: "border-blue-400/30"    },
  { id: "therapist",        label: "Therapist",        emoji: "🧠", tagline: "What fear is blocking you?",       color: "text-amber-400",   activeBg: "bg-amber-400/10",    activeBorder: "border-amber-400/30"   },
  { id: "contrarian",       label: "Contrarian",       emoji: "⚡", tagline: "Bet against consensus",             color: "text-yellow-300",  activeBg: "bg-yellow-300/10",   activeBorder: "border-yellow-300/30"  },
  { id: "chain",            label: "Full Chain",       emoji: "🔗", tagline: "All 5 lenses together",            color: "text-cyan-400",    activeBg: "bg-cyan-400/10",     activeBorder: "border-cyan-400/30"    },
];

interface Props {
  activeMode: string;
  onChange: (modeId: string) => void;
  className?: string;
}

export default function ThinkingModeSelector({ activeMode, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = THINKING_MODES_CLIENT.find(m => m.id === activeMode) || THINKING_MODES_CLIENT[0];
  const isNonDefault = activeMode !== "default";

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger pill */}
      <button
        data-testid="button-thinking-mode"
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium
          transition-all duration-200 select-none
          ${isNonDefault
            ? `${active.activeBg} ${active.activeBorder} ${active.color}`
            : "bg-gray-100 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
          }
        `}
      >
        <span className="text-sm leading-none">{active.emoji}</span>
        <span>{active.label}</span>
        <span className="opacity-50 text-[10px]">{open ? "▴" : "▾"}</span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-72 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
          >
            <p className="text-[10px] tracking-widest uppercase text-gray-400 dark:text-slate-500 px-4 pt-3 pb-2">
              Thinking Mode
            </p>

            {THINKING_MODES_CLIENT.map(mode => (
              <button
                key={mode.id}
                data-testid={`button-mode-${mode.id}`}
                onClick={() => { onChange(mode.id); setOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${activeMode === mode.id
                    ? `${mode.activeBg} ${mode.color}`
                    : "hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-slate-300"
                  }
                `}
              >
                <span className="text-xl w-7 text-center flex-shrink-0">{mode.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${activeMode === mode.id ? mode.color : ""}`}>
                    {mode.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight mt-0.5 truncate">
                    {mode.tagline}
                  </p>
                </div>
                {activeMode === mode.id && (
                  <span className={`text-xs flex-shrink-0 ${mode.color}`}>✓</span>
                )}
              </button>
            ))}

            {isNonDefault && (
              <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-2">
                <button
                  onClick={() => { onChange("default"); setOpen(false); }}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
                >
                  Reset to default ARYA
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
