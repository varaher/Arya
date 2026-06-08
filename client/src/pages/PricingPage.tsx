import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Check, X, Zap, Star, Crown, Gem, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";


declare global { interface Window { Razorpay: any; } }

// ── Palette ──────────────────────────────────────────────────────────────────
const INDIA = "india";
const INTL  = "intl";

type Region  = "india" | "intl";
type Billing = "monthly" | "annual";
type PlanId  = "free" | "core" | "pro" | "elite";

interface PlanPrice {
  monthly: number;
  annual: number;
  annualMonthly: number;
  currency: string;
  symbol: string;
}

const PRICES: Record<Region, Record<PlanId, PlanPrice>> = {
  india: {
    free:  { monthly: 0,   annual: 0,      annualMonthly: 0,    currency: "INR", symbol: "₹" },
    core:  { monthly: 249, annual: 2490,   annualMonthly: 207,  currency: "INR", symbol: "₹" },
    pro:   { monthly: 499, annual: 4990,   annualMonthly: 416,  currency: "INR", symbol: "₹" },
    elite: { monthly: 999, annual: 9990,   annualMonthly: 833,  currency: "INR", symbol: "₹" },
  },
  intl: {
    free:  { monthly: 0,    annual: 0,   annualMonthly: 0,    currency: "USD", symbol: "$" },
    core:  { monthly: 3.99, annual: 32,  annualMonthly: 2.67, currency: "USD", symbol: "$" },
    pro:   { monthly: 7.99, annual: 64,  annualMonthly: 5.33, currency: "USD", symbol: "$" },
    elite: { monthly: 14.99,annual: 119, annualMonthly: 9.92, currency: "USD", symbol: "$" },
  },
};

