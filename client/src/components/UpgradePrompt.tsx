import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export interface UpgradePromptConfig {
  title: string;
  body: string;
  primaryLabel: string;
  primaryPlan: "core" | "pro" | "elite";
  secondaryLabel?: string;
  extra?: { label: string; plan: "pro" | "elite" };
}

interface UpgradePromptProps {
  config: UpgradePromptConfig | null;
  onDismiss: () => void;
}

const PLAN_COLOR: Record<string, string> = {
  core:  "#10b981",
  pro:   "#f59e0b",
  elite: "#8b5cf6",
};

export function UpgradePrompt({ config, onDismiss }: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  function go(plan: string) {
    onDismiss();
    setLocation(`/pricing?plan=${plan}`);
  }

  return createPortal(
    <AnimatePresence>
      {config && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl border-t border-gray-100 dark:border-slate-700"
          >
            <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />
            <button
              onClick={onDismiss}
              data-testid="button-upgrade-prompt-dismiss-x"
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 pr-8 leading-snug">
              {config.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line mb-6">
              {config.body}
            </p>

            <div className="space-y-2.5">
              {config.extra && (
                <button
                  data-testid={`button-upgrade-to-${config.extra.plan}`}
                  onClick={() => go(config.extra!.plan)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: PLAN_COLOR[config.extra.plan] }}
                >
                  {config.extra.label}
                </button>
              )}
              <button
                data-testid={`button-upgrade-to-${config.primaryPlan}`}
                onClick={() => go(config.primaryPlan)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: PLAN_COLOR[config.primaryPlan] }}
              >
                {config.primaryLabel}
              </button>
              <button
                data-testid="button-upgrade-prompt-secondary"
                onClick={onDismiss}
                className="w-full py-2.5 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {config.secondaryLabel ?? "Maybe later"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export const UPGRADE_PROMPTS = {
  docSaveTask: (): UpgradePromptConfig => ({
    title: "Save tasks from documents 📌",
    body: `ARYA found tasks in your document — but saving them directly to your Goals is available on Core and above.\n\nOn Free, you can read and ask questions about any document. To turn what you find into goals and reminders — upgrade to Core.\n\n₹249/month. Less than one coffee a week.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Stay on Free",
  }),
  docSetReminder: (): UpgradePromptConfig => ({
    title: "Set reminders from documents ⏰",
    body: `ARYA found a date in your document. Setting it as a reminder automatically is available on Core and above.\n\nYou can still note it down manually — or upgrade to let ARYA handle it.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Stay on Free",
  }),
  docExamQuestions: (): UpgradePromptConfig => ({
    title: "Save exam questions to Notes 📚",
    body: `ARYA generated exam questions from your document — but saving them to your Notes is available on Core and above.\n\nYou can read them here. To keep them in your Notes for revision anytime — upgrade to Core.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Stay on Free",
  }),
  docPPT: (): UpgradePromptConfig => ({
    title: "Download as PowerPoint 📊",
    body: `PPT generation — downloading a real .pptx file — is available on Pro and above.\n\nYou already have the full outline here. To turn it into a file you can open in PowerPoint or Google Slides — upgrade to Pro.\n\n₹499/month.`,
    primaryLabel: "Upgrade to Pro →",
    primaryPlan: "pro",
    secondaryLabel: "Keep outline only",
  }),
  docLimit: (): UpgradePromptConfig => ({
    title: "Document limit reached 📄",
    body: `You've uploaded 10 documents today — that's the Core plan limit.\n\nLimit resets at midnight. For unlimited document uploads — upgrade to Pro.\n\n₹499/month.`,
    primaryLabel: "Upgrade to Pro →",
    primaryPlan: "pro",
    secondaryLabel: "Come back tomorrow",
  }),
  voiceGate: (): UpgradePromptConfig => ({
    title: "Talk to ARYA 🎤",
    body: `Voice input is available on Core and above.\n\nOn Free, you can type to ARYA in any language. To speak — and have ARYA listen and reply in your language — upgrade to Core.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Type instead",
  }),
  voiceMinutes: (resetDate: string): UpgradePromptConfig => ({
    title: "Voice minutes used up 🎤",
    body: `You've used your 150 voice minutes for this month.\n\nVoice resets on ${resetDate}.\n\nFor 500 minutes/month — upgrade to Pro.\nFor unlimited voice — upgrade to Elite.`,
    primaryLabel: "Upgrade to Pro — ₹499",
    primaryPlan: "pro",
    extra: { label: "Upgrade to Elite — ₹999", plan: "elite" },
    secondaryLabel: "Type instead for now",
  }),
  memoryReset: (): UpgradePromptConfig => ({
    title: "Fresh start today 🌅",
    body: `On Free, ARYA's memory resets each day — so every conversation starts fresh.\n\nTo have ARYA remember your goals, patterns, and conversations across days — upgrade to Core for 30-day memory.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Continue on Free",
  }),
  goal4th: (): UpgradePromptConfig => ({
    title: "Goal limit reached 🎯",
    body: `Free plan supports 3 active goals.\n\nYou already have 3. To add more — either complete or remove one, or upgrade to Core for 10 goals.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Manage my goals",
  }),
  goal11th: (): UpgradePromptConfig => ({
    title: "Goal limit reached 🎯",
    body: `Core plan supports 10 active goals.\n\nFor unlimited goals — upgrade to Pro.\n\n₹499/month.`,
    primaryLabel: "Upgrade to Pro →",
    primaryPlan: "pro",
    secondaryLabel: "Manage my goals",
  }),
  drishya: (): UpgradePromptConfig => ({
    title: "Stories that find you 📖",
    body: `Drishya — ARYA's personal story experience — is available on Elite.\n\nDescribe what you need. A feeling. A situation. A character. ARYA generates a complete story from India's ancient tradition — for your exact moment.\n\n₹999/month.`,
    primaryLabel: "Upgrade to Elite →",
    primaryPlan: "elite",
    secondaryLabel: "Maybe later",
  }),
  niti: (): UpgradePromptConfig => ({
    title: "Business thinking partner ⚖️",
    body: `Niti — ARYA's dedicated space for business decisions and market thinking — is available on Pro and above.\n\n₹499/month.`,
    primaryLabel: "Upgrade to Pro →",
    primaryPlan: "pro",
    secondaryLabel: "Use chat instead",
  }),
  weeklyReview: (): UpgradePromptConfig => ({
    title: "Your Sunday letter 📖",
    body: `Weekly Review — a narrative reflection of your week that reads like a letter from someone paying close attention — is available on Core and above.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Maybe later",
  }),
  morningBriefing: (): UpgradePromptConfig => ({
    title: "Start every morning with ARYA ☀️",
    body: `Morning Briefing — your goals, the news, one line to carry through the day, arriving before you open anything else — is available on Core and above.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Maybe later",
  }),
  thinkingModes: (): UpgradePromptConfig => ({
    title: "More ways to think 🧠",
    body: `Free plan includes 2 thinking modes. All 7 — including Founder, Devil's Advocate, First Principles, Therapist, Contrarian, and Full Chain — are available on Core.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Use a free mode",
  }),
  conversationLimit: (): UpgradePromptConfig => ({
    title: "Daily limit reached 💬",
    body: `Free plan includes 20 conversations per day. You've reached today's limit.\n\nResets at midnight. For unlimited conversations — upgrade to Core.\n\n₹249/month.`,
    primaryLabel: "Upgrade to Core →",
    primaryPlan: "core",
    secondaryLabel: "Come back tomorrow",
  }),
  foundingMember: (): UpgradePromptConfig => ({
    title: "You built ARYA with us 🌿",
    body: `You've been with ARYA since the beginning. Your feedback shaped everything you see today.\n\nAs a thank you — Core plan at ₹149/month. Forever.\n\nThat's your founding member price. It never changes. It never increases.\n\nFirst 50 who claim it get it locked in.`,
    primaryLabel: "Claim ₹149/mo founding price →",
    primaryPlan: "core",
    secondaryLabel: "Maybe later",
  }),
};
