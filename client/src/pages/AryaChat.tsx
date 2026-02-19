import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Send,
  Mic,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  Square,
  PanelLeftOpen,
  PanelLeftClose,
  Globe,
  Volume2,
  VolumeX,
} from "lucide-react";

function FormattedMessage({ content, isUser }: { content: string; isUser?: boolean }) {
  if (isUser) {
    return <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>;
  }
  return (
    <div className="prose-arya text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 text-white/90">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-cyan-300">{children}</strong>,
          em: ({ children }) => <em className="text-amber-300/90 not-italic font-medium">{children}</em>,
          h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-2 mt-3 first:mt-0 pb-1 border-b border-white/10">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-cyan-300 mb-1.5 mt-2 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="space-y-1.5 my-2 pl-0">{children}</ul>,
          ol: ({ children }) => {
            let counter = 0;
            const numberedChildren = Array.isArray(children)
              ? children.map((child: any) => {
                  if (child?.type === 'li' || (child?.props && child?.type)) {
                    counter++;
                    return child?.props ? { ...child, props: { ...child.props, 'data-index': counter } } : child;
                  }
                  return child;
                })
              : children;
            return <ol className="space-y-2 my-2 pl-0">{numberedChildren}</ol>;
          },
          li: ({ children, ...props }: any) => {
            const node = props.node;
            const isOrdered = node?.parentNode?.tagName === 'ol';
            const siblings = node?.parentNode?.children?.filter((c: any) => c.tagName === 'li') || [];
            const num = siblings.indexOf(node) + 1;
            return isOrdered ? (
              <li className="flex gap-2.5 items-start text-white/90 list-none">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-300 mt-0.5">
                  {num}
                </span>
                <span className="flex-1">{children}</span>
              </li>
            ) : (
              <li className="flex gap-2 items-start text-white/90 list-none">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5" />
                <span className="flex-1">{children}</span>
              </li>
            );
          },
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            return isBlock ? (
              <pre className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto">
                <code className="text-xs font-mono text-emerald-300">{children}</code>
              </pre>
            ) : (
              <code className="bg-white/10 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/50 pl-3 my-2 text-white/70 italic">{children}</blockquote>
          ),
          hr: () => <hr className="border-white/10 my-3" />,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

interface LanguageOption {
  code: string;
  name: string;
  native: string;
}

const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: "en-IN", name: "English", native: "English" },
  { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
  { code: "bn-IN", name: "Bengali", native: "বাংলা" },
  { code: "ta-IN", name: "Tamil", native: "தமிழ்" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
  { code: "mr-IN", name: "Marathi", native: "मराठी" },
  { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം" },
  { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ" },
];

export default function AryaChat() {
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [responseMode, setResponseMode] = useState<"instant" | "thinking" | null>(null);
  const [responseModeIcon, setResponseModeIcon] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/arya/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/arya/conversations");
      return res.json();
    },
  });

  const { data: conversationData } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/arya/conversations", activeConversation],
    queryFn: async () => {
      if (!activeConversation) return { messages: [] };
      const res = await fetch(`/api/arya/conversations/${activeConversation}`);
      return res.json();
    },
    enabled: !!activeConversation,
  });

  const messages = conversationData?.messages || [];

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/arya/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveConversation(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/arya/conversations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      if (activeConversation) {
        setActiveConversation(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLanguageMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const playAudioBase64 = useCallback((base64Audio: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const byteChars = atob(base64Audio);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudio(true);
      audio.onended = () => {
        setPlayingAudio(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingAudio(false);
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch (err) {
      console.error("Audio playback error:", err);
      setPlayingAudio(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudio(false);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    let convId = activeConversation;
    if (!convId) {
      const conv = await createConversation.mutateAsync(
        text.slice(0, 50) + (text.length > 50 ? "..." : "")
      );
      convId = conv.id;
    }

    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setTranslatedContent(null);
    setShowSidebar(false);

    queryClient.setQueryData(
      ["/api/arya/conversations", convId],
      (old: any) => ({
        ...old,
        messages: [
          ...(old?.messages || []),
          { id: Date.now(), conversationId: convId, role: "user", content: text, createdAt: new Date().toISOString() },
        ],
      })
    );

    try {
      const response = await fetch(`/api/arya/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, tenant_id: "varah" }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "meta") {
              setResponseMode(event.mode);
              setResponseModeIcon(event.icon || null);
            }
            if (event.content) {
              fullContent += event.content;
              setStreamingContent(fullContent);
            }
            if (event.done) {
              queryClient.invalidateQueries({
                queryKey: ["/api/arya/conversations", convId],
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setResponseMode(null);
      setResponseModeIcon(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/arya/conversations", convId],
      });
    }
  }, [activeConversation, isStreaming, queryClient, createConversation]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve(b);
      };
      recorder.stop();
    });

    setIsRecording(false);
    setRecordingTime(0);
    setShowSidebar(false);

    if (blob.size === 0) return;

    let convId = activeConversation;
    if (!convId) {
      const conv = await createConversation.mutateAsync("Voice Chat");
      convId = conv.id;
    }

    setIsStreaming(true);
    setStreamingContent("");
    setTranslatedContent(null);

    try {
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      const response = await fetch(`/api/arya/conversations/${convId}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64Audio, tenant_id: "varah", language: selectedLanguage }),
      });

      const streamReader = response.body?.getReader();
      if (!streamReader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await streamReader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "user_transcript") {
              queryClient.setQueryData(
                ["/api/arya/conversations", convId],
                (old: any) => ({
                  ...old,
                  messages: [
                    ...(old?.messages || []),
                    {
                      id: Date.now(),
                      conversationId: convId,
                      role: "user",
                      content: event.content,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                })
              );
            }
            if (event.type === "assistant" && event.content) {
              fullContent += event.content;
              setStreamingContent(fullContent);
            }
            if (event.type === "translated_response") {
              setTranslatedContent(event.content);
            }
            if (event.type === "audio_response" && event.audio) {
              playAudioBase64(event.audio);
            }
            if (event.type === "done") {
              queryClient.invalidateQueries({
                queryKey: ["/api/arya/conversations", convId],
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Voice error:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({
        queryKey: ["/api/arya/conversations", convId],
      });
    }
  }, [activeConversation, queryClient, createConversation, selectedLanguage, playAudioBase64]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentLang = DEFAULT_LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] gap-0 md:gap-4 relative" data-testid="page-arya-chat">
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-30 md:z-auto top-0 left-0 h-full w-72 md:w-64 lg:w-72 flex-shrink-0 flex flex-col bg-card/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-r md:border-r-0 border-border/50 transition-transform duration-300 pt-14 md:pt-0`}
      >
        <div className="p-3 border-b border-border/20">
          <div className="flex items-center gap-2 mb-3 px-1">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Chat History</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 ml-auto">
              {conversations.length}
            </span>
          </div>
          <Button
            data-testid="button-new-chat"
            onClick={() => {
              createConversation.mutate("New Chat");
              setShowSidebar(false);
            }}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/20"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 px-2 py-2" data-testid="list-conversations">
          {conversations.map((conv) => {
            const date = new Date(conv.createdAt);
            const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return (
              <div
                key={conv.id}
                data-testid={`card-conversation-${conv.id}`}
                onClick={() => {
                  setActiveConversation(conv.id);
                  setShowSidebar(false);
                }}
                className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  activeConversation === conv.id
                    ? "bg-gradient-to-r from-cyan-500/15 to-transparent border border-cyan-500/25 text-white"
                    : "hover:bg-white/5 text-muted-foreground hover:text-white border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  activeConversation === conv.id
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-white/5 text-white/40"
                }`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="truncate text-sm block leading-tight">{conv.title}</span>
                  <span className="text-[10px] text-white/30 mt-0.5 block">{timeStr}</span>
                </div>
                <button
                  data-testid={`button-delete-conversation-${conv.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation.mutate(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {conversations.length === 0 && (
            <div className="text-center py-8 px-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-muted-foreground text-sm">No conversations yet</p>
              <p className="text-white/30 text-xs mt-1">Start chatting with ARYA!</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-3 py-2 md:hidden border-b border-border/20">
          <button
            data-testid="button-toggle-conversations"
            onClick={() => setShowSidebar(!showSidebar)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card/40 border border-border/30 hover:bg-card/60 transition-all"
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4 text-cyan-400" /> : <PanelLeftOpen className="w-4 h-4 text-cyan-400" />}
            <span className="text-xs font-medium text-white/80">History</span>
            {conversations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
                {conversations.length}
              </span>
            )}
          </button>
          <span className="text-sm text-muted-foreground truncate max-w-[50%]">
            {activeConversation
              ? conversations.find((c) => c.id === activeConversation)?.title || "Chat"
              : "New Chat"}
          </span>
          <button
            data-testid="button-new-chat-mobile"
            onClick={() => createConversation.mutate("New Chat")}
            className="p-1.5 rounded-lg bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-all"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 md:py-4 space-y-3 md:space-y-4" data-testid="list-messages">
          {!activeConversation && messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-amber-500/20 flex items-center justify-center mb-4 md:mb-6">
                <span className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                  A
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-2" data-testid="text-welcome-title">
                Hey, I'm ARYA
              </h2>
              <p className="text-muted-foreground max-w-md mb-6 md:mb-8 text-sm md:text-base">
                Ask me anything — quick facts, deep analysis, creative writing, health advice, business strategy, or just a conversation. I'm voice-enabled too.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-w-lg w-full">
                {[
                  { text: "What's the time right now?", badge: "Instant" },
                  { text: "Write me an email to my team about our new product launch", badge: "Creative" },
                  { text: "Compare pros and cons of starting a franchise vs independent business", badge: "Analysis" },
                  { text: "Convert 72 kg to pounds", badge: "Utility" },
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    data-testid={`button-suggestion-${i}`}
                    onClick={() => sendMessage(suggestion.text)}
                    className="text-left px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-border/50 bg-card/30 text-sm text-muted-foreground hover:text-white hover:border-primary/40 hover:bg-card/60 transition-all group"
                  >
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-cyan-400/60 group-hover:text-cyan-400 mb-1 block">{suggestion.badge}</span>
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.role}-${msg.id}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                  msg.role === "user"
                    ? "bg-primary/20 border border-primary/30 text-white"
                    : "bg-card/60 border border-border/30 text-white/90"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                      ARYA
                    </span>
                  </div>
                )}
                <FormattedMessage content={msg.content} isUser={msg.role === "user"} />
              </div>
            </div>
          ))}

          {streamingContent && (
            <div className="flex justify-start" data-testid="message-streaming">
              <div className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                responseMode === "instant"
                  ? "bg-gradient-to-br from-amber-500/10 to-cyan-500/10 border border-amber-500/20"
                  : "bg-card/60 border border-border/30"
              } text-white/90`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                  {responseMode === "instant" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/20">
                      Instant
                    </span>
                  )}
                </div>
                <div className="relative">
                  <FormattedMessage content={streamingContent} />
                  <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
                </div>
                {translatedContent && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-amber-400">{currentLang?.native || selectedLanguage}</span>
                    </div>
                    <div className="text-white/80">
                      <FormattedMessage content={translatedContent} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start" data-testid="message-thinking">
              <div className="rounded-2xl px-3 md:px-4 py-2.5 md:py-3 bg-card/60 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {selectedLanguage !== "en-IN" ? "Listening & translating..." : "Processing..."}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-2 sm:px-4 pb-3 md:pb-4 pt-1 md:pt-2">
          {playingAudio && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                <div className="flex gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-amber-400 rounded-full animate-pulse"
                      style={{ height: `${8 + Math.random() * 10}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-amber-400">ARYA is speaking...</span>
                <button
                  data-testid="button-stop-audio"
                  onClick={stopAudio}
                  className="p-0.5 rounded-full hover:bg-amber-500/20"
                >
                  <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          )}
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <div className="flex items-end gap-1.5 md:gap-2 p-2 md:p-3">
              <div className="relative" ref={langMenuRef}>
                <Button
                  data-testid="button-language-select"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 ${
                    selectedLanguage !== "en-IN"
                      ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                      : "text-muted-foreground hover:text-white hover:bg-card"
                  }`}
                  title={`Voice language: ${currentLang?.name || "English"}`}
                >
                  <Globe className="w-4 h-4" />
                </Button>
                {showLanguageMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-border/30">
                      <p className="text-xs font-medium text-muted-foreground">Voice Language</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {DEFAULT_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          data-testid={`button-lang-${lang.code}`}
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setShowLanguageMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${
                            selectedLanguage === lang.code ? "text-primary bg-primary/10" : "text-white/80"
                          }`}
                        >
                          <span>{lang.name}</span>
                          <span className="text-xs text-muted-foreground">{lang.native}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                data-testid="button-voice"
                variant="ghost"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isStreaming}
                className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 ${
                  isRecording
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse"
                    : "text-muted-foreground hover:text-white hover:bg-card"
                }`}
              >
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
              </Button>

              {isRecording ? (
                <div className="flex-1 flex items-center justify-center gap-2 md:gap-3 py-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded-full animate-pulse"
                        style={{
                          height: `${12 + Math.random() * 16}px`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-red-400 font-mono">
                    {formatTime(recordingTime)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Recording{selectedLanguage !== "en-IN" ? ` in ${currentLang?.name}` : ""}... tap stop when done
                  </span>
                </div>
              ) : (
                <textarea
                  ref={inputRef}
                  data-testid="input-chat"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask ARYA anything..."
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-0 text-white placeholder:text-muted-foreground text-sm focus:outline-none py-2 max-h-32"
                  style={{
                    height: "auto",
                    minHeight: "2.25rem",
                    overflow: input.split("\n").length > 4 ? "auto" : "hidden",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 128) + "px";
                  }}
                />
              )}

              <Button
                data-testid="button-send"
                variant="ghost"
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming || isRecording}
                className="flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </Card>
          <div className="flex items-center justify-center gap-2 mt-1.5 md:mt-2">
            {selectedLanguage !== "en-IN" && (
              <span className="text-[10px] md:text-xs text-amber-400/80 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Voice: {currentLang?.native}
              </span>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground text-center">
              ARYA is here to help you with anything you need.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
