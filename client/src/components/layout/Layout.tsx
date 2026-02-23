import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/lib/admin-auth";
import { 
  LayoutDashboard, 
  BrainCircuit, 
  Network, 
  Stethoscope, 
  Activity, 
  Search,
  Database,
  Brain,
  Zap,
  MessageCircle,
  Menu,
  X,
  KeyRound,
  LogOut,
  Shield,
} from "lucide-react";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { logout } = useAdminAuth();

  const navItems = [
    { label: "Chat with ARYA", icon: MessageCircle, href: "/" },
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Orchestrator", icon: BrainCircuit, href: "/orchestrator" },
    { label: "Knowledge Base", icon: Database, href: "/knowledge" },
    { label: "Self-Learning", icon: Brain, href: "/learning" },
    { label: "Neural Link", icon: Zap, href: "/neural-link" },
    { label: "ERmate Copilot", icon: Stethoscope, href: "/ermate" },
    { label: "ErPrana Monitor", icon: Activity, href: "/erprana" },
    { label: "API Playground", icon: Network, href: "/api" },
    { label: "Developer Portal", icon: KeyRound, href: "/developers" },
  ];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      <aside
        className={cn(
          "w-64 border-r border-border bg-card/95 backdrop-blur-xl h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary text-xl">A</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight leading-none">ARYA Core</h1>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3 text-amber-400" />
                <p className="text-xs text-amber-400 font-mono">ADMIN</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-white/10 text-muted-foreground"
            data-testid="button-close-sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
                  location === item.href 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_hsl(var(--primary))]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4", location === item.href ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                {item.label}
              </a>
            </Link>
          ))}
        </nav>

        <div className="p-3 md:p-4 border-t border-border/50 space-y-3">
          <div className="bg-black/20 rounded-lg p-3 border border-border/50 hidden md:block">
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
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-14 md:h-16 border-b border-border bg-background/80 backdrop-blur-md fixed top-0 right-0 left-0 md:left-64 z-30 px-3 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-md hover:bg-white/10 text-muted-foreground"
          data-testid="button-open-sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Global search..." 
            className="bg-card border border-border rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-48 md:w-64 transition-all focus:w-64 md:focus:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full bg-card border border-border">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">TENANT:</span>
          <span className="text-xs md:text-sm font-semibold text-white">VARAH</span>
        </div>
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-primary to-accent border border-white/10"></div>
      </div>
    </header>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground bg-[url('/src/assets/arya-hero-bg.png')] bg-cover bg-fixed bg-no-repeat bg-blend-overlay">
      <div className="absolute inset-0 bg-background/90 z-0 pointer-events-none"></div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <main className="md:pl-64 pt-14 md:pt-16 relative z-10 min-h-screen">
        <div className="p-3 sm:p-5 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
