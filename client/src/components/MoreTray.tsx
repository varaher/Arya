import type { ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  BookOpen,
  Brain,
  CalendarClock,
  ChevronRight,
  Clapperboard,
  Heart,
  Languages,
  Lock,
  Megaphone,
  MoonStar,
  Palette,
  Scale,
  Target,
  UserRound,
} from "lucide-react";
import { BottomSheet, SettingsRow, SurfaceCard } from "@/design-system/components";
import { getTranslation, getStoredUiLanguage } from "@/lib/i18n";

interface MoreTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomize?: () => void;
}

interface FeatureItem {
  icon: ReactNode;
  label: string;
  sub: string;
  action: () => void;
  accent?: "green" | "purple";
}

export default function MoreTray({ isOpen, onClose, onOpenCustomize }: MoreTrayProps) {
  const [location, setLocation] = useLocation();
  const lang = getStoredUiLanguage();
  const t = (key: string, fallback: string) => {
    const result = getTranslation(lang, key as any);
    return result === key ? fallback : result;
  };

  function afterClose(action: () => void) {
    onClose();
    window.setTimeout(action, 180);
  }

  function openAryaPanel(eventName: string) {
    afterClose(() => {
      if (location !== "/") setLocation("/");
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(eventName)), location === "/" ? 0 : 350);
    });
  }

  function go(path: string) {
    afterClose(() => setLocation(path));
  }

  const primaryItems: FeatureItem[] = [
    {
      icon: <Target className="size-5" />,
      label: "Intentions & reminders",
      sub: "Goals, habits, tasks, and reminders",
      action: () => go("/my-goals"),
    },
    {
      icon: <UserRound className="size-5" />,
      label: "Profile and plan",
      sub: "Personal details, membership, and settings",
      action: () => openAryaPanel("arya-open-profile"),
    },
    {
      icon: <CalendarClock className="size-5" />,
      label: "Reminder settings",
      sub: "Manage schedules and notifications",
      action: () => openAryaPanel("arya-open-reminders"),
    },
  ];

  const moreItems: FeatureItem[] = [
    { icon: <MoonStar className="size-5" />, label: "KAAL", sub: "Daily guidance", action: () => go("/vedic-lens") },
    { icon: <Scale className="size-5" />, label: "Niti", sub: "Decisions and principles", action: () => go("/niti") },
    { icon: <Activity className="size-5" />, label: "Prana", sub: t("more_prana_sub", "Health and wellbeing"), action: () => go("/prana") },
    { icon: <Clapperboard className="size-5" />, label: "Drishya", sub: "Stories and reflection", action: () => go("/drishya") },
    { icon: <BookOpen className="size-5" />, label: "Sunday Review", sub: t("more_review_sub", "A weekly moment to reflect"), action: () => go("/review") },
    { icon: <Palette className="size-5" />, label: t("customize_arya", "Customize ARYA"), sub: t("more_customize_sub", "Choose how ARYA feels"), action: () => onOpenCustomize ? afterClose(onOpenCustomize) : openAryaPanel("arya-open-customize") },
    { icon: <Brain className="size-5" />, label: t("memory", "Private memory"), sub: t("more_memory_sub", "Review what ARYA remembers"), action: () => openAryaPanel("arya-open-memory") },
    { icon: <Heart className="size-5" />, label: "Community", sub: t("more_community_sub", "Connect with others"), action: () => go("/community") },
    { icon: <Languages className="size-5" />, label: "Language", sub: "Change ARYA's language", action: () => go("/language") },
  ];

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="You"
      description="Your intentions, account, and ARYA features."
      className="max-h-[88dvh]"
    >
      <div className="space-y-5">
        <section aria-labelledby="you-account-heading">
          <h2 id="you-account-heading" className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--arya-text-subtle)]">
            Your account
          </h2>
          <SurfaceCard className="overflow-hidden p-1 shadow-none">
            {primaryItems.map((item) => (
              <SettingsRow
                key={item.label}
                icon={<span className={item.accent === "purple" ? "text-[var(--arya-secondary)]" : "text-[var(--arya-primary)]"}>{item.icon}</span>}
                title={item.label}
                detail={item.sub}
                trailing={<ChevronRight className="size-4 text-[var(--arya-text-subtle)]" />}
                onClick={item.action}
              />
            ))}
          </SurfaceCard>
        </section>

        <section aria-labelledby="you-more-heading">
          <h2 id="you-more-heading" className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--arya-text-subtle)]">
            More with ARYA
          </h2>
          <SurfaceCard className="overflow-hidden p-1 shadow-none">
            {moreItems.map((item) => (
              <SettingsRow
                key={item.label}
                icon={<span className={item.accent === "purple" ? "text-[var(--arya-secondary)]" : "text-[var(--arya-primary)]"}>{item.icon}</span>}
                title={item.label}
                detail={item.sub}
                trailing={<ChevronRight className="size-4 text-[var(--arya-text-subtle)]" />}
                onClick={item.action}
              />
            ))}
          </SurfaceCard>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => go("/privacy-control")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--arya-border)] text-sm font-medium text-[var(--arya-text-muted)] transition-colors hover:bg-[var(--arya-primary-soft)]"
          >
            <Lock className="size-4" />
            {t("menu_privacy", "Privacy & Control")}
          </button>
          <button
            type="button"
            onClick={() => openAryaPanel("arya-open-report")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--arya-border)] text-sm font-medium text-[var(--arya-text-muted)] transition-colors hover:bg-[var(--arya-primary-soft)]"
          >
            <Megaphone className="size-4" />
            {t("menu_report", "Report an issue")}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
