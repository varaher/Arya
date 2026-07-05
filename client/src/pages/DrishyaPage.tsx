import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, Bookmark, BookmarkCheck, Trash2, Plus, Loader2, ChevronDown, ChevronUp, Film, Download } from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";
import { useLanguage } from "@/lib/language-context";
import { getDrishyaWorldNames } from "@/lib/kaal-niti-language-patch";
import DrishyaBackground from "@/components/drishya/DrishyaBackground";
import CinematicReader from "@/components/drishya/CinematicReader";
import { drishyaAmbient } from "@/components/drishya/DrishyaAmbient";

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


function toLangCode(short: string): string {
  const map: Record<string, string> = {
    hi: "hi-IN", ml: "ml-IN", ta: "ta-IN", te: "te-IN",
    kn: "kn-IN", bn: "bn-IN", mr: "mr-IN", gu: "gu-IN",
    pa: "pa-IN", or: "or-IN",
  };
  return map[short] || "en-IN";
}

const BG_GRADIENTS: Record<DrishyaWorld, string> = {
  night:    "radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(49,46,129,0.25) 0%, transparent 60%)",
  film:     "radial-gradient(ellipse at 20% 0%, rgba(239,68,68,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(127,29,29,0.22) 0%, transparent 60%)",
  everyday: "radial-gradient(ellipse at 20% 0%, rgba(251,191,36,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(120,53,15,0.2) 0%, transparent 60%)",
};

