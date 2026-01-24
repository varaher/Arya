import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  BrainCircuit, 
  Network, 
  Stethoscope, 
  Activity, 
  Settings, 
  Search,
  Database
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, href: "/" },
    { label: "Orchestrator", icon: BrainCircuit, href: "/orchestrator" },
    { label: "Knowledge Base", icon: Database, href: "/knowledge" },
    { label: "ERmate Copilot", icon: Stethoscope, href: "/ermate" },
    { label: "ErPrana Monitor", icon: Activity, href: "/erprana" },
    { label: "API Playground", icon: Network, href: "/api" },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen fixed left-0 top-0 flex flex-col z-50">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 border border-primary flex items-center justify-center">
            <span className="font-display font-bold text-primary text-xl">A</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight leading-none">ARYA Core</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">v1.0.0-alpha</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
              location === item.href 
                ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_hsl(var(--primary))]" 
                : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}>
              <item.icon className={cn("w-4 h-4", location === item.href ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
              {item.label}
            </a>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-black/20 rounded-lg p-3 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground">SYSTEM STATUS</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_0_rgba(16,185,129,0.5)]"></span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">CPU Load</span>
              <span className="text-primary font-mono">12%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Memory</span>
              <span className="text-primary font-mono">1.4GB</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md fixed top-0 right-0 left-64 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Global search..." 
            className="bg-card border border-border rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-all focus:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="text-xs font-mono text-muted-foreground">TENANT:</span>
          <span className="text-sm font-semibold text-white">VARAH Group</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent border border-white/10"></div>
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground bg-[url('/src/assets/arya-hero-bg.png')] bg-cover bg-fixed bg-no-repeat bg-blend-overlay">
      <div className="absolute inset-0 bg-background/90 z-0 pointer-events-none"></div>
      <Sidebar />
      <Header />
      <main className="pl-64 pt-16 relative z-10 min-h-screen">
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}