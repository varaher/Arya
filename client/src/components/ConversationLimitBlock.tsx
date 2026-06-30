import { useEffect, useState } from "react";

interface Props {
  resetTime: string;
  resetTimestamp: number;
  isTrialUser: boolean;
  trialDay?: number | null;
  nextTierLimit?: number | null;
  daysToNextPhase?: number | null;
  onUpgrade: () => void;
}

export default function ConversationLimitBlock({
  resetTime,
  resetTimestamp,
  isTrialUser,
  trialDay,
  nextTierLimit,
  daysToNextPhase,
  onUpgrade,
}: Props) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = resetTimestamp - Date.now();
      if (diff <= 0) { setCountdown("now"); return; }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetTimestamp]);

  const getContent = () => {
    if (isTrialUser && nextTierLimit && daysToNextPhase != null && daysToNextPhase <= 7) {
      return {
        emoji: "🌱",
        headline: "You've made the most of today.",
        body: `Your conversations reset at ${resetTime} — in ${countdown}.`,
        sub: `In ${daysToNextPhase} day${daysToNextPhase === 1 ? "" : "s"}, your daily limit increases to ${nextTierLimit}. You're earning it.`,
        upgradeText: "Get unlimited now →",
      };
    }
    if (isTrialUser) {
      return {
        emoji: "🌿",
        headline: "You've made the most of today.",
        body: `Conversations reset at ${resetTime} — in ${countdown}.`,
        sub: trialDay ? `Day ${trialDay} of 45. Every day you come back, your access grows.` : null,
        upgradeText: "Upgrade for unlimited →",
      };
    }
    return {
      emoji: "🕯️",
      headline: "That's today's thinking done.",
      body: `Your daily conversations reset at ${resetTime} — in ${countdown}.`,
      sub: "Upgrade to Core for unlimited conversations, voice, and memory that carries forward.",
      upgradeText: "See plans →",
    };
  };

  const content = getContent();

  return (
    <div
      data-testid="block-conversation-limit"
      style={{
        margin: "8px 0 4px",
        padding: "20px 20px",
        borderRadius: 12,
        background: "#F7F3EA",
        border: "1px solid #E4DCC8",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 10 }}>{content.emoji}</div>

      <p
        style={{
          fontStyle: "italic",
          fontSize: 16,
          color: "#221F1C",
          marginBottom: 8,
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {content.headline}
      </p>

      <p style={{ fontSize: 13.5, color: "#5C5448", marginBottom: 4 }}>
        {content.body}
      </p>

      {/* Live countdown pill */}
      <div
        data-testid="text-limit-countdown"
        style={{
          display: "inline-block",
          padding: "5px 16px",
          borderRadius: 20,
          background: "#1F3A2E",
          color: "#BFD4C6",
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.5px",
          margin: "10px 0",
        }}
      >
        {countdown === "now" ? "Refreshing…" : `↺  ${countdown}`}
      </div>

      {content.sub && (
        <p style={{ fontSize: 12.5, color: "#8A8071", marginTop: 6, lineHeight: 1.5 }}>
          {content.sub}
        </p>
      )}

      <button
        data-testid="button-limit-upgrade"
        onClick={onUpgrade}
        style={{
          marginTop: 14,
          padding: "9px 20px",
          borderRadius: 7,
          border: "1.5px solid #1F3A2E",
          background: "transparent",
          color: "#1F3A2E",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget;
          b.style.background = "#1F3A2E";
          b.style.color = "#F7F3EA";
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget;
          b.style.background = "transparent";
          b.style.color = "#1F3A2E";
        }}
      >
        {content.upgradeText}
      </button>
    </div>
  );
}
