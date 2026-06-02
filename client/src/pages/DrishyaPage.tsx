import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, Bookmark, BookmarkCheck, Trash2, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";

type DrishyaWorld = "night" | "film" | "everyday";

interface SavedStory {
  id: string;
  world: DrishyaWorld;
  request: string;
  story: string;
  language: string;
  createdAt: string;
}

const WORLDS: { id: DrishyaWorld; emoji: string; label: string; sub: string; color: string; bg: string; glow: string }[] = [
  { id: "night",     emoji: "🌙", label: "Night",    sub: "Bedtime · Personal · Warm",    color: "#818cf8", bg: "rgba(99,102,241,0.12)",  glow: "rgba(99,102,241,0.25)" },
  { id: "film",      emoji: "🎬", label: "Film",     sub: "Scripts · Scenes · Drama",     color: "#f87171", bg: "rgba(239,68,68,0.12)",   glow: "rgba(239,68,68,0.25)" },
  { id: "everyday",  emoji: "✨", label: "Everyday", sub: "Today · Close · True",         color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  glow: "rgba(251,191,36,0.25)" },
];

const SUGGESTIONS: Record<DrishyaWorld, string[]> = {
  night: [
    "A story for someone who feels lost tonight",
    "Tell me a story about waiting",
    "A story that helps me rest with courage",
    "Something small that holds a large truth",
  ],
  film: [
    "A scene about betrayal between old friends",
    "A character who must choose between duty and love",
    "Opening scene: a village the morning after something changed",
    "A father and son who can't say the thing they mean",
  ],
  everyday: [
    "A story about small courage",
    "Something true about ordinary love",
    "A story for someone starting something new",
    "Tell me what longing looks like in a busy street",
  ],
};

const BG_GRADIENTS: Record<DrishyaWorld, string> = {
  night:    "radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(49,46,129,0.25) 0%, transparent 60%)",
  film:     "radial-gradient(ellipse at 20% 0%, rgba(239,68,68,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(127,29,29,0.22) 0%, transparent 60%)",
  everyday: "radial-gradient(ellipse at 20% 0%, rgba(251,191,36,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(120,53,15,0.2) 0%, transparent 60%)",
};

