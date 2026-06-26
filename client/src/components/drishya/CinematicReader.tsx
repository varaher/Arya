import { useEffect, useRef, useState } from "react";

type DrishyaWorld = "night" | "film" | "everyday";

interface Props {
  storyText: string;
  isStreaming: boolean;
  isNarrating: boolean;
  world: DrishyaWorld;
  onLineReveal?: (lineIndex: number) => void;
}

const WORLD_COLORS = {
  night:    { primary: "#e8e0d0", dim: "rgba(232,224,208,0.38)", accent: "#b8923f" },
  film:     { primary: "#f0e8d0", dim: "rgba(240,232,208,0.38)", accent: "#c8783a" },
  everyday: { primary: "#e0d8c8", dim: "rgba(224,216,200,0.38)", accent: "#a87a3a" },
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।…])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export default function CinematicReader({
  storyText,
  isStreaming,
  isNarrating,
  world,
  onLineReveal,
}: Props) {
  const [sentences, setSentences] = useState<string[]>([]);
  const [revealedLines, setRevealedLines] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = WORLD_COLORS[world];

  useEffect(() => {
    const split = splitSentences(storyText);
    setSentences(split);
    if (isStreaming) setRevealedLines(split.length);
  }, [storyText, isStreaming]);

  useEffect(() => {
    if (isNarrating || isStreaming) return;
    if (sentences.length === 0) return;
    setRevealedLines(0);
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setRevealedLines(current);
      onLineReveal?.(current - 1);
      if (current >= sentences.length) clearInterval(interval);
    }, 1800);
    return () => clearInterval(interval);
  }, [sentences, isStreaming, isNarrating]);

  useEffect(() => {
    if (!isNarrating || sentences.length === 0) return;
    setRevealedLines(0);
    let cumulativeDelay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    sentences.forEach((sentence, i) => {
      const wordCount = sentence.split(/\s+/).length;
      const durationMs = (wordCount / 130) * 60 * 1000;
      const t = setTimeout(() => {
        setRevealedLines(i + 1);
        onLineReveal?.(i);
      }, cumulativeDelay);
      timeouts.push(t);
      cumulativeDelay += durationMs;
    });

    return () => timeouts.forEach(clearTimeout);
  }, [sentences, isNarrating]);

  useEffect(() => {
    if (!containerRef.current) return;
    const lines = containerRef.current.querySelectorAll<HTMLElement>(".drishya-line");
    const lastRevealed = lines[revealedLines - 1];
    if (lastRevealed) {
      lastRevealed.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [revealedLines]);

  if (sentences.length === 0 && isStreaming) {
    return (
      <div style={{ textAlign: "center", padding: "40px 24px", color: colors.accent, fontSize: 26, letterSpacing: 6, animation: "drishyaPulse 1.4s ease infinite" }}>
        · · ·
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ maxWidth: 620, margin: "0 auto", padding: "0 24px" }}
    >
      {sentences.map((sentence, i) => {
        const isRevealed = i < revealedLines;
        const isCurrent = i === revealedLines - 1;
        return (
          <p
            key={i}
            className="drishya-line"
            style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "clamp(17px, 3.5vw, 22px)",
              lineHeight: 1.8,
              letterSpacing: "0.01em",
              marginBottom: "1.2em",
              color: isRevealed ? colors.primary : "transparent",
              opacity: isCurrent ? 1 : isRevealed ? 0.52 : 0,
              transform: isRevealed ? "translateY(0)" : "translateY(14px)",
              transition: "opacity 0.95s ease, transform 0.95s ease",
              fontStyle: "italic",
              textAlign: "center",
              userSelect: "text",
            }}
          >
            {sentence}
          </p>
        );
      })}

      {isStreaming && (
        <div style={{
          textAlign: "center",
          color: colors.accent,
          fontSize: 26,
          letterSpacing: 6,
          animation: "drishyaPulse 1.4s ease infinite",
          padding: "8px 0",
        }}>
          · · ·
        </div>
      )}
    </div>
  );
}
