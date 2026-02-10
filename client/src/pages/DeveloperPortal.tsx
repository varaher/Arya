import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldOff,
  Activity,
  Clock,
  Zap,
  Eye,
  EyeOff,
  Terminal,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  appId: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  totalRequests: number;
  createdAt: string;
  expiresAt: string | null;
}

interface UsageStats {
  totalKeysActive: number;
  requestsToday: number;
  requestsThisWeek: number;
}

const APP_OPTIONS = [
  { value: "ermate", label: "ERmate" },
  { value: "erprana", label: "ErPrana" },
  { value: "nevarh", label: "NEVARH" },
  { value: "varah_corp", label: "VARAH Corp" },
  { value: "custom", label: "Custom App" },
];

const PERMISSION_OPTIONS = [
  { value: "knowledge:read", label: "Knowledge Query", desc: "Query ARYA's knowledge base" },
  { value: "chat:write", label: "Chat", desc: "Send messages and get AI responses" },
  { value: "ermate:write", label: "ERmate", desc: "Clinical transcript processing" },
  { value: "erprana:write", label: "ErPrana", desc: "Patient risk assessment" },
];

export default function DeveloperPortal() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyApp, setNewKeyApp] = useState("ermate");
  const [newKeyPermissions, setNewKeyPermissions] = useState(["knowledge:read", "chat:write"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const queryClient = useQueryClient();

  const { data: keysData } = useQuery<{ keys: ApiKey[]; total: number }>({
    queryKey: ["/api/keys"],
    queryFn: async () => {
      const res = await fetch("/api/keys?tenant_id=varah");
      return res.json();
    },
  });

  const { data: stats } = useQuery<UsageStats>({
    queryKey: ["/api/keys/stats/overview"],
    queryFn: async () => {
      const res = await fetch("/api/keys/stats/overview?tenant_id=varah");
      return res.json();
    },
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: "varah",
          name: newKeyName,
          app_id: newKeyApp,
          permissions: newKeyPermissions,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/keys/stats/overview"] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/keys/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: "varah" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/keys/stats/overview"] });
    },
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/keys/${id}?tenant_id=varah`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/keys/stats/overview"] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const togglePermission = (perm: string) => {
    setNewKeyPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const keys = keysData?.keys || [];

  return (
    <div className="space-y-6" data-testid="page-developer-portal">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white" data-testid="text-page-title">
          Developer Portal
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Manage API keys for your apps to connect to ARYA's intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-card/50 border-border/50 p-4" data-testid="stat-active-keys">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalKeysActive || 0}</p>
              <p className="text-xs text-muted-foreground">Active Keys</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card/50 border-border/50 p-4" data-testid="stat-requests-today">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.requestsToday || 0}</p>
              <p className="text-xs text-muted-foreground">Requests Today</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card/50 border-border/50 p-4" data-testid="stat-requests-week">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.requestsThisWeek || 0}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          data-testid="button-create-key"
          onClick={() => {
            setShowCreate(!showCreate);
            setCreatedKey(null);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
        <Button
          data-testid="button-toggle-docs"
          variant="outline"
          onClick={() => setShowDocs(!showDocs)}
          className="border-border/50"
        >
          <Terminal className="w-4 h-4 mr-2" />
          {showDocs ? "Hide" : "Show"} API Docs
        </Button>
      </div>

      {showDocs && (
        <Card className="bg-card/50 border-border/50 p-4 md:p-6" data-testid="section-api-docs">
          <h3 className="text-lg font-display font-bold text-white mb-4">Quick Start Guide</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-2">All API requests require an API key in the Authorization header:</p>
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs md:text-sm font-mono text-primary">
{`Authorization: Bearer arya_your_key_here`}
              </pre>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Chat with ARYA</p>
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs md:text-sm font-mono text-emerald-400">
{`POST /api/v1/chat
{
  "message": "What should I know about hypertension?",
  "history": []
}`}
              </pre>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Query Knowledge Base</p>
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs md:text-sm font-mono text-emerald-400">
{`POST /api/v1/knowledge/query
{
  "query": "stress management techniques",
  "top_k": 5
}`}
              </pre>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">ERmate - Clinical Transcript</p>
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs md:text-sm font-mono text-emerald-400">
{`POST /api/v1/ermate/auto_fill
{
  "transcript": "Patient presents with..."
}`}
              </pre>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">ErPrana - Risk Assessment</p>
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs md:text-sm font-mono text-emerald-400">
{`POST /api/v1/erprana/risk_assess
{
  "symptoms_text": "chest pain, shortness of breath",
  "wearable": { "hr": 95, "spo2": 94 }
}`}
              </pre>
            </div>
          </div>
        </Card>
      )}

      {showCreate && (
        <Card className="bg-card/50 border-primary/20 border p-4 md:p-6" data-testid="section-create-key">
          {createdKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-5 h-5" />
                <span className="font-semibold">API Key Created Successfully</span>
              </div>
              <p className="text-sm text-amber-400">
                Copy this key now. You won't be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-sm font-mono text-primary break-all" data-testid="text-created-key">
                  {createdKey}
                </code>
                <Button
                  data-testid="button-copy-key"
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(createdKey)}
                  className="flex-shrink-0"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setCreatedKey(null);
                  setShowCreate(false);
                }}
                className="border-border/50"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-display font-bold text-white">Create New API Key</h3>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Key Name</label>
                <input
                  data-testid="input-key-name"
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., ERmate Production Key"
                  className="w-full bg-black/30 border border-border/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">App</label>
                <select
                  data-testid="select-app"
                  value={newKeyApp}
                  onChange={(e) => setNewKeyApp(e.target.value)}
                  className="w-full bg-black/30 border border-border/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {APP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-2">Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_OPTIONS.map((perm) => (
                    <button
                      key={perm.value}
                      data-testid={`toggle-permission-${perm.value}`}
                      onClick={() => togglePermission(perm.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                        newKeyPermissions.includes(perm.value)
                          ? "border-primary/50 bg-primary/10 text-white"
                          : "border-border/30 bg-black/20 text-muted-foreground"
                      }`}
                    >
                      <span className="font-medium">{perm.label}</span>
                      <span className="block text-xs opacity-70">{perm.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  data-testid="button-confirm-create"
                  onClick={() => createKey.mutate()}
                  disabled={!newKeyName.trim() || createKey.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {createKey.isPending ? "Creating..." : "Generate Key"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="space-y-3" data-testid="list-api-keys">
        <h3 className="text-lg font-display font-bold text-white">Your API Keys</h3>
        {keys.length === 0 ? (
          <Card className="bg-card/30 border-border/30 p-8 text-center">
            <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No API keys yet. Create one to connect your apps to ARYA.
            </p>
          </Card>
        ) : (
          keys.map((key) => (
            <Card
              key={key.id}
              data-testid={`card-api-key-${key.id}`}
              className={`bg-card/50 border-border/50 p-4 ${!key.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{key.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      key.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}>
                      {key.isActive ? "Active" : "Revoked"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-mono">
                      {key.appId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="font-mono">{key.keyPrefix}...</span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {key.totalRequests.toLocaleString()} requests
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : "Never used"}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {key.permissions?.map((p) => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border/30 text-muted-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {key.isActive && (
                    <Button
                      data-testid={`button-revoke-${key.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeKey.mutate(key.id)}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs"
                    >
                      <ShieldOff className="w-3.5 h-3.5 mr-1" />
                      Revoke
                    </Button>
                  )}
                  <Button
                    data-testid={`button-delete-${key.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKey.mutate(key.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
