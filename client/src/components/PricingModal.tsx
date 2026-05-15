import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Zap, Star, Crown, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      "10 conversations per day",
      "2 min voice input per day",
      "Track up to 3 goals",
      "Remembers your recent conversations",
      "Daily emotional check-ins",
      "Personalize tone and focus",
    ],
    unavailable: ["Analyze documents and images", "Start every day with clarity and focus", "Weekly reflection and review", "Unlimited goals"],
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    id: "core",
    name: "Core",
    price: 349,
    tagline: "For people building consistency and clarity.",
    icon: Star,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badge: "Popular",
    features: [
      "15 conversations per day",
      "5 min voice input per day",
      "Unlimited goals — no ceiling on ambition",
      "Analyze documents, images, and PDFs",
      "Builds deeper understanding of your routines and goals",
      "Start every day with clarity and focus",
      "Weekly reflection and review",
      "Full personalization of tone and style",
    ],
    unavailable: [],
    cta: "Subscribe — ₹349/mo",
    ctaDisabled: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 549,
    tagline: "For deep thinkers, creators, and ambitious minds.",
    icon: Crown,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    badge: "Best Value",
    features: [
      "30 conversations per day",
      "20 min voice input per day",
      "Unlimited goals — no ceiling on ambition",
      "Analyze documents, images, and PDFs",
      "Remembers a full year of your growth journey",
      "Start every day with clarity and focus",
      "Weekly reflection and review",
      "Advanced thinking support for complex decisions",
      "First access to everything new",
    ],
    unavailable: [],
    cta: "Subscribe — ₹549/mo",
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

export default function PricingModal({ onClose, token, currentPlan = "free", onUpgradeSuccess }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-gray-200 dark:border-slate-700"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to ARYA {success.charAt(0).toUpperCase() + success.slice(1)}!
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your subscription is active. All {success === "pro" ? "Pro" : "Core"} features are now unlocked.
          </p>
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
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 dark:border-slate-700 my-8"
        onClick={e => e.stopPropagation()}
        data-testid="modal-pricing"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose your plan</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Secure payment via Razorpay — cancel anytime</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" data-testid="button-close-pricing">
            <X className="w-5 h-5" />
          </button>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.id;
              const isLoading = loading === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  data-testid={`card-plan-${plan.id}`}
                  className={`relative rounded-2xl border-2 p-5 flex flex-col transition-all ${
                    isCurrentPlan
                      ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : plan.id === "core"
                      ? "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600"
                      : plan.id === "pro"
                      ? "border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600"
                      : "border-gray-200 dark:border-slate-700"
                  }`}
                  whileHover={!isCurrentPlan ? { y: -2 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white ${
                      plan.id === "core" ? "bg-emerald-500" : "bg-amber-500"
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-xs font-bold text-white bg-emerald-600">
                      Current
                    </div>
                  )}

                  <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground italic mb-3 leading-snug">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground">₹</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-2 mb-4 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {plan.unavailable.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-400 dark:text-gray-600 line-through">
                        <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    data-testid={`button-subscribe-${plan.id}`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan || isLoading || plan.ctaDisabled}
                    className={`w-full rounded-xl py-2.5 text-sm font-medium ${
                      isCurrentPlan
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-default"
                        : plan.id === "pro"
                        ? "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-white"
                        : plan.id === "core"
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-default"
                    }`}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isCurrentPlan ? "Current Plan" : plan.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-5 py-4">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center mb-3 uppercase tracking-wider">Your data promise</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg mb-1">🔐</div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">Encrypted</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">At rest and in transit, always</p>
              </div>
              <div>
                <div className="text-lg mb-1">🚫</div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">Never sold</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">We never sell or train on your data</p>
              </div>
              <div>
                <div className="text-lg mb-1">🗑️</div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">Delete anytime</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Erase memory, notes, or your full account</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-3">
              Compliant with India's{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">Digital Personal Data Protection Act 2023</a>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            All plans include GST. Cancel anytime — no questions asked. Secured by Razorpay.{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms</a>
            {" "}·{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
