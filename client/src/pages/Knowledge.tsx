import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Database,
  Filter,
  Plus,
  BookOpen,
  ExternalLink,
  Loader2,
  Star,
} from "lucide-react";
import { mockKnowledgeBase, KnowledgeUnit } from "@/lib/mockData";

type SeedStatus = "idle" | "loading" | "done" | "skipped" | "error";

export default function Knowledge() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeUnit | null>(null);
  const [seedStatus, setSeedStatus] = useState<SeedStatus>("idle");
  const [seedMsg, setSeedMsg] = useState("");

  const filteredNodes = useMemo(() => {
    return mockKnowledgeBase.filter(node => {
      const matchesSearch = node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            node.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDomain = selectedDomain ? node.domain === selectedDomain : true;
      return matchesSearch && matchesDomain;
    });
  }, [searchTerm, selectedDomain]);

  const getNodePosition = (id: string) => {
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const x = (seed * 9301 + 49297) % 100;
    const y = (seed * 49297 + 93217) % 100;
    return { x, y };
  };

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'medical':   return 'bg-cyan-500 shadow-cyan-500/50';
      case 'business':  return 'bg-indigo-500 shadow-indigo-500/50';
      case 'sanskrit':  return 'bg-amber-500 shadow-amber-500/50';
      case 'chanakya':  return 'bg-emerald-500 shadow-emerald-500/50';
      case 'jyotish':   return 'bg-orange-400 shadow-orange-400/50';
      default:          return 'bg-gray-500';
    }
  };

  const handleSeedJyotish = async () => {
    setSeedStatus("loading");
    setSeedMsg("");
    try {
      const r = await fetch("/api/admin/knowledge/seed-jyotish", { method: "POST" });
      const data = await r.json();
      if (data.skipped) {
        setSeedStatus("skipped");
        setSeedMsg(data.message);
      } else if (data.success) {
        setSeedStatus("done");
        setSeedMsg(data.message);
      } else {
        setSeedStatus("error");
        setSeedMsg(data.error || "Unknown error");
      }
    } catch {
      setSeedStatus("error");
      setSeedMsg("Network error — please try again.");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Knowledge Graph
          </h1>
          <p className="text-muted-foreground">Indexed units across 5 domains</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card/50 border-border"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Unit
          </Button>
          {/* Jyotish seed button */}
          <Button
            data-testid="button-seed-jyotish"
            variant="outline"
            className={`gap-2 border-orange-400/40 text-orange-300 hover:bg-orange-400/10 ${seedStatus === "loading" ? "opacity-60 pointer-events-none" : ""}`}
            onClick={handleSeedJyotish}
            disabled={seedStatus === "loading"}
          >
            {seedStatus === "loading"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Star className="w-4 h-4" />}
            {seedStatus === "done"    ? "Jyotish Seeded ✓"    :
             seedStatus === "skipped" ? "Already Seeded"       :
             seedStatus === "error"   ? "Seed Failed"          :
                                        "Seed Jyotish Texts"}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {seedMsg && (
        <div className={`text-sm px-4 py-2 rounded-lg border ${
          seedStatus === "done"    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
          seedStatus === "skipped" ? "bg-amber-500/10 border-amber-500/30 text-amber-300"       :
                                     "bg-red-500/10 border-red-500/30 text-red-300"
        }`}>
          {seedMsg}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Graph View */}
        <Card className="lg:col-span-3 bg-card/30 backdrop-blur border-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-[url('/src/assets/grid.svg')] opacity-20 pointer-events-none" />

          <div className="absolute inset-8">
            {filteredNodes.map((node) => {
              const pos = getNodePosition(node.id);
              const isSelected = selectedNode?.id === node.id;
              return (
                <motion.button
                  key={node.id}
                  className={`absolute w-4 h-4 rounded-full ${getDomainColor(node.domain)} cursor-pointer transition-all duration-300 z-10 hover:scale-150 focus:outline-none ring-offset-background`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: isSelected ? 1.5 : 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${getDomainColor(node.domain)}`} />
                </motion.button>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
            {['medical', 'business', 'sanskrit', 'chanakya', 'jyotish'].map(d => (
              <Badge
                key={d}
                variant="outline"
                className={`cursor-pointer capitalize hover:bg-white/10 ${selectedDomain === d ? 'border-primary bg-primary/10' : 'border-border'}`}
                onClick={() => setSelectedDomain(selectedDomain === d ? null : d)}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${getDomainColor(d).split(' ')[0]}`} />
                {d}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Details Panel */}
        <Card className="bg-card/50 backdrop-blur border-border h-full flex flex-col">
          <CardHeader>
            <CardTitle>Unit Details</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <Badge className={`capitalize mb-2 ${getDomainColor(selectedNode.domain).split(' ')[0]} text-black`}>
                    {selectedNode.domain}
                  </Badge>
                  <h3 className="text-xl font-display font-bold leading-tight">{selectedNode.title}</h3>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/5 text-sm leading-relaxed text-foreground/90">
                  {selectedNode.content}
                </div>

                <div>
                  <h4 className="text-xs font-mono text-muted-foreground uppercase mb-2">Metadata</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-muted-foreground">Relevance Score</span>
                      <span className="font-mono text-emerald-400">{(selectedNode.relevance * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-muted-foreground">ID</span>
                      <span className="font-mono">{selectedNode.id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono text-muted-foreground uppercase mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-white/5 hover:bg-white/10">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Cite
                  </Button>
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Source
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-50">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Database className="w-6 h-6" />
                </div>
                <p>Select a node to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