export default function DrishyaPage() {
  const [, setLocation] = useLocation();
  const { token } = useUserAuth();
  const { t, language } = useLanguage();
  const worldNames = getDrishyaWorldNames(language);

  const [world, setWorld] = useState<DrishyaWorld>("night");
  const [request, setRequest] = useState("");
  const [story, setStory] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showCinema, setShowCinema] = useState(false);
  const [error, setError] = useState("");
  const [ambientOn, setAmbientOn] = useState(true);
  const [entered, setEntered] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null);

  const activeWorld = WORLDS.find((w) => w.id === world)!;

  useEffect(() => {
    if (token) fetchSavedStories();
  }, [token]);

  useEffect(() => { setEntered(true); }, []);

  useEffect(() => {
    if (isGenerating && ambientOn) drishyaAmbient.start(world);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating && !isNarrating) drishyaAmbient.stop(true);
  }, [isGenerating, isNarrating]);

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
        body: JSON.stringify({ world, request, language }),
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
        body: JSON.stringify({ text: story.slice(0, 1000), language: toLangCode(language) }),
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
    <div style={pageStyle} className={entered ? "drishya-ink-enter" : ""}>
      {/* Animated canvas background */}
      <DrishyaBackground world={world} active={isGenerating || story.length > 0} />

      {/* Accent colour gradient overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: BG_GRADIENTS[world],
        transition: "background 0.8s ease",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 680, margin: "0 auto", paddingBottom: 100 }}>

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
            {t("drishya_subtitle")}
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
                {worldNames[w.id as keyof Omit<typeof worldNames, "sub">]}
              </span>
              <span style={{ fontSize: 10, color: "rgba(240,235,224,0.3)", textAlign: "center", lineHeight: 1.3 }}>
                {worldNames.sub[w.id as keyof typeof worldNames.sub]}
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
                  {worldNames[world]} World
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

              {/* Cinematic line-by-line story reader */}
              <div ref={storyRef} data-testid="text-drishya-story">
                <CinematicReader
                  storyText={story}
                  isStreaming={isGenerating}
                  isNarrating={isNarrating}
                  world={world}
                />
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
                    {isNarrating ? t("drishya_stop") : t("drishya_listen")}
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
                      {isSaved ? t("drishya_saved_btn") : t("drishya_save")}
                    </button>
                  )}

                  <button
                    onClick={() => setShowCinema(true)}
                    data-testid="button-drishya-watch"
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "10px 16px", borderRadius: 12,
                      border: `1px solid ${activeWorld.color}66`,
                      background: activeWorld.bg,
                      color: activeWorld.color,
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    <Film size={14} /> Watch as movie
                  </button>

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
                    <Plus size={14} /> {t("drishya_new_story")}
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
                  {t("drishya_ask_label").toUpperCase()}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[t(`drishya_${world}_p0`), t(`drishya_${world}_p1`), t(`drishya_${world}_p2`), t(`drishya_${world}_p3`)].map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setRequest(s)}
                      data-testid={`button-drishya-suggestion-${idx}`}
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
                    world === "night" ? t("drishya_night_ph") :
                    world === "film" ? t("drishya_film_ph") :
                    t("drishya_everyday_ph")
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
                    {t("drishya_finding")}
                  </span>
                ) : (
                  `${t("drishya_tell_story")}  ${activeWorld.emoji}`
                )}
              </motion.button>

              {/* Footer hint */}
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "rgba(240,235,224,0.22)", letterSpacing: "0.03em" }}>
                {t("drishya_footer_note")}
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
                {t("drishya_saved_stories").toUpperCase()}
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

      {/* Ambient sound toggle */}
      <button
        data-testid="button-drishya-ambient"
        onClick={() => {
          setAmbientOn((v) => {
            if (v) { drishyaAmbient.stop(true); }
            else if (isGenerating || story) { drishyaAmbient.start(world); }
            return !v;
          });
        }}
        title={ambientOn ? "Mute ambient sound" : "Play ambient sound"}
        style={{
          position: "fixed", bottom: 28, right: 20, zIndex: 20,
          width: 44, height: 44, borderRadius: "50%",
          border: `1px solid ${ambientOn ? activeWorld.color + "55" : "rgba(255,255,255,0.1)"}`,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 18,
          color: ambientOn ? activeWorld.color : "rgba(255,255,255,0.35)",
          transition: "all 0.2s",
        }}
      >
        {ambientOn ? "🔊" : "🔇"}
      </button>

      {/* Keyframes */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes drishyaPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes drishyaInkWash {
          0%   { opacity: 0; filter: blur(8px) saturate(0); }
          40%  { opacity: 0.85; filter: blur(2px) saturate(0.4); }
          100% { opacity: 1; filter: blur(0) saturate(1); }
        }
        .drishya-ink-enter { animation: drishyaInkWash 1.1s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .drishya-line { will-change: opacity, transform; }
      `}</style>

      {/* Cinematic Movie Viewer */}
      {showCinema && story && (
        <DrishyaCinematicViewer
          story={story}
          world={world}
          onClose={() => setShowCinema(false)}
        />
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function cSleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?।\n]+(?:[.!?।]+|\n+)|[^.!?।\n]+$/g) || [];
  return raw.map((s) => s.trim()).filter((s) => s.length > 5);
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── DrishyaCinematicViewer ───────────────────────────────────────────────────

const CW = 720;
const CH = 1280;

const CINEMA_CFG: Record<DrishyaWorld, {
  bg: [string, string, string];
  text: string;
  accent: string;
  label: string;
  emoji: string;
}> = {
  night: {
    bg: ["#080618", "#18124a", "#0a0820"],
    text: "rgba(240,235,224,0.95)",
    accent: "#a78bfa",
    label: "Night World",
    emoji: "🌙",
  },
  film: {
    bg: ["#1c0500", "#3d1200", "#220a00"],
    text: "rgba(255,242,210,0.95)",
    accent: "#f87171",
    label: "Film World",
    emoji: "🎬",
  },
  everyday: {
    bg: ["#1a1000", "#3d2800", "#251800"],
    text: "rgba(255,245,228,0.95)",
    accent: "#fbbf24",
    label: "Everyday World",
    emoji: "✨",
  },
};

interface Particle { x: number; y: number; r: number; vy: number; alpha: number; }

function DrishyaCinematicViewer({
  story,
  world,
  onClose,
}: {
  story: string;
  world: DrishyaWorld;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const afRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Render state shared with RAF via refs
  const textRef = useRef("");
  const opacityRef = useRef(0);
  const targetOpRef = useRef(0);
  const progressRef = useRef({ cur: 0, total: 0 });

  const [phase, setPhase] = useState<"playing" | "done" | "error">("playing");
  const [sentenceDisplay, setSentenceDisplay] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);

  const cfg = CINEMA_CFG[world];
  const sentences = useMemo(() => splitSentences(story), [story]);

  // Init particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: world === "night" ? 90 : 45 }, () => ({
      x: Math.random() * CW,
      y: Math.random() * CH,
      r: world === "night" ? Math.random() * 1.5 + 0.3 : Math.random() * 2.5 + 0.5,
      vy: world === "night" ? -(Math.random() * 0.15 + 0.05) : Math.random() * 0.35 + 0.1,
      alpha: Math.random() * 0.6 + 0.2,
    }));
    progressRef.current = { cur: 0, total: sentences.length };
  }, [world, sentences.length]);

  // RAF canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function frame() {
      // Lerp opacity
      opacityRef.current += (targetOpRef.current - opacityRef.current) * 0.07;

      ctx.clearRect(0, 0, CW, CH);

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, CH);
      grad.addColorStop(0, cfg.bg[0]);
      grad.addColorStop(0.55, cfg.bg[1]);
      grad.addColorStop(1, cfg.bg[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);

      // Particles
      ctx.save();
      for (const p of particlesRef.current) {
        p.y += p.vy;
        if (world === "night") { if (p.y < 0) p.y = CH; }
        else { if (p.y > CH) { p.y = 0; p.x = Math.random() * CW; } }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = cfg.accent;
        ctx.globalAlpha = p.alpha * 0.45;
        ctx.fill();
      }
      ctx.restore();

      // Vignette
      const vig = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.28, CW / 2, CH / 2, CH * 0.78);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, CW, CH);

      // World label
      ctx.save();
      ctx.font = "600 24px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = cfg.accent;
      ctx.globalAlpha = 0.55;
      ctx.fillText(`${cfg.emoji}  ${cfg.label}`, CW / 2, 84);
      ctx.restore();

      // Main sentence text
      const op = opacityRef.current;
      if (op > 0.02 && textRef.current) {
        ctx.save();
        ctx.globalAlpha = op;
        ctx.font = "bold 50px Georgia, 'Times New Roman', serif";
        ctx.textAlign = "center";
        ctx.fillStyle = cfg.text;
        ctx.shadowColor = cfg.accent;
        ctx.shadowBlur = 28;
        const pad = 90;
        const lines = wrapCanvasText(ctx, textRef.current, CW - pad * 2);
        const lh = 70;
        const totalH = lines.length * lh;
        const sy = CH / 2 - totalH / 2 + lh * 0.6;
        lines.forEach((ln, i) => ctx.fillText(ln, CW / 2, sy + i * lh));
        ctx.restore();
      }

      // Progress dots
      const { cur, total } = progressRef.current;
      if (total > 0) {
        const dotR = Math.max(4, Math.min(8, (CW - 100) / total / 2 - 3));
        const spacing = dotR * 2 + 7;
        const startX = CW / 2 - (total * spacing) / 2 + spacing / 2;
        for (let i = 0; i < total; i++) {
          ctx.beginPath();
          ctx.arc(startX + i * spacing, CH - 96, dotR, 0, Math.PI * 2);
          ctx.fillStyle = i < cur ? cfg.accent : "rgba(255,255,255,0.18)";
          ctx.globalAlpha = i < cur ? 0.9 : 0.4;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ARYA watermark
      ctx.save();
      ctx.font = "500 21px 'Space Grotesk', Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.fillText("ARYA · Drishya", CW / 2, CH - 44);
      ctx.restore();

      afRef.current = requestAnimationFrame(frame);
    }

    frame();
    return () => cancelAnimationFrame(afRef.current);
  }, [world, cfg]);

  // MediaRecorder setup — video-only (audio plays via <audio> element, reliable on mobile)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof (canvas as any).captureStream !== "function") {
      setCanRecord(false);
      return;
    }

    try {
      const videoStream: MediaStream = (canvas as any).captureStream(15);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
      if (!mime) { setCanRecord(false); return; }

      const recorder = new MediaRecorder(videoStream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (blob.size > 1000) setDownloadUrl(URL.createObjectURL(blob));
      };
      recorder.onerror = () => setCanRecord(false);

      recorder.start(500);
      setCanRecord(true);
    } catch {
      setCanRecord(false);
    }
  }, []);

  // TTS sequencer — uses <audio> element for speaker (works on mobile after user tap)
  useEffect(() => {
    let cancelled = false;

    async function playTTS(sentence: string): Promise<boolean> {
      try {
        const res = await fetch("/api/arya/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sentence, language: toLangCode(language) }),
        });
        if (!res.ok) return false;
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        return new Promise<boolean>((resolve) => {
          const cleanup = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            resolve(true);
          };
          audio.onended = cleanup;
          audio.onerror = () => { URL.revokeObjectURL(audioUrl); currentAudioRef.current = null; resolve(false); };
          const p = audio.play();
          if (p) p.catch(() => { URL.revokeObjectURL(audioUrl); currentAudioRef.current = null; resolve(false); });
          // Safety timeout — 3× estimated word-count duration
          setTimeout(() => { audio.pause(); cleanup(); }, Math.max(15000, sentence.split(" ").length * 600));
        });
      } catch {
        return false;
      }
    }

    async function runSequence() {
      await cSleep(1600);

      for (let i = 0; i < sentences.length; i++) {
        if (cancelled) break;
        const sentence = sentences[i];
        textRef.current = sentence;
        targetOpRef.current = 1;
        progressRef.current.cur = i;
        setSentenceDisplay(i + 1);

        await cSleep(500); // fade-in

        if (cancelled) break;

        const spoke = await playTTS(sentence);
        if (!spoke && !cancelled) {
          // Fallback: reading-time wait
          await cSleep(Math.max(2500, sentence.split(" ").length * 340));
        }

        if (cancelled) break;

        targetOpRef.current = 0;
        await cSleep(550); // fade-out
        await cSleep(300); // pause between sentences
      }

      if (!cancelled) {
        progressRef.current.cur = sentences.length;
        textRef.current = "";
        targetOpRef.current = 0;
        await cSleep(1800);
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        setPhase("done");
      }
    }

    runSequence();
    return () => {
      cancelled = true;
      // Stop any playing audio immediately
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [sentences]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(afRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    };
  }, []);

  function handleDownload() {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `drishya-${world}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 300);
  }

  function handleClose() {
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    // Don't revoke downloadUrl here — user may still want to download after closing
    onClose();
  }

  return (
    <div
      data-testid="overlay-drishya-cinema"
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "#000",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{
          maxHeight: "calc(100dvh - 110px)",
          width: "auto",
          borderRadius: 10,
          display: "block",
        }}
      />

      {/* Bottom controls */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        padding: "16px 20px 28px",
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>
          {phase === "playing"
            ? `${sentenceDisplay} / ${sentences.length}  ·  ${canRecord ? "● Recording" : "Playing"}`
            : "Finished"}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleClose}
            data-testid="button-cinema-close"
            style={{
              padding: "9px 18px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.65)", fontSize: 13, cursor: "pointer",
            }}
          >
            ✕  Close
          </button>

          {phase === "done" && downloadUrl ? (
            <button
              onClick={handleDownload}
              data-testid="button-cinema-download"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 10,
                border: `1px solid ${cfg.accent}88`,
                background: cfg.accent + "22",
                color: cfg.accent, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Download size={14} /> Save video
            </button>
          ) : phase === "done" && !canRecord ? (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Video export not supported in this browser
            </span>
          ) : phase === "playing" && canRecord ? (
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 10,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "rgba(239,68,68,0.8)", fontSize: 12,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "#ef4444",
                animation: "blink 1s step-end infinite", display: "inline-block",
              }} />
              Recording…
            </span>
          ) : null}
        </div>
      </div>

      {/* Top-right close */}
      <button
        onClick={handleClose}
        style={{
          position: "absolute", top: 14, right: 16,
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.13)",
          color: "rgba(255,255,255,0.6)", fontSize: 15,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ✕
      </button>
    </div>
  );
}
