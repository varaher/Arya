import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Zap, Star, Crown, Gem, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

declare global {
  interface Window { Razorpay: any; }
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "Start your journey with ARYA.",
    icon: Zap,
    iconColor: "text-gray-500",
    iconBg: "bg-gray-100 dark:bg-slate-700",
    badge: null,
    features: [
      "20 messages per day",
      "Track up to 3 goals",
      "Basic mood check-ins",
      "All 11 Indian languages",
      "Documents & image scan",
    ],
    unavailable: ["Voice input", "Memory persistence", "KAAL", "Weekly Review"],
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    id: "core",
    name: "Core",
    price: 249,
    tagline: "For people building consistency and clarity.",
    icon: Star,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badge: "Popular",
    features: [
      "Unlimited conversations",
      "5 min voice per day",
      "Up to 10 goals",
      "30-day memory",
      "Weekly Review + Morning Briefing",
      "KAAL Basic + Health tracking",
    ],
    unavailable: [],
    cta: "Subscribe — ₹249/mo",
    ctaDisabled: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 499,
    tagline: "For deep thinkers and ambitious minds.",
    icon: Crown,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    badge: "Best Value",
    features: [
      "Everything in Core",
      "50 voice min/month (₹4/min above)",
      "Unlimited goals",
      "1-year memory",
      "KAAL Full + Business Mind",
      "Market Lens",
      "Early access to new features",
    ],
    unavailable: [],
    cta: "Subscribe — ₹499/mo",
    ctaDisabled: false,
  },
  {
    id: "elite",
    name: "Elite",
    price: 999,
    tagline: "Unlimited. Unrestricted. All of ARYA.",
    icon: Gem,
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    badge: "Full Access",
    features: [
      "Everything in Pro",
      "Unlimited voice",
      "Lifetime memory",
      "Priority response speed",
      "KAAL Full Vedic experience",
      "Monthly life review session",
    ],
    unavailable: [],
    cta: "Subscribe — ₹999/mo",
    ctaDisabled: false,
  },
];

interface PricingModalProps {
  onClose: () => void;
  token: string;
  currentPlan?: string;
  onUpgradeSuccess?: (plan: string) => void;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PLAN_COLORS: Record<string, { border: string; badgeBg: string; btnClass: string }> = {
  free:  { border: "border-gray-200 dark:border-slate-700",           badgeBg: "",                          btnClass: "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-default" },
  core:  { border: "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600", badgeBg: "bg-emerald-500", btnClass: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white" },
  pro:   { border: "border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600",         badgeBg: "bg-amber-500",   btnClass: "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white" },
  elite: { border: "border-violet-200 dark:border-violet-800 hover:border-violet-400 dark:hover:border-violet-600",     badgeBg: "bg-violet-500",  btnClass: "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white" },
};

export default function PricingModal({ onClose, token, currentPlan = "free", onUpgradeSuccess }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSubscribe = async (planId: string) => {
    if (planId === "free" || planId === currentPlan) return;
    setError(null);
    setLoading(planId);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Failed to load payment gateway. Please check your internet connection.");

      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create subscription");

      const { subscriptionId, keyId, plan } = data;
      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: "ARYA by VARAH Group",
        description: `ARYA ${plan.charAt(0).toUpperCase() + plan.slice(1)} — Monthly Subscription`,
        image: "/icons/icon-192.png",
        theme: { color: "#10b981" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-token": token },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");
            setSuccess(plan);
            onUpgradeSuccess?.(plan);
          } catch (e: any) {
            setError(e.message || "Payment verification failed. Contact support.");
          } finally {
            setLoading(null);
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      };
      new window.Razorpay(options).open();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  if (success) {
    const planName = PLANS.find(p => p.id === success)?.name || success;
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-gray-200 dark:border-slate-700"
          onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to ARYA {planName}!</h2>
          <p className="text-sm text-muted-foreground mb-6">Your subscription is active. All {planName} features are now unlocked.</p>
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl">
            Start Using ARYA
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 dark:border-slate-700 my-8"
        onClick={e => e.stopPropagation()}
        data-testid="modal-pricing"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose your plan</h2>
            <p className="text-sm text-muted-foreground mt-0.5">India pricing in ₹ — cancel anytime</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onClose(); setLocation("/pricing"); }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
              Full pricing page →
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" data-testid="button-close-pricing">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-5 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.id;
              const isLoadingPlan = loading === plan.id;
              const colors = PLAN_COLORS[plan.id];

              return (
                <motion.div key={plan.id} data-testid={`card-plan-${plan.id}`}
                  className={`relative rounded-2xl border-2 p-4 flex flex-col transition-all ${isCurrentPlan ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20" : colors.border}`}
                  whileHover={!isCurrentPlan ? { y: -2 } : {}} transition={{ duration: 0.2 }}>

                  {plan.badge && !isCurrentPlan && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap ${colors.badgeBg}`}>
                      {plan.badge}
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-emerald-600 whitespace-nowrap">
                      Current Plan
                    </div>
                  )}

                  <div className={`w-9 h-9 rounded-xl ${plan.iconBg} flex items-center justify-center mb-2.5`}>
                    <Icon className={`w-4 h-4 ${plan.iconColor}`} />
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{plan.name}</h3>
                  <p className="text-[11px] text-muted-foreground italic mb-3 leading-snug">{plan.tagline}</p>

                  <div className="flex items-baseline gap-0.5 mb-3">
                    {plan.price === 0 ? (
                      <span className="text-xl font-bold text-gray-900 dark:text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">₹</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-1.5 mb-4 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                        <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />{f}
                      </li>
                    ))}
                    {plan.unavailable.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-600 line-through">
                        <X className="w-3 h-3 mt-0.5 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>

                  <Button data-testid={`button-subscribe-${plan.id}`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan || isLoadingPlan || plan.ctaDisabled}
                    className={`w-full rounded-xl py-2 text-xs font-semibold ${isCurrentPlan ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-default" : colors.btnClass}`}>
                    {isLoadingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : isCurrentPlan ? "Current" : plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center mb-2.5 uppercase tracking-wider">Your data promise</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["🔐","Encrypted","At rest and in transit"],["🚫","Never sold","We never sell your data"],["🗑️","Delete anytime","Full account erasure"]].map(([icon, title, sub]) => (
                <div key={title}>
                  <div className="text-base mb-0.5">{icon}</div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">{title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Includes GST · Cancel anytime · Secured by Razorpay ·{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms</a>
            {" · "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
