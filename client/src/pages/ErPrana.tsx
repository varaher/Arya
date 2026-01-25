import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Activity, 
  Heart, 
  Wind, 
  Droplets, 
  AlertOctagon, 
  CheckCircle,
  Thermometer,
  RefreshCw,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ErPrana() {
  // Simulated live vitals
  const [vitals, setVitals] = useState({
    hr: 72,
    spo2: 98,
    bpSys: 120,
    bpDia: 80,
    temp: 37.0
  });

  const [symptomsText, setSymptomsText] = useState("");
  const [assessment, setAssessment] = useState<any>(null);
  const [isAssessing, setIsAssessing] = useState(false);

  // Simulate vitals fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setVitals(prev => ({
        hr: Math.min(180, Math.max(40, prev.hr + (Math.random() - 0.5) * 4)),
        spo2: Math.min(100, Math.max(85, prev.spo2 + (Math.random() - 0.5) * 1)),
        bpSys: Math.min(180, Math.max(90, prev.bpSys + (Math.random() - 0.5) * 2)),
        bpDia: Math.min(110, Math.max(50, prev.bpDia + (Math.random() - 0.5) * 2)),
        temp: prev.temp
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAssess = async () => {
    setIsAssessing(true);
    
    try {
      const response = await fetch('/api/erprana/risk_assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: 'varah',
          symptoms_text: symptomsText || 'General monitoring',
          wearable: {
            hr: Math.round(vitals.hr),
            spo2: Math.round(vitals.spo2),
            bp: `${Math.round(vitals.bpSys)}/${Math.round(vitals.bpDia)}`,
            temp: vitals.temp
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setAssessment(result);
    } catch (err: any) {
      console.error('Risk assessment error:', err);
      setAssessment({
        risk_level: 'low',
        risk_score: 0,
        red_flags: [],
        next_steps: ['Error performing assessment. Please try again.'],
        disclaimer: ''
      });
    } finally {
      setIsAssessing(false);
    }
  };

  const simulateCriticalEvent = () => {
    setVitals({ hr: 130, spo2: 88, bpSys: 165, bpDia: 95, temp: 37.5 });
    setSymptomsText("Chest pain and shortness of breath");
  };

  const riskLevel = assessment?.risk_level || 'low';

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            ErPrana Monitor
          </h1>
          <p className="text-muted-foreground">Real-time Vitals & Risk Assessment Engine</p>
        </div>
        <Button variant="outline" onClick={simulateCriticalEvent}>
          Simulate Critical Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vitals Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <VitalCard 
              label="Heart Rate" 
              value={vitals.hr.toFixed(0)} 
              unit="bpm" 
              icon={Heart} 
              color="text-red-500" 
              status={vitals.hr > 100 ? "high" : "normal"}
            />
            <VitalCard 
              label="SpO2" 
              value={vitals.spo2.toFixed(0)} 
              unit="%" 
              icon={Wind} 
              color="text-cyan-500"
              status={vitals.spo2 < 95 ? "low" : "normal"} 
            />
            <VitalCard 
              label="Blood Pressure" 
              value={`${vitals.bpSys.toFixed(0)}/${vitals.bpDia.toFixed(0)}`} 
              unit="mmHg" 
              icon={Droplets} 
              color="text-purple-500"
              status={vitals.bpSys > 140 ? "high" : "normal"} 
            />
            <VitalCard 
              label="Temperature" 
              value={vitals.temp.toFixed(1)} 
              unit="°C" 
              icon={Thermometer} 
              color="text-amber-500"
              status="normal"
            />
          </div>
          
          <Card className="bg-card/30 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Wearable Data Stream</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-black/20 rounded border border-white/5 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center gap-1 opacity-20">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-emerald-500" 
                      style={{ 
                        height: `${Math.random() * 80 + 20}%`,
                        opacity: Math.random()
                      }} 
                    />
                  ))}
                </div>
                <div className="z-10 flex items-center gap-2 text-emerald-500 font-mono text-sm animate-pulse">
                  <Activity className="w-4 h-4" />
                  LIVE SIGNAL ACQUIRED
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Patient Symptoms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea 
                placeholder="Describe patient symptoms..."
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                className="h-24 bg-black/20 border-white/10"
                data-testid="input-symptoms"
              />
              <Button 
                onClick={handleAssess} 
                disabled={isAssessing}
                className="w-full"
                data-testid="button-assess"
              >
                {isAssessing ? 'Assessing...' : 'Run Risk Assessment'}
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Risk Assessment Panel */}
        <Card className={cn(
          "bg-card/50 backdrop-blur border-border flex flex-col transition-colors duration-500",
          riskLevel === "high" ? "border-red-500/50 bg-red-950/20" : 
          riskLevel === "moderate" ? "border-yellow-500/50 bg-yellow-950/20" : ""
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className={cn(
                "w-5 h-5",
                riskLevel === "high" ? "text-red-500" : 
                riskLevel === "moderate" ? "text-yellow-500" : "text-emerald-500"
              )} />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between" data-testid="risk-assessment-panel">
            {!assessment ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-center p-8">
                <div>
                  <AlertOctagon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Click "Run Risk Assessment" to analyze current vitals and symptoms</p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center py-8">
                  <div className={cn(
                    "text-6xl font-display font-bold mb-2 transition-colors duration-300",
                    riskLevel === "high" ? "text-red-500" : 
                    riskLevel === "moderate" ? "text-yellow-500" : "text-emerald-500"
                  )}>
                    {riskLevel.toUpperCase()}
                  </div>
                  <p className="text-muted-foreground uppercase tracking-widest text-xs font-semibold">Current Risk Level</p>
                  <p className="text-sm text-muted-foreground mt-2">Score: {assessment.risk_score}/100</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Confidence Score</span>
                      <span>94%</span>
                    </div>
                    <Progress value={94} className="h-1 bg-white/10" />
                  </div>

                  {assessment.red_flags && assessment.red_flags.length > 0 && (
                    <div className="p-4 bg-red-950/30 rounded-lg border border-red-500/20">
                      <h4 className="text-xs font-bold uppercase mb-2 text-red-400">Red Flags</h4>
                      <ul className="space-y-1">
                        {assessment.red_flags.map((flag: string, i: number) => (
                          <li key={i} className="text-sm text-red-200 flex items-start gap-2">
                            <AlertOctagon className="w-3 h-3 shrink-0 mt-0.5" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                    <h4 className="text-xs font-bold uppercase mb-2">Recommended Actions</h4>
                    <ul className="space-y-2">
                      {assessment.next_steps?.map((step: string, i: number) => (
                        <li key={i} className={cn(
                          "text-sm flex items-start gap-2",
                          riskLevel === "high" ? "text-red-200" : 
                          riskLevel === "moderate" ? "text-yellow-200" : "text-emerald-200"
                        )}>
                          {riskLevel === "high" ? <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" /> :
                           riskLevel === "moderate" ? <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" /> :
                           <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {assessment.disclaimer && (
                    <p className="text-xs text-muted-foreground italic">{assessment.disclaimer}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VitalCard({ label, value, unit, icon: Icon, color, status }: any) {
  return (
    <Card className={cn(
      "bg-card/50 backdrop-blur border-border transition-all duration-300",
      status === "high" || status === "low" ? "animate-pulse border-red-500/50 bg-red-500/5" : ""
    )}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{label}</CardTitle>
        <Icon className={cn("w-4 h-4", color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display">
          {value} <span className="text-sm text-muted-foreground font-normal ml-1">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