const PLANS = [
  {
    id: "free" as PlanId,
    name: "Free",
    tagline: "Try ARYA. No pressure.",
    icon: Zap,
    color: "#6b7280",
    border: "#e5e7eb",
    borderDark: "#374151",
    badgeBg: "",
    badge: null,
    highlight: false,
    features: [
      "20 conversations per day",
      "Up to 3 goals",
      "Mood check-ins",
      "All 11 Indian languages",
      "Document & image scan",
    ],
  },
  {
    id: "core" as PlanId,
    name: "Core",
    tagline: "ARYA that knows you.",
    icon: Star,
    color: "#10b981",
    border: "#6ee7b7",
    borderDark: "#065f46",
    badgeBg: "#10b981",
    badge: "Most Popular",
    highlight: false,
    features: [
      "Unlimited conversations",
      "Voice in 11 Indian languages — 150 min/month",
      "10 goals with smart check-ins",
      "Voice Notes — speak, ARYA summarises",
      "30-day memory",
      "Weekly Review letter",
      "Morning KAAL briefing",
      "Health tracking (Prana)",
      "Document & image scan",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    tagline: "ARYA that thinks with you.",
    icon: Crown,
    color: "#f59e0b",
    border: "#fcd34d",
    borderDark: "#78350f",
    badgeBg: "#f59e0b",
    badge: "Best Value",
    highlight: true,
    features: [
      "Everything in Core",
      "500 min voice / month",
      "Unlimited goals",
      "1-year memory",
      "Niti — Business thinking + Decision Records",
      "7 Thinking Modes (Founder, Devil's Advocate…)",
      "Market Lens",
      "KAAL full 3-tab dashboard",
      "Early access to new features",
    ],
  },
  {
    id: "elite" as PlanId,
    name: "Elite",
    tagline: "All of ARYA. Unrestricted.",
    icon: Gem,
    color: "#8b5cf6",
    border: "#c4b5fd",
    borderDark: "#4c1d95",
    badgeBg: "#8b5cf6",
    badge: "Full Access",
    highlight: false,
    features: [
      "Everything in Pro",
      "Unlimited voice",
      "Lifetime memory",
      "Drishya — personal stories",
      "Priority response speed",
      "KAAL Full Vedic experience",
      "Monthly life review session",
    ],
  },
];

const FEATURES: Array<{ label: string; free: string | boolean; core: string | boolean; pro: string | boolean; elite: string | boolean; note?: string }> = [
  { label: "Daily conversations",   free: "20/day",      core: "Unlimited",     pro: "Unlimited",      elite: "Unlimited"       },
  { label: "Memory",                free: "Resets daily",core: "30 days",       pro: "1 year",         elite: "Lifetime"        },
  { label: "Goals",                 free: "3",           core: "10 + check-ins",pro: "Unlimited",      elite: "Unlimited"       },
  { label: "Voice input",           free: false,         core: "150 min/month", pro: "500 min/month",  elite: "Unlimited",      note: "Above 500 min on Pro: ₹2/min (India). Capped at ₹200/month extra." },
  { label: "Voice Notes",           free: false,         core: true,            pro: true,             elite: true              },
  { label: "Document & image scan", free: true,          core: true,            pro: true,             elite: true              },
  { label: "25 languages",          free: true,          core: true,            pro: true,             elite: true              },
  { label: "KAAL",                  free: false,         core: "Morning briefing",pro: "Full 3-tab",   elite: "Full + Vedic"    },
  { label: "Niti — Business Mind",  free: false,         core: false,           pro: true,             elite: true              },
  { label: "Market Lens",           free: false,         core: false,           pro: true,             elite: true              },
  { label: "7 Thinking Modes",      free: false,         core: false,           pro: true,             elite: true              },
  { label: "Weekly Review",         free: false,         core: true,            pro: true,             elite: true              },
  { label: "Health tracking (Prana)",free: false,        core: true,            pro: true,             elite: true              },
  { label: "Drishya stories",       free: false,         core: false,           pro: false,            elite: true              },
  { label: "Priority response",     free: false,         core: false,           pro: false,            elite: true              },
  { label: "Monthly life review",   free: false,         core: false,           pro: false,            elite: true              },
  { label: "Early access",          free: false,         core: false,           pro: true,             elite: true              },
];

const FAQS = [
  { q: "What is voice metering on Pro?",
    a: "Pro includes 500 voice minutes per month — enough for most users. If you go over, you're charged ₹2/minute (India) only for the extra minutes, capped at ₹200/month. Core includes 150 minutes. Most users never exceed either limit." },
  { q: "Can I switch between India and international billing?",
    a: "India billing is in INR via Razorpay. International billing is in USD via Paddle. If you move countries, contact support and we'll migrate your subscription." },
  { q: "What's the difference between monthly and annual?",
    a: "Annual gives you 2 months free (about 16% off). You're charged once upfront. Annual subscribers also have significantly lower churn — it's our way of rewarding long-term commitment." },
  { q: "What is the Elite monthly life review?",
    a: "Once a month, ARYA generates a deep personal report — goals, mood patterns, key decisions, wins and misses — all woven into a narrative you can read and reflect on. It's the kind of review a personal coach would prepare." },
  { q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings with one tap. Monthly plans end at the billing period. Annual plans are non-refundable but we'll always honour a genuine hardship request." },
];

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (value === false) return <X    className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />;
  return <span className="text-xs text-gray-700 dark:text-gray-300 text-center block leading-tight">{value}</span>;
}

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { user, token } = useUserAuth();

  const [region,  setRegion]  = useState<Region>(INDIA);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [success, setSuccess] = useState<PlanId | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [showExitNudge, setShowExitNudge] = useState(false);

  const currentPlan = (user as any)?.plan || "free";
  const prices = PRICES[region];

  const fmt = (p: PlanPrice, billing: Billing) => {
    if (p.monthly === 0) return "Free";
    const val = billing === "annual" ? p.annualMonthly : p.monthly;
    return `${p.symbol}${typeof val === "number" && val % 1 !== 0 ? val.toFixed(2) : val}`;
  };

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === "free" || planId === currentPlan) return;
    setError(null);

    if (region === INTL) {
      setError("International checkout via Paddle is coming soon. For now, use India pricing or contact us at hello@varah.in");
      return;
    }

    if (!token) { setLocation("/"); return; }
    setLoading(planId);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Failed to load payment gateway. Please check your connection.");

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
        description: `ARYA ${plan.charAt(0).toUpperCase() + plan.slice(1)} — ${billing === "annual" ? "Annual" : "Monthly"} Subscription`,
        image: "/icons/icon-192.png",
        theme: { color: "#10b981" },
        handler: async (response: any) => {
          try {
            const vr = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-token": token },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            });
            const vd = await vr.json();
            if (!vr.ok) throw new Error(vd.error || "Payment verification failed");
            setSuccess(planId);
          } catch (e: any) {
            setError(e.message || "Payment verification failed. Contact support.");
          } finally { setLoading(null); }
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl border border-gray-100 dark:border-slate-700">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to ARYA {PLANS.find(p => p.id === success)?.name}!
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Your subscription is active. All {success} features are unlocked.
          </p>
          <button onClick={() => setLocation("/")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold hover:opacity-90 transition-opacity">
            Start Using ARYA →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => setShowExitNudge(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">ARYA</div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Pricing</h1>
          </div>
          {/* Region toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-full p-1">
            <button onClick={() => setRegion(INDIA)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${region === INDIA ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>
              🇮🇳 India
            </button>
            <button onClick={() => setRegion(INTL)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${region === INTL ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"}`}>
              🌍 Global
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero text */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Grow with ARYA, at your pace.
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-base max-w-lg mx-auto">
            Every plan includes ARYA's core wisdom. Upgrade for memory, voice, and deeper guidance.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm font-medium ${billing === "monthly" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>Monthly</span>
          <button onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
            className="relative w-12 h-6 bg-emerald-500 rounded-full transition-colors">
            <motion.div animate={{ x: billing === "annual" ? 24 : 2 }}
              className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
          </button>
          <span className={`text-sm font-medium ${billing === "annual" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
            Annual
            <span className="ml-1.5 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
              2 months free
            </span>
          </span>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300 text-center">
              {error}
              <button onClick={() => setError(null)} className="ml-3 font-semibold underline">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const p = prices[plan.id];
            const isCurrent = currentPlan === plan.id;
            const isLoading = loading === plan.id;
            const isIntlPaddle = region === INTL && plan.id !== "free";

            return (
              <motion.div key={plan.id} whileHover={!isCurrent ? { y: -3 } : {}} transition={{ duration: 0.18 }}
                data-testid={`card-plan-${plan.id}`}
                className="relative rounded-2xl border-2 flex flex-col overflow-hidden"
                style={{ borderColor: plan.highlight ? plan.color : undefined }}
                {...(!plan.highlight && { className: `relative rounded-2xl border-2 flex flex-col overflow-hidden border-gray-200 dark:border-slate-700` })}>

                {plan.highlight && (
                  <div className="absolute inset-0 pointer-events-none rounded-2xl"
                    style={{ boxShadow: `0 0 0 2px ${plan.color}`, background: `linear-gradient(135deg, ${plan.color}08, transparent)` }} />
                )}

                {plan.badge && (
                  <div className="text-center py-1.5 text-xs font-bold text-white tracking-wide"
                    style={{ background: plan.color }}>
                    {plan.badge}
                  </div>
                )}
                {!plan.badge && <div className="h-1" />}

                <div className="p-5 flex flex-col flex-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${plan.color}18` }}>
                    <Icon className="w-4 h-4" style={{ color: plan.color }} />
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground italic mb-4 leading-snug">{plan.tagline}</p>

                  {/* Price */}
                  <div className="mb-1">
                    {p.monthly === 0 ? (
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">Free</span>
                    ) : (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-semibold text-gray-500">{p.symbol}</span>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {billing === "annual"
                            ? (typeof p.annualMonthly === "number" && p.annualMonthly % 1 !== 0 ? p.annualMonthly.toFixed(2) : p.annualMonthly)
                            : (typeof p.monthly === "number" && p.monthly % 1 !== 0 ? p.monthly.toFixed(2) : p.monthly)}
                        </span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                    )}
                    {billing === "annual" && p.monthly > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.symbol}{p.annual} billed annually
                        <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          (save {p.symbol}{Math.round(p.monthly * 12 - p.annual)})
                        </span>
                      </div>
                    )}
                    {billing === "monthly" && p.monthly > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5 opacity-0">—</div>
                    )}
                  </div>

                  {/* Feature bullets */}
                  <ul className="space-y-1 mb-4">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-1.5 text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                        <Check className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="flex-1" />

                  {/* CTA */}
                  {isIntlPaddle && plan.id !== "free" ? (
                    <button
                      data-testid={`button-subscribe-${plan.id}`}
                      disabled
                      className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-slate-600"
                    >
                      Coming soon — ${billing === "annual" ? p.annual : p.monthly}
                    </button>
                  ) : (
                    <button
                      data-testid={`button-subscribe-${plan.id}`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isCurrent || isLoading || plan.id === "free"}
                      className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                      style={
                        isCurrent
                          ? { background: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}40` }
                          : plan.id === "free"
                          ? { background: "#f3f4f6", color: "#6b7280" }
                          : { background: plan.color, color: "#fff" }
                      }
                    >
                      <span className="truncate">{isLoading ? "…" : isCurrent ? "Current Plan" : plan.id === "free" ? "Free forever" : billing === "annual" ? `₹${p.annual}/yr` : `Subscribe ₹${p.monthly}/mo`}</span>
                    </button>
                  )}

                  {region === INDIA && plan.id !== "free" && (
                    <p className="text-[10px] text-center text-muted-foreground mt-1.5">
                      Secured by Razorpay · GST included
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Voice metering callout */}
        <div className="mb-10 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-5">
          <div className="flex gap-3 items-start">
            <span className="text-2xl flex-shrink-0">🎙️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">How Pro voice works</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                Pro includes <strong>500 voice minutes per month</strong> — enough for most users.
                If you go over, you're charged{" "}
                <strong>{region === INDIA ? "₹2" : "$0.02"} per extra minute</strong>, capped at{" "}
                <strong>{region === INDIA ? "₹200" : "$2.40"} extra per month</strong> — so your bill never doubles.
                Elite gets unlimited voice with no metering at all.
              </p>
            </div>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Full feature comparison</h3>
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-40">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} className="text-center px-3 py-3 w-24">
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{fmt(prices[p.id], billing)}{prices[p.id].monthly > 0 && billing === "monthly" ? "/mo" : ""}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.label} className={i % 2 === 0 ? "bg-gray-50/50 dark:bg-slate-800/30" : ""}>
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{f.label}</div>
                      {f.note && <div className="text-[10px] text-muted-foreground mt-0.5">{f.note}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-center"><FeatureCell value={f.free} /></td>
                    <td className="px-3 py-2.5 text-center"><FeatureCell value={f.core} /></td>
                    <td className="px-3 py-2.5 text-center"><FeatureCell value={f.pro} /></td>
                    <td className="px-3 py-2.5 text-center"><FeatureCell value={f.elite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Annual plan nudge */}
        {billing === "monthly" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-5 text-center">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
              Switch to annual — get 2 months free
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-3">
              Annual subscribers have 3–5× lower churn. It's our way of rewarding long-term commitment.
            </p>
            <button onClick={() => setBilling("annual")}
              className="text-sm font-bold text-emerald-700 dark:text-emerald-400 underline underline-offset-2">
              Show annual pricing →
            </button>
          </motion.div>
        )}

        {/* Data promise */}
        <div className="mb-10 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-5 py-5">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-center mb-4 uppercase tracking-wider">Your data promise</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "🔐", title: "Encrypted",    sub: "At rest and in transit, always" },
              { icon: "🚫", title: "Never sold",   sub: "We never sell or train on your data" },
              { icon: "🗑️", title: "Delete anytime", sub: "Full account erasure, one tap" },
            ].map(d => (
              <div key={d.title}>
                <div className="text-xl mb-1">{d.icon}</div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{d.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{d.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-4">
            Compliant with India's{" "}
            <a href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              Digital Personal Data Protection Act 2023
            </a>
          </p>
        </div>

        {/* FAQs */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">Questions</h3>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <p className="px-4 py-3 text-sm text-muted-foreground leading-relaxed border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          All plans include GST where applicable. Cancel anytime — no questions asked.{" "}
          <a href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms</a>
          {" "}·{" "}
          <a href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy</a>
          {" "}·{" "}
          <a href="mailto:hello@varah.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">Support</a>
        </p>
      </div>

      {/* Exit intent nudge */}
      <AnimatePresence>
        {showExitNudge && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => { setShowExitNudge(false); setLocation("/"); }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-gray-100 dark:border-slate-700"
              data-testid="modal-exit-nudge"
            >
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <Star className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Before you go</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-1">
                312 people use ARYA. Most started with Core.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                That's <span className="font-semibold text-gray-700 dark:text-gray-200">₹249</span>.
                {" "}Less than one coffee a week.
              </p>
              <button
                data-testid="button-exit-nudge-core"
                onClick={() => { setShowExitNudge(false); handleSubscribe("core"); }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors mb-2.5"
              >
                Start with Core — ₹249/mo
              </button>
              <button
                data-testid="button-exit-nudge-dismiss"
                onClick={() => { setShowExitNudge(false); setLocation("/"); }}
                className="w-full py-2.5 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
