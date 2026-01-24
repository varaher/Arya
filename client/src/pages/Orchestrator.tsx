import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BrainCircuit, 
  Stethoscope, 
  Briefcase, 
  ScrollText, 
  Scale, 
  Send, 
  ArrowRight,
  Sparkles,
  GitMerge
} from "lucide-react";
import { cn } from "@/lib/utils";

const domains = [
  { id: "medical", label: "Medical", icon: Stethoscope, color: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500/50" },
  { id: "business", label: "Business", icon: Briefcase, color: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500/50" },
  { id: "sanskrit", label: "Sanskrit", icon: ScrollText, color: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/50" },
  { id: "chanakya", label: "Chanakya", icon: Scale, color: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/50" },
];

export default function Orchestrator() {
  const [weights, setWeights] = useState({
    medical: 0.25,
    business: 0.25,
    sanskrit: 0.25,
    chanakya: 0.25,
  });
  
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [traceLog, setTraceLog] = useState<string[]>([]);

  const handleQuery = () => {
    if (!query) return;
    setIsProcessing(true);
    setTraceLog([]);
    setResult(null);

    // Simulate processing steps
    setTimeout(() => addLog("Received query: " + query), 100);
    setTimeout(() => addLog("Identifying intent and language..."), 600);
    setTimeout(() => addLog("Routing to engines based on weights..."), 1200);
    
    setTimeout(() => {
      // Simple keyword matching simulation
      const lowerQ = query.toLowerCase();
      let winner = "medical"; // default
      if (lowerQ.includes("strategy") || lowerQ.includes("market") || lowerQ.includes("growth")) winner = "business";
      if (lowerQ.includes("veda") || lowerQ.includes("yoga") || lowerQ.includes("dharma")) winner = "sanskrit";
      if (lowerQ.includes("king") || lowerQ.includes("politics") || lowerQ.includes("lead")) winner = "chanakya";
      
      // Weight influence (simulated)
      if (weights[winner as keyof typeof weights] < 0.1) {
        addLog(`Warning: ${winner} engine has low weight (${weights[winner as keyof typeof weights]}), reducing confidence.`);
      }

      setResult({
        primary_domain: winner,
        confidence: 0.89,
        answer: getMockAnswer(winner),
        sources: ["KB-102", "KB-405"]
      });
      addLog(`Consolidated response generated from ${winner.toUpperCase()} engine.`);
      setIsProcessing(false);
    }, 2500);
  };

  const addLog = (msg: string) => {
    setTraceLog(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0,8)}] ${msg}`]);
  };

  const getMockAnswer = (domain: string) => {
    switch(domain) {
      case "medical": return "Based on current protocols, the symptoms suggest acute localized inflammation. Recommend monitoring temperature and administering NSAIDs if no contraindications.";
      case "business": return "Market penetration requires a defensive posture in this quadrant. Focus on retention over acquisition to stabilize revenue streams.";
      case "sanskrit": return "The concept refers to 'Dharma' - the cosmic order and duty that sustains the universe. It is the foundation of righteous action.";
      case "chanakya": return "As stated in the Arthashastra: 'The root of happiness is Dharma, the root of Dharma is Artha (economy), the root of Artha is good governance.'";
      default: return "I am analyzing the request...";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* LEFT: Controls */}
      <Card className="bg-card/50 backdrop-blur border-border flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary" />
            Routing Weights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 flex-1 overflow-y-auto">
          {domains.map((d) => (
            <div key={d.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md bg-white/5 ${d.text}`}>
                    <d.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">{d.label}</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{(weights[d.id as keyof typeof weights] * 100).toFixed(0)}%</span>
              </div>
              <Slider 
                value={[weights[d.id as keyof typeof weights] * 100]} 
                max={100} 
                step={1} 
                onValueChange={(v) => setWeights(prev => ({...prev, [d.id]: v[0]/100}))}
                className={cn("cursor-pointer", `[&>.relative>.absolute]:${d.color}`)}
              />
            </div>
          ))}
          
          <div className="pt-6 border-t border-border/50">
            <h4 className="text-sm font-medium mb-3">Orchestration Mode</h4>
            <Tabs defaultValue="balanced" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="single">Single</TabsTrigger>
                <TabsTrigger value="balanced">Dual</TabsTrigger>
                <TabsTrigger value="four">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* CENTER: Visualizer & Input */}
      <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/src/assets/grid.svg')] opacity-10 pointer-events-none"></div>
        
        <div className="flex-1 p-6 relative flex flex-col items-center justify-center min-h-[400px]">
          {/* Central Hub */}
          <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20"></div>
            <div className="absolute inset-0 rounded-full border border-primary/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-background z-10 flex items-center justify-center">
              <BrainCircuit className={`w-12 h-12 text-primary ${isProcessing ? 'animate-pulse' : ''}`} />
            </div>
            
            {/* Connecting Lines */}
            {domains.map((d, i) => {
              const rotation = (i * 90) + 45;
              const isActive = result?.primary_domain === d.id;
              
              return (
                <div 
                  key={d.id}
                  className="absolute top-1/2 left-1/2 w-[200px] h-[2px] origin-left"
                  style={{ transform: `rotate(${rotation}deg) translateY(-1px)` }}
                >
                  <div className={`w-full h-full bg-gradient-to-r from-primary/50 to-transparent opacity-20`} />
                  {isProcessing && (
                    <motion.div 
                      className={`absolute top-0 left-0 w-12 h-full ${d.color} shadow-[0_0_10px_currentColor]`}
                      initial={{ x: 0, opacity: 1 }}
                      animate={{ x: 200, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    />
                  )}
                  
                  {/* Nodes */}
                  <motion.div 
                    className={cn(
                      "absolute right-0 top-1/2 -translate-y-1/2 w-16 h-16 rounded-xl border bg-background flex flex-col items-center justify-center shadow-lg transition-all duration-500",
                      isActive ? `${d.border} shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-110` : "border-border/50 opacity-60"
                    )}
                    style={{ transform: `rotate(-${rotation}deg)` }} // Counter rotate to keep upright
                  >
                    <d.icon className={cn("w-6 h-6 mb-1", d.text)} />
                    <span className="text-[10px] font-mono uppercase tracking-wider">{d.label}</span>
                  </motion.div>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full bg-background/80 backdrop-blur border border-primary/20 rounded-lg p-6 shadow-2xl z-20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono text-primary uppercase">Response Generated</span>
                </div>
                <p className="text-lg leading-relaxed font-display">{result.answer}</p>
                <div className="mt-4 flex gap-2">
                  {result.sources.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs font-mono text-muted-foreground border-border/50">
                      Source: {s}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background/50 border-t border-border backdrop-blur-md">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              placeholder="Ask ARYA about medical protocols, business strategy, or vedic wisdom..."
              className="bg-background border-border focus:ring-primary h-12 text-base font-display"
            />
            <Button 
              size="lg" 
              onClick={handleQuery}
              disabled={isProcessing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-12 p-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Trace Log Mini */}
          <div className="mt-4 h-32 overflow-y-auto font-mono text-xs text-muted-foreground p-2 rounded bg-black/20 border border-white/5">
            {traceLog.length === 0 && <span className="opacity-50">System ready. Waiting for input...</span>}
            {traceLog.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}