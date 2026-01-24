import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Network, 
  Server, 
  Play, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronDown 
} from "lucide-react";
import { cn } from "@/lib/utils";

const endpoints = [
  {
    method: "POST",
    path: "/v1/knowledge/query",
    description: "Query the multi-domain knowledge engine.",
    params: [
      { name: "tenant_id", type: "string", required: true },
      { name: "domain", type: "string", required: false },
      { name: "query", type: "string", required: true },
    ],
    response: {
      answer: "The protocol suggests...",
      sources: ["KB-001"],
      confidence: 0.92
    }
  },
  {
    method: "POST",
    path: "/v1/ermate/auto_fill",
    description: "Parse raw transcript into structured clinical JSON.",
    params: [
      { name: "transcript", type: "string", required: true },
      { name: "language", type: "string", required: false, default: "en" },
    ],
    response: {
      chief_complaint: "Chest pain",
      medications: ["Aspirin"],
      safety_flags: []
    }
  },
  {
    method: "POST",
    path: "/v1/erprana/risk_assess",
    description: "Calculate patient risk score from vitals.",
    params: [
      { name: "symptoms", type: "string", required: true },
      { name: "vitals", type: "object", required: true },
    ],
    response: {
      risk_level: "high",
      red_flags: ["Hypotension"],
      next_steps: ["IV Fluids"]
    }
  },
  {
    method: "GET",
    path: "/v1/health",
    description: "System health check and node status.",
    params: [],
    response: {
      status: "ok",
      uptime: 3600,
      nodes: 4
    }
  }
];

export default function ApiPlayground() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-purple-500" />
            API Playground
          </h1>
          <p className="text-muted-foreground">Interactive documentation for ARYA Core Endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
            <Server className="w-3 h-3 mr-1" />
            Environment: Production
          </Badge>
          <Button variant="outline" size="sm">Download OpenAPI Spec</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {endpoints.map((ep, i) => (
          <EndpointCard key={i} endpoint={ep} />
        ))}
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleRun = () => {
    setLoading(true);
    setResponse(null);
    setTimeout(() => {
      setResponse(endpoint.response);
      setLoading(false);
    }, 800);
  };

  return (
    <Card className="bg-card/30 backdrop-blur border-border overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <Badge 
            className={cn(
              "w-16 justify-center font-mono font-bold",
              endpoint.method === "GET" ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : 
              endpoint.method === "POST" ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : 
              "bg-gray-500/20 text-gray-400"
            )}
          >
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono text-foreground/90">{endpoint.path}</code>
          <span className="text-sm text-muted-foreground hidden md:inline-block">- {endpoint.description}</span>
        </div>
        <div className="text-muted-foreground">
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border bg-black/20 p-6 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Parameters</h4>
                {endpoint.params.length === 0 ? (
                  <span className="text-sm text-muted-foreground italic">No parameters required.</span>
                ) : (
                  <div className="space-y-3">
                    {endpoint.params.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-mono text-foreground/80">
                          {p.name}
                          {p.required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                        <Input 
                          placeholder={p.type} 
                          className="h-8 bg-white/5 border-white/10 font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleRun} disabled={loading} className="w-full">
                {loading ? "Sending Request..." : "Send Request"}
                {!loading && <Play className="w-4 h-4 ml-2 fill-current" />}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Response</h4>
                {response && <span className="text-xs text-emerald-500 font-mono">200 OK</span>}
              </div>
              <div className="relative rounded-md border border-border bg-black/50 p-4 font-mono text-xs text-muted-foreground h-64 overflow-auto">
                {response ? (
                  <pre className="text-emerald-300">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center opacity-30">
                    Waiting for request...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}