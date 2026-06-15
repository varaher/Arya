import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface Props {
  onCancelled: () => void;
  onClose: () => void;
}

type Step = "confirm" | "reason" | "cancelling" | "done";

const CANCEL_REASONS = [
  "I'm not using it enough",
  "Too expensive for me right now",
  "Missing a feature I need",
  "Switching to another app",
  "Just taking a break",
  "Other",
];

const PLAN_LOSSES: Record<string, string[]> = {
  core: [
    "Unlimited conversations",
    "30-day memory",
    "Voice Notes + 150 min/month",
    "All 7 Thinking Modes",
    "Document Intelligence",
    "Weekly Review + Morning Briefing",
  ],
  pro: [
    "500 voice min/month",
    "1-year memory",
    "Niti + Market Lens",
    "PPT generation",
    "Unlimited goals + documents",
  ],
  elite: [
    "Lifetime memory",
    "Unlimited voice",
    "Drishya stories",
    "Document history",
    "Monthly life review session",
  ],
};

function getToken(): string {
  try { return localStorage.getItem("arya_token") || ""; } catch { return ""; }
}

export default function CancelSubscription({ onCancelled, onClose }: Props) {
  const [step, setStep] = useState<Step>("confirm");
  const [selectedReason, setSelectedReason] = useState("");
  const [error, setError] = useState("");
  const [planName, setPlanName] = useState("Core");
  const [planKey, setPlanKey] = useState("core");
  const [renewsOn, setRenewsOn] = useState("your next billing date");
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoadingPlan(false); return; }
    fetch("/api/subscription/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const p = data?.plan || "core";
        setPlanKey(p);
        setPlanName(p.charAt(0).toUpperCase() + p.slice(1));
        if (data?.planExpiresAt) {
          setRenewsOn(
            new Date(data.planExpiresAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPlan(false));
  }, []);

  async function handleCancel() {
    setStep("cancelling");
    setError("");
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ reason: selectedReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Cancellation failed");
      }
      setStep("done");
      setTimeout(() => onCancelled(), 2400);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try again.");
      setStep("reason");
    }
  }

  const losses = PLAN_LOSSES[planKey] || PLAN_LOSSES.core;

  const sheet = (
    <>
      <motion.div
        className="fixed inset-0 z-[9998] bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === "cancelling" ? undefined : onClose}
      />

      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#0f1923] rounded-t-3xl border-t border-white/8 px-6 pb-10 pt-3 max-h-[88vh] overflow-y-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
      >
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-6" />

        <AnimatePresence mode="wait">
          {/* ── Confirm ── */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-4xl text-center mb-4">💔</div>
              <h2 className="text-[22px] font-bold text-white/90 text-center mb-3 font-['Space_Grotesk']">
                Cancel {loadingPlan ? "…" : planName} plan?
              </h2>
              <p className="text-[15px] text-white/55 text-center leading-relaxed mb-5">
                You're on{" "}
                <span className="text-emerald-400 font-semibold">{planName}</span>.{" "}
                If you cancel, you'll keep full access until{" "}
                <span className="text-amber-400 font-semibold">{renewsOn}</span>.{" "}
                After that, you'll move to the Free plan.
              </p>

              <div className="bg-red-500/6 border border-red-500/12 rounded-2xl p-4 mb-6">
                <p className="text-[11px] tracking-widest uppercase text-red-400/70 font-semibold mb-2.5">
                  You'll lose access to:
                </p>
                <ul className="space-y-1">
                  {losses.map((item) => (
                    <li key={item} className="text-[14px] text-white/60 flex items-start gap-2 leading-relaxed">
                      <span className="text-red-400/60 font-bold mt-0.5 shrink-0">×</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 transition-colors rounded-2xl text-white text-[16px] font-bold"
                >
                  Keep my {planName} plan
                </button>
                <button
                  onClick={() => setStep("reason")}
                  className="w-full py-3.5 bg-transparent border border-white/10 hover:border-white/20 transition-colors rounded-2xl text-white/40 hover:text-white/60 text-[14px]"
                >
                  Continue to cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Reason ── */}
          {step === "reason" && (
            <motion.div key="reason" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-[22px] font-bold text-white/90 text-center mb-2 font-['Space_Grotesk']">
                One quick question
              </h2>
              <p className="text-[15px] text-white/55 text-center leading-relaxed mb-5">
                Why are you cancelling?
                <br />
                <span className="text-white/35 text-[13px]">This genuinely helps ARYA improve.</span>
              </p>

              <div className="flex flex-col gap-2 mb-6">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full px-4 py-3.5 rounded-2xl text-left text-[14px] transition-all border ${
                      selectedReason === reason
                        ? "bg-emerald-500/8 border-emerald-400/25 text-white/90"
                        : "bg-white/4 border-white/8 text-white/65 hover:bg-white/7 hover:text-white/85"
                    }`}
                  >
                    {selectedReason === reason && (
                      <span className="text-emerald-400 font-bold mr-1">✓ </span>
                    )}
                    {reason}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-[13px] text-red-400 text-center mb-3 px-4 py-2.5 bg-red-500/8 rounded-xl">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 transition-colors rounded-2xl text-white text-[16px] font-bold"
                >
                  Actually, keep my plan
                </button>
                <button
                  onClick={handleCancel}
                  disabled={!selectedReason}
                  className={`w-full py-3.5 rounded-2xl text-[15px] font-semibold border transition-all ${
                    selectedReason
                      ? "bg-red-500/12 border-red-500/25 text-red-400 hover:bg-red-500/20"
                      : "bg-white/4 border-white/8 text-white/25 cursor-not-allowed"
                  }`}
                >
                  Cancel my subscription
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Cancelling ── */}
          {step === "cancelling" && (
            <motion.div
              key="cancelling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-12 gap-5"
            >
              <div className="w-9 h-9 border-[3px] border-white/10 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-[15px] text-white/40">Cancelling your subscription…</p>
            </motion.div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <div className="text-4xl mb-4">🌿</div>
              <h2 className="text-[22px] font-bold text-white/90 mb-3 font-['Space_Grotesk']">
                Subscription cancelled
              </h2>
              <p className="text-[15px] text-white/55 leading-relaxed mb-3">
                You'll keep full {planName} access until{" "}
                <span className="text-amber-400 font-semibold">{renewsOn}</span>.
                After that — Free plan, no charges.
              </p>
              <p className="text-[13px] text-white/30 leading-relaxed italic">
                ARYA will be here when you're ready to come back.
                <br />
                Your goals, notes, and memory stay with you.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );

  return createPortal(<AnimatePresence>{sheet}</AnimatePresence>, document.body);
}