export default function DrishyaPage() {
  const [, setLocation] = useLocation();
  const { token } = useUserAuth();

  const [world, setWorld] = useState<DrishyaWorld>("night");
  const [request, setRequest] = useState("");
  const [story, setStory] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null);

  const activeWorld = WORLDS.find((w) => w.id === world)!;

  useEffect(() => {
    if (token) fetchSavedStories();
  }, [token]);

  async function fetchSavedStories() {
    try {
      const res = await fetch("/api/drishya/stories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSavedStories(await res.json());
    } catch {}
  }

  const generateStory = useCallback(async () => {
    if (!request.trim() || isGenerating) return;
    setStory("");
    setIsSaved(false);
    setError("");
    setIsGenerating(true);

    if (streamReaderRef.current) {
      try { streamReaderRef.current.cancel(); } catch {}
      streamReaderRef.current = null;
    }

    try {
      const res = await fetch("/api/drishya/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ world, request }),
      });

      if (!res.ok) throw new Error("Story generation failed");
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      streamReaderRef.current = reader;
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                accumulated += parsed.token;
                setStory(accumulated);
                if (storyRef.current) {
                  storyRef.current.scrollTop = storyRef.current.scrollHeight;
                }
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setError("Could not reach the story. Try again.");
    } finally {
      setIsGenerating(false);
      streamReaderRef.current = null;
    }
  }, [request, world, token, isGenerating]);

  async function saveStory() {
    if (!story || isSaved || !token) return;
    try {
      const res = await fetch("/api/drishya/stories/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ world, request, story }),
      });
      if (res.ok) {
        setIsSaved(true);
        fetchSavedStories();
      }
    } catch {}
  }

  async function deleteStory(id: string) {
    try {
      await fetch(`/api/drishya/stories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedStories((p) => p.filter((s) => s.id !== id));
    } catch {}
  }

  async function narrateStory() {
    if (!story || isNarrating) return;
    if (isNarrating) {
      audioRef.current?.pause();
      setIsNarrating(false);
      return;
    }
    setIsNarrating(true);
    try {
      const res = await fetch("/api/arya/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: story.slice(0, 1000), language: "en-IN" }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsNarrating(false);
      audio.onerror = () => setIsNarrating(false);
      await audio.play();
    } catch {
      setIsNarrating(false);
    }
  }

  function resetForNewStory() {
    setStory("");
    setRequest("");
    setIsSaved(false);
    setError("");
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "#07040f",
    color: "#f0ebe0",
    fontFamily: "Inter, sans-serif",
    overflowX: "hidden",
    position: "relative",
  };

  const canGenerate = request.trim().length > 3 && !isGenerating;

  return (
    <div style={pageStyle}>
      {/* Ambient gradient overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: BG_GRADIENTS[world],
        transition: "background 0.8s ease",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", paddingBottom: 100 }}>

        {/* ── Top Bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" }}>
          <button
            onClick={() => setLocation("/")}
            data-testid="button-drishya-back"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "7px 12px", color: "rgba(240,235,224,0.7)",
              fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> ARYA
          </button>

          {savedStories.length > 0 && (
            <button
              onClick={() => setShowSaved(!showSaved)}
              data-testid="button-drishya-saved"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "7px 12px", color: "rgba(240,235,224,0.6)",
                fontSize: 12, cursor: "pointer",
              }}
            >
              <Bookmark size={13} />
              {savedStories.length} saved
              {showSaved ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", padding: "32px 20px 8px" }}
        >
          <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(240,235,224,0.35)", marginBottom: 10, fontWeight: 600 }}>
            ARYA PRESENTS
          </div>
          <div style={{
            fontSize: 42, fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #f0ebe0 0%, rgba(240,235,224,0.7) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 8,
          }}>
            Drishya
          </div>
          <div style={{ fontSize: 14, color: "rgba(240,235,224,0.45)", letterSpacing: "0.04em" }}>
            Stories that find you
          </div>
        </motion.div>

        {/* ── World Selector ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={{ display: "flex", gap: 10, padding: "20px 20px 0", justifyContent: "center" }}
        >
          {WORLDS.map((w) => (
            <button
              key={w.id}
              data-testid={`button-drishya-world-${w.id}`}
              onClick={() => { setWorld(w.id); setStory(""); setRequest(""); setError(""); }}
              style={{
                flex: 1, maxWidth: 180,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "14px 10px",
                borderRadius: 16,
                border: world === w.id ? `1px solid ${w.color}55` : "1px solid rgba(255,255,255,0.08)",
                background: world === w.id ? w.bg : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                transition: "all 0.25s",
                boxShadow: world === w.id ? `0 0 20px ${w.glow}` : "none",
              }}
            >
              <span style={{ fontSize: 22 }}>{w.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: world === w.id ? w.color : "rgba(240,235,224,0.6)" }}>
                {w.label}
              </span>
              <span style={{ fontSize: 10, color: "rgba(240,235,224,0.3)", textAlign: "center", lineHeight: 1.3 }}>
                {w.sub}
              </span>
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── Story Display ── */}
          {story || isGenerating ? (
            <motion.div
              key="story-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              style={{ padding: "28px 20px 0" }}
            >
              {/* Story world badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 16 }}>{activeWorld.emoji}</span>
                <span style={{ fontSize: 11, color: activeWorld.color, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>
                  {activeWorld.label} World
                </span>
                {isGenerating && (
                  <Loader2 size={13} style={{ color: activeWorld.color, animation: "spin 1s linear infinite", marginLeft: 4 }} />
                )}
              </div>

              {/* Story request echo */}
              <div style={{
                fontSize: 12, color: "rgba(240,235,224,0.35)", fontStyle: "italic",
                marginBottom: 20, paddingLeft: 12, borderLeft: `2px solid ${activeWorld.color}44`,
              }}>
                {request}
              </div>

              {/* Story text */}
              <div
                ref={storyRef}
                data-testid="text-drishya-story"
                style={{
                  fontSize: 17, lineHeight: 1.85,
                  color: "rgba(240,235,224,0.88)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  letterSpacing: "0.01em",
                  minHeight: 120,
                }}
              >
                {story}
                {isGenerating && (
                  <span style={{
                    display: "inline-block", width: 2, height: "1em",
                    background: activeWorld.color,
                    animation: "blink 1s step-end infinite",
                    verticalAlign: "text-bottom", marginLeft: 2,
                  }} />
                )}
              </div>

              {/* Action bar */}
              {!isGenerating && story && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}
                >
                  <button
                    onClick={narrateStory}
                    data-testid="button-drishya-narrate"
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "10px 16px", borderRadius: 12,
                      border: `1px solid ${activeWorld.color}44`,
                      background: isNarrating ? activeWorld.bg : "rgba(255,255,255,0.05)",
                      color: isNarrating ? activeWorld.color : "rgba(240,235,224,0.7)",
                      fontSize: 13, cursor: "pointer",
                    }}
                  >
                    {isNarrating ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {isNarrating ? "Stop" : "Listen"}
                  </button>

                  {token && (
                    <button
                      onClick={saveStory}
                      disabled={isSaved}
                      data-testid="button-drishya-save"
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "10px 16px", borderRadius: 12,
                        border: isSaved ? `1px solid ${activeWorld.color}88` : "1px solid rgba(255,255,255,0.12)",
                        background: isSaved ? activeWorld.bg : "rgba(255,255,255,0.05)",
                        color: isSaved ? activeWorld.color : "rgba(240,235,224,0.7)",
                        fontSize: 13, cursor: isSaved ? "default" : "pointer",
                      }}
                    >
                      {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      {isSaved ? "Saved" : "Save"}
                    </button>
                  )}

                  <button
                    onClick={resetForNewStory}
                    data-testid="button-drishya-new"
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "10px 16px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(240,235,224,0.5)",
                      fontSize: 13, cursor: "pointer",
                    }}
                  >
                    <Plus size={14} /> New story
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (

            /* ── Request Panel ── */
            <motion.div
              key="request-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{ padding: "28px 20px 0" }}
            >
              {/* Suggestion chips */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "rgba(240,235,224,0.3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
                  ASK FOR A STORY
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SUGGESTIONS[world].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRequest(s)}
                      data-testid={`button-drishya-suggestion-${s.slice(0, 20).toLowerCase().replace(/\s/g, "-")}`}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 20,
                        border: request === s ? `1px solid ${activeWorld.color}88` : "1px solid rgba(255,255,255,0.1)",
                        background: request === s ? activeWorld.bg : "rgba(255,255,255,0.04)",
                        color: request === s ? activeWorld.color : "rgba(240,235,224,0.55)",
                        fontSize: 12, cursor: "pointer",
                        transition: "all 0.2s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <div style={{ position: "relative" }}>
                <textarea
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generateStory(); }}
                  placeholder={
                    world === "night" ? "What story are you looking for tonight…" :
                    world === "film" ? "Describe the scene or character…" :
                    "What story should find you today…"
                  }
                  data-testid="input-drishya-request"
                  rows={3}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${request.length > 3 ? activeWorld.color + "55" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 16, padding: "14px 16px",
                    color: "#f0ebe0", fontSize: 15, lineHeight: 1.6,
                    resize: "none", outline: "none",
                    fontFamily: "Inter, sans-serif",
                    transition: "border-color 0.2s",
                    caretColor: activeWorld.color,
                  }}
                />
              </div>

              {error && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>{error}</div>
              )}

              {/* Generate button */}
              <motion.button
                onClick={generateStory}
                disabled={!canGenerate}
                data-testid="button-drishya-generate"
                whileHover={canGenerate ? { scale: 1.02 } : {}}
                whileTap={canGenerate ? { scale: 0.97 } : {}}
                style={{
                  marginTop: 14, width: "100%",
                  padding: "15px 24px",
                  borderRadius: 16,
                  border: "none",
                  background: canGenerate
                    ? `linear-gradient(135deg, ${activeWorld.color} 0%, ${activeWorld.color}cc 100%)`
                    : "rgba(255,255,255,0.07)",
                  color: canGenerate ? "#07040f" : "rgba(240,235,224,0.3)",
                  fontSize: 15, fontWeight: 700,
                  cursor: canGenerate ? "pointer" : "default",
                  letterSpacing: "0.02em",
                  boxShadow: canGenerate ? `0 4px 24px ${activeWorld.glow}` : "none",
                  transition: "all 0.25s",
                }}
              >
                {isGenerating ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                    Finding your story…
                  </span>
                ) : (
                  `Tell this story  ${activeWorld.emoji}`
                )}
              </motion.button>

              {/* Footer hint */}
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "rgba(240,235,224,0.22)", letterSpacing: "0.03em" }}>
                Every story arrives whole. No sources. No citations. Only the story.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Saved Stories ── */}
        <AnimatePresence>
          {showSaved && savedStories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ padding: "24px 20px 0", overflow: "hidden" }}
            >
              <div style={{
                height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 20,
              }} />
              <div style={{ fontSize: 10, color: "rgba(240,235,224,0.3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
                SAVED STORIES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {savedStories.map((s) => {
                  const w = WORLDS.find((x) => x.id === s.world)!;
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      data-testid={`card-drishya-saved-${s.id}`}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 14, padding: 16,
                        cursor: "pointer",
                      }}
                      onClick={() => { setWorld(s.world); setRequest(s.request); setStory(s.story); setIsSaved(true); setShowSaved(false); }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontSize: 14 }}>{w.emoji}</span>
                          <span style={{ fontSize: 11, color: w.color, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{w.label}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteStory(s.id); }}
                          data-testid={`button-drishya-delete-${s.id}`}
                          style={{ background: "none", border: "none", color: "rgba(240,235,224,0.25)", cursor: "pointer", padding: 4 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(240,235,224,0.45)", fontStyle: "italic", marginBottom: 6 }}>
                        {s.request}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(240,235,224,0.65)", lineHeight: 1.6, fontFamily: "Georgia, serif",
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {s.story}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Cursor blink + spin keyframes */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
