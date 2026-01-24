import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Orchestrator from "@/pages/Orchestrator";
import Knowledge from "@/pages/Knowledge";
import ERmate from "@/pages/ERmate";
import ErPrana from "@/pages/ErPrana";
import ApiPlayground from "@/pages/ApiPlayground";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/orchestrator" component={Orchestrator} />
        <Route path="/knowledge" component={Knowledge} />
        <Route path="/ermate" component={ERmate} />
        <Route path="/erprana" component={ErPrana} />
        <Route path="/api" component={ApiPlayground} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;