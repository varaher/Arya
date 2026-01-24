import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  BrainCircuit, 
  Database, 
  Stethoscope, 
  ArrowUpRight,
  Zap,
  Users,
  Server
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-white">System Overview</h2>
          <p className="text-muted-foreground mt-1">Real-time metrics for ARYA Core multi-tenant environment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border bg-background/50 backdrop-blur">
            Download Report
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            System Health Check
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Requests", value: "2.4M", change: "+12%", icon: Zap, color: "text-yellow-400" },
          { title: "Active Knowledge Units", value: "8,432", change: "+45", icon: Database, color: "text-primary" },
          { title: "Connected Agents", value: "124", change: "+2", icon: BrainCircuit, color: "text-purple-400" },
          { title: "Avg. Latency", value: "48ms", change: "-12ms", icon: Activity, color: "text-emerald-400" },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50 border-border backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <span className="text-emerald-500 flex items-center mr-1">
                  {stat.change.startsWith('+') || stat.change.startsWith('-') ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
                  {stat.change}
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-card/50 border-border backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Tenant Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-end justify-between gap-2 pt-4 px-2">
              {[40, 65, 45, 80, 55, 70, 40, 60, 90, 75, 50, 65].map((h, i) => (
                <div key={i} className="w-full bg-primary/20 rounded-t hover:bg-primary/40 transition-colors relative group">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-primary rounded-t transition-all duration-500" 
                    style={{ height: `${h}%` }}
                  ></div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background border border-border text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {h * 124} reqs
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-muted-foreground font-mono">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Active Nodes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "ERmate Core", status: "Operational", load: 24, icon: Stethoscope },
              { name: "ErPrana Vitals", status: "Operational", load: 45, icon: Activity },
              { name: "Knowledge Graph", status: "Indexing", load: 88, icon: Database },
              { name: "Voice Gateway", status: "Idle", load: 2, icon: Server },
            ].map((node, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/40 hover:bg-background/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <node.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{node.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'Operational' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></span>
                      {node.status}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold">{node.load}%</div>
                  <div className="text-xs text-muted-foreground">Load</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}