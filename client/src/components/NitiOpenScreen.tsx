import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const N = {
  bg: "#0a0d14",
  surface: "#131926",
  surface2: "#1a2235",
  border: "#1e2d45",
  border2: "#253450",
  gold: "#d4a853",
  goldFaint: "rgba(212,168,83,0.08)",
  cream: "#f0e8d5",
  steel: "#8898b8",
  muted: "#5a6880",
  text: "#ddd5c5",
  purple: "#7c3aed",
  purpleFaint: "rgba(124,58,237,0.07)",
  purpleBorder: "rgba(124,58,237,0.15)",
};

const QUICK_STARTS = [
  { emoji: "💥", label: "Stress-test an idea",       prompt: "I want to stress-test an idea — " },
  { emoji: "🧭", label: "Stuck on a decision",        prompt: "I've been going back and forth on a decision. " },
  { emoji: "📈", label: "Think through the market",   prompt: "I want to think through what's happening in my market. " },
  { emoji: "👥", label: "People situation",            prompt: "I have a situation with someone on my team — " },
  { emoji: "🔗", label: "Full analysis",               prompt: "I need to think through something important completely. " },
];

interface Props {
  onStart: (message: string, mode: "conversation" | "structured") => void;
  onVoiceTranscript: (transcript: string) => void;
}

export default function NitiOpenScreen({ onStart, onVoiceTranscript }: Props) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleQuickStart = useCallback((prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(prompt.length, prompt.length);
    }, 40);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      onStart(input.trim(), "conversation");
    }
  };

  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input isn't supported on this browser. Please type instead."); return; }
    setIsListening(true);
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-IN";
    recog.onend = () => setIsListening(false);
    recog.onerror = () => setIsListening(false);
    recog.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript || "";
      setInput(transcript);
      onVoiceTranscript(transcript);
    };
    try { recog.start(); } catch { setIsListening(false); }
  }, [onVoiceTranscript]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 34 }}>⚖️</span>
        <div>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 22, color: N.gold, fontWeight: 700, letterSpacing: "0.04em" }}>Niti</div>
          <div style={{ fontSize: 12, color: N.muted, letterSpacing: "0.08em", marginTop: 2 }}>Business mind. No flattery.</div>
        </div>
      </div>

      {/* Input area */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: N.cream, fontFamily: "Libre Baskerville, serif" }}>
          What's on your mind?
        </div>
        <div style={{ fontSize: 13, color: N.steel, lineHeight: 1.55 }}>
          Tell Niti what you're working through. No structure needed — just talk.
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={5}
          autoFocus
          data-testid="niti-open-textarea"
          placeholder={"I'm trying to decide whether to...\nor\nSomething's been bothering me about my business..."}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${input.length > 0 ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 14,
            padding: "14px 16px",
            color: N.cream,
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.65,
            resize: "none",
            outline: "none",
            transition: "border-color 0.2s, background 0.2s",
            boxSizing: "border-box",
            minHeight: 120,
          }}
        />

        {isListening && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: N.gold }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: N.gold, animation: "pulse 0.8s ease-in-out infinite" }} />
            Listening…
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={startVoice}
            disabled={isListening}
            data-testid="niti-open-voice-btn"
            style={{
              flex: 1,
              padding: "13px 10px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12,
              color: isListening ? N.gold : N.steel,
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              cursor: isListening ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "all 0.2s",
            }}
          >
            🎤 {isListening ? "Listening…" : "Talk instead"}
          </button>
          <button
            onClick={() => { if (input.trim()) onStart(input.trim(), "conversation"); }}
            disabled={!input.trim()}
            data-testid="niti-open-start-btn"
            style={{
              flex: 2,
              padding: "13px 16px",
              background: input.trim() ? N.purple : "rgba(124,58,237,0.15)",
              border: "none",
              borderRadius: 12,
              color: input.trim() ? "#fff" : "rgba(255,255,255,0.25)",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            Start thinking →
          </button>
        </div>
      </div>

      {/* Quick starts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>
          Jump straight in:
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {QUICK_STARTS.map(qs => (
            <button
              key={qs.label}
              onClick={() => handleQuickStart(qs.prompt)}
              data-testid={`niti-quick-${qs.label.replace(/\s+/g, "-").toLowerCase()}`}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "13px 15px",
                background: N.purpleFaint,
                border: `1px solid ${N.purpleBorder}`,
                borderRadius: 11,
                color: "rgba(255,255,255,0.65)",
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.12)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.28)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateX(3px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = N.purpleFaint;
                (e.currentTarget as HTMLButtonElement).style.borderColor = N.purpleBorder;
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateX(0)";
              }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{qs.emoji}</span>
              <span>{qs.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider + structured modes */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,0.12)", fontSize: 11, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span>or use structured modes</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>
        <button
          onClick={() => onStart("", "structured")}
          data-testid="niti-structured-modes-btn"
          style={{
            width: "100%",
            padding: "13px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 11,
            color: "rgba(255,255,255,0.3)",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            transition: "all 0.15s",
            textAlign: "center",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          ⚡ Quick modes — Decision · Market · People · Stress-test
        </button>
      </div>
    </motion.div>
  );
}
