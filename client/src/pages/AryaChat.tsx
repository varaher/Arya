import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Send,
  Mic,
  MicOff,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  Square,
} from "lucide-react";

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

export default function AryaChat() {
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
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

    if (blob.size === 0) return;

    let convId = activeConversation;
    if (!convId) {
      const conv = await createConversation.mutateAsync("Voice Chat");
      convId = conv.id;
    }

    setIsStreaming(true);
    setStreamingContent("");

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
        body: JSON.stringify({ audio: base64Audio, tenant_id: "varah" }),
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
  }, [activeConversation, queryClient, createConversation]);

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

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4" data-testid="page-arya-chat">
      {/* Sidebar: Conversations */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <Button
          data-testid="button-new-chat"
          onClick={() => createConversation.mutate("New Chat")}
          className="w-full mb-3 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1" data-testid="list-conversations">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              data-testid={`card-conversation-${conv.id}`}
              onClick={() => setActiveConversation(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                activeConversation === conv.id
                  ? "bg-primary/10 border border-primary/30 text-white"
                  : "hover:bg-card/80 text-muted-foreground hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm flex-1">{conv.title}</span>
              <button
                data-testid={`button-delete-conversation-${conv.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation.mutate(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">
              No conversations yet.
              <br />
              Start chatting with ARYA!
            </p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4" data-testid="list-messages">
          {!activeConversation && messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-amber-500/20 flex items-center justify-center mb-6">
                <span className="text-4xl font-display font-bold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                  A
                </span>
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2" data-testid="text-welcome-title">
                Hey, I'm ARYA
              </h2>
              <p className="text-muted-foreground max-w-md mb-8">
                Ask me anything — from health and wellness to business strategy,
                ancient wisdom, or leadership insights. Type or tap the mic to talk.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  "What's a good morning routine for energy?",
                  "How can I reduce stress at work?",
                  "Tell me about the concept of Dharma",
                  "Best leadership advice for a new manager",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    data-testid={`button-suggestion-${i}`}
                    onClick={() => sendMessage(suggestion)}
                    className="text-left px-4 py-3 rounded-xl border border-border/50 bg-card/30 text-sm text-muted-foreground hover:text-white hover:border-primary/40 hover:bg-card/60 transition-all"
                  >
                    {suggestion}
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
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
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
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streamingContent && (
            <div className="flex justify-start" data-testid="message-streaming">
              <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-card/60 border border-border/30 text-white/90">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingContent}
                  <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />
                </div>
              </div>
            </div>
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start" data-testid="message-thinking">
              <div className="rounded-2xl px-4 py-3 bg-card/60 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-2 pb-4 pt-2">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <div className="flex items-end gap-2 p-3">
              {/* Voice button */}
              <Button
                data-testid="button-voice"
                variant="ghost"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isStreaming}
                className={`flex-shrink-0 rounded-full h-10 w-10 ${
                  isRecording
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse"
                    : "text-muted-foreground hover:text-white hover:bg-card"
                }`}
              >
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
              </Button>

              {isRecording ? (
                <div className="flex-1 flex items-center justify-center gap-3 py-2">
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
                  <span className="text-xs text-muted-foreground">
                    Recording... tap stop when done
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

              {/* Send button */}
              <Button
                data-testid="button-send"
                variant="ghost"
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming || isRecording}
                className="flex-shrink-0 rounded-full h-10 w-10 text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </Card>
          <p className="text-xs text-muted-foreground text-center mt-2">
            ARYA draws from medical, business, Vedic, and governance knowledge to help you.
          </p>
        </div>
      </div>
    </div>
  );
}
