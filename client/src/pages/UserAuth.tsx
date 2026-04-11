import { useState, useEffect, useRef } from "react";
import { useUserAuth } from "@/lib/user-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Phone, User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean }) => void;
          renderButton: (element: HTMLElement, options: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function UserAuth({ onClose }: { onClose?: () => void }) {
  const { login, signup, loginWithGoogle } = useUserAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleScriptLoaded = useRef(false);

  useEffect(() => {
    fetch("/api/user/google-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.clientId) setGoogleClientId(d.clientId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!googleClientId || googleScriptLoaded.current) return;

    const existingScript = document.getElementById("google-gis-script");
    if (existingScript) {
      initGoogleSignIn();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleSignIn();
    document.head.appendChild(script);
    googleScriptLoaded.current = true;
  }, [googleClientId]);

  function initGoogleSignIn() {
    if (!window.google || !googleClientId || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "filled_black",
      size: "large",
      shape: "rectangular",
      width: googleBtnRef.current.offsetWidth || 340,
      text: mode === "signup" ? "signup_with" : "signin_with",
      logo_alignment: "left",
    });
  }

  useEffect(() => {
    if (window.google && googleClientId && googleBtnRef.current) {
      initGoogleSignIn();
    }
  }, [mode, googleClientId]);

  async function handleGoogleCredential(response: { credential: string }) {
    setGoogleLoading(true);
    setError("");
    try {
      const result = await loginWithGoogle(response.credential);
      if (result.success) {
        onClose?.();
      } else {
        setError(result.error || "Google sign-in failed");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const result = await login(phone, password);
        if (!result.success) {
          setError(result.error || "Login failed");
        } else {
          onClose?.();
        }
      } else {
        if (!name.trim()) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
        const result = await signup({ name: name.trim(), phone, password, email: email || undefined });
        if (!result.success) {
          setError(result.error || "Signup failed");
        } else {
          onClose?.();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0d1326] to-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 mb-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white" data-testid="text-auth-title">
            {mode === "login" ? "Welcome Back" : "Join ARYA"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Sign in to continue your journey" : "Create your account to get started"}
          </p>
        </div>

        {googleClientId && (
          <div className="mb-4">
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-white/5 p-4">
              {googleLoading ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in with Google...
                </div>
              ) : (
                <div
                  ref={googleBtnRef}
                  data-testid="button-google-signin"
                  className="w-full flex justify-center"
                />
              )}
            </div>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-muted-foreground/60">or continue with phone</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-background/50 border-white/10 text-white placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-background/50 border-white/10 text-white placeholder:text-muted-foreground"
                  autoFocus={mode === "login"}
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background/50 border-white/10 text-white placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "Create a password (min 6 chars)" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/50 border-white/10 text-white placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2" data-testid="text-auth-error">
                {error}
              </div>
            )}

            <Button
              data-testid="button-auth-submit"
              type="submit"
              disabled={loading || !phone || !password}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button
            data-testid="button-toggle-auth-mode"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            {mode === "login" ? (
              <>New here? <span className="text-cyan-400 font-medium">Create an account</span></>
            ) : (
              <>Already have an account? <span className="text-cyan-400 font-medium">Sign in</span></>
            )}
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            data-testid="button-skip-auth"
            onClick={onClose}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
}
