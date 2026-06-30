import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  remaining: number;
  resetTime: string;
  isTrialUser: boolean;
  trialDay?: number | null;
  nextTierLimit?: number | null;
  daysToNextPhase?: number | null;
}

export default function ConversationLimitBanner({
  remaining,
  resetTime,
  isTrialUser,
  trialDay,
  nextTierLimit,
  daysToNextPhase,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (remaining > 5 || dismissed) return null;

  const getMessage = () => {
    if (
      isTrialUser &&
      nextTierLimit &&
      daysToNextPhase != null &&
      daysToNextPhase <= 5
    ) {
      return {
        icon: "🌿",
        main: `${remaining} conversation${remaining === 1 ? "" : "s"} left today`,
        sub: `Resets at ${resetTime} · In ${daysToNextPhase} day${daysToNextPhase === 1 ? "" : "s"}, you unlock ${nextTierLimit}/day`,
        tone: "encouraging" as const,
      };
    }
    return {
      icon: remaining <= 2 ? "🕯️" : "🌿",
      main: `${remaining} conversation${remaining === 1 ? "" : "s"} left today`,
      sub: `More at ${resetTime}`,
      tone: remaining <= 2 ? ("gentle" as const) : ("neutral" as const),
    };
  };

  const msg = getMessage();

  const palette = {
    encouraging: { bg: "#EAF5EE", border: "#B8D4BE", text: "#1F3A2E", sub: "#4A7A58" },
    gentle:      { bg: "#FDF6E8", border: "#E8D4A0", text: "#4A3010", sub: "#8A6830" },
    neutral:     { bg: "#F7F3EA", border: "#E4DCC8", text: "#221F1C", sub: "#5C5448" },
  };

  const c = palette[msg.tone];

  return (
    <div
      data-testid="banner-conversation-limit"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        marginBottom: 6,
        borderRadius: 10,
        border: `1px solid ${c.border}`,
        background: c.bg,
        fontSize: "13.5px",
        lineHeight: 1.4,
        animation: "slideDown 0.25s ease",
      }}
    >
      <span style={{ fontSize: 15, flexShrink: 0 }}>{msg.icon}</span>

      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, color: c.text }}>{msg.main}</span>
        <span style={{ color: c.sub, marginLeft: 6 }}>· {msg.sub}</span>
      </div>

      <button
        data-testid="button-limit-banner-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: c.sub,
          padding: 2,
          flexShrink: 0,
          opacity: 0.65,
          display: "flex",
          alignItems: "center",
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
