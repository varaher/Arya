import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Stethoscope, 
  FileText, 
  ArrowRight, 
  AlertTriangle,
  Copy,
  Loader2,
  Table as TableIcon,
  BrainCircuit
} from "lucide-react";
import { mockTranscript } from "@/lib/mockData";

export default function ERmate() {
  const [transcript, setTranscript] = useState(mockTranscript.trim());
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ermate/auto_fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: 'varah',
          transcript: transcript,
          language: 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('ERmate processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-cyan-500" />
            ERmate Copilot
          </h1>
          <p className="text-muted-foreground">Automated Clinical Documentation & Triage Support</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-xs font-mono" onClick={() => setTranscript(mockTranscript.trim())}>
            <FileText className="w-3 h-3 mr-2" />
            Load Sample
          </Button>
          <Button variant="default" className="bg-cyan-500 text-black hover:bg-cyan-400" disabled={!data}>
            Export to EHR
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
        {/* Left: Input */}
        <Card className="bg-card/50 backdrop-blur border-border flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>Voice Transcript / Input</span>
              <Badge variant="outline" className="text-xs font-mono text-cyan-500 border-cyan-500/20 bg-cyan-500/10">
                Listening Mode: Inactive
              </Badge>
            </CardTitle>
            <CardDescription>
              Paste transcript or connect voice gateway to begin.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <Textarea 
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="flex-1 font-mono text-sm leading-relaxed bg-black/20 border-white/10 resize-none p-4 focus:ring-cyan-500/50"
              placeholder="Paste patient interaction transcript here..."
              data-testid="input-transcript"
            />
            <div className="pt-4">
              <Button 
                onClick={handleProcess} 
                disabled={isProcessing || !transcript.trim()}
                className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]"
                data-testid="button-process"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Transcript...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Generate Structured Data
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                Error: {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Output */}
        <Card className="bg-card/50 backdrop-blur border-border flex flex-col h-full overflow-hidden relative">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-cyan-500" />
              Structured Clinical Data
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 bg-black/20" data-testid="output-structured-data">
            {!data ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 opacity-50" />
                </div>
                <p>Waiting for analysis...</p>
                <p className="text-xs max-w-xs mt-2 opacity-50">
                  Engine will extract HPI, Meds, Allergies, and generate Differential Diagnoses.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {/* Safety Flags */}
                {data.safety_flags && data.safety_flags.length > 0 && (
                  <div className="p-4 bg-red-500/10 border-l-2 border-red-500">
                    <h4 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      Critical Safety Flags
                    </h4>
                    <ul className="space-y-1">
                      {data.safety_flags.map((flag: string, i: number) => (
                        <li key={i} className="text-sm text-red-200 font-medium">• {flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Main Fields */}
                <DataSection title="Chief Complaint" content={data.chief_complaint} />
                <DataSection title="History of Present Illness" content={data.hpi} />
                
                <div className="grid grid-cols-2 divide-x divide-white/5">
                  <div className="p-4">
                    <h4 className="text-xs font-mono text-muted-foreground mb-2 uppercase">Medications</h4>
                    <ul className="space-y-1">
                      {data.medications?.map((m: string, i: number) => (
                        <li key={i} className="text-sm bg-white/5 rounded px-2 py-1 inline-block w-full">{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4">
                    <h4 className="text-xs font-mono text-muted-foreground mb-2 uppercase">Allergies</h4>
                    <ul className="space-y-1">
                      {data.allergies?.map((a: string, i: number) => (
                        <li key={i} className="text-sm text-red-300">{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {data.exam && <DataSection title="Physical Exam" content={data.exam} />}

                <div className="p-4 bg-cyan-950/20">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase mb-3 flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3" />
                    AI Differential Diagnosis
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.ddx?.map((d: string, i: number) => (
                      <Badge key={i} variant="secondary" className="bg-cyan-900/40 text-cyan-100 hover:bg-cyan-900/60 border-cyan-700/50">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="text-xs font-mono text-muted-foreground mb-2 uppercase">Suggested Plan</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs opacity-50 block mb-1">Investigations</span>
                      <div className="text-sm text-foreground/90">{data.plan_investigations?.join(", ")}</div>
                    </div>
                    <div>
                      <span className="text-xs opacity-50 block mb-1">Treatment</span>
                      <div className="text-sm text-foreground/90">{data.plan_treatment?.join(", ")}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {data && (
            <div className="p-3 border-t border-white/10 bg-card flex justify-end">
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs text-muted-foreground hover:text-white"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
              >
                <Copy className="w-3 h-3 mr-2" />
                Copy JSON
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DataSection({ title, content }: { title: string, content: string }) {
  return (
    <div className="p-4 hover:bg-white/[0.02] transition-colors">
      <h4 className="text-xs font-mono text-muted-foreground mb-1 uppercase">{title}</h4>
      <p className="text-sm text-foreground/90 leading-relaxed">{content}</p>
    </div>
  );
}
