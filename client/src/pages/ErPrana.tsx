import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Heart, 
  Wind, 
  Droplets, 
  AlertOctagon, 
  CheckCircle,
  Thermometer,
  RefreshCw
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

  const [riskLevel, setRiskLevel] = useState<"low" | "moderate" | "high">("low");

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

  // Simple risk logic for demo
  useEffect(() => {
    if (vitals.hr > 120 || vitals.spo2 < 90 || vitals.bpSys > 160) {
      setRiskLevel("high");
    } else if (vitals.hr > 100 || vitals.spo2 < 95 || vitals.bpSys > 140) {
      setRiskLevel("moderate");
    } else {
      setRiskLevel("low");
    }
  }, [vitals]);

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
        <Button variant="outline" onClick={() => setVitals({ hr: 130, spo2: 88, bpSys: 165, bpDia: 95, temp: 37.5 })}>
          Simulate Critical Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vitals Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
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
          
          <Card className="col-span-2 bg-card/30 border-border">
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
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="text-center py-8">
              <div className={cn(
                "text-6xl font-display font-bold mb-2 transition-colors duration-300",
                riskLevel === "high" ? "text-red-500" : 
                riskLevel === "moderate" ? "text-yellow-500" : "text-emerald-500"
              )}>
                {riskLevel.toUpperCase()}
              </div>
              <p className="text-muted-foreground uppercase tracking-widest text-xs font-semibold">Current Risk Level</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Confidence Score</span>
                  <span>94%</span>
                </div>
                <Progress value={94} className="h-1 bg-white/10" />
              </div>

              <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                <h4 className="text-xs font-bold uppercase mb-2">Recommended Actions</h4>
                <ul className="space-y-2">
                  {riskLevel === "high" ? (
                    <>
                      <li className="text-sm text-red-200 flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                        Immediate medical attention required.
                      </li>
                      <li className="text-sm text-red-200 flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                        Initiate emergency protocol.
                      </li>
                    </>
                  ) : riskLevel === "moderate" ? (
                    <>
                      <li className="text-sm text-yellow-200 flex items-start gap-2">
                        <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
                        Re-check vitals in 15 minutes.
                      </li>
                      <li className="text-sm text-yellow-200 flex items-start gap-2">
                        <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                        Monitor for arrhythmias.
                      </li>
                    </>
                  ) : (
                    <li className="text-sm text-emerald-200 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      Continue routine monitoring.
                    </li>
                  )}
                </ul>
              </div>
            </div>
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