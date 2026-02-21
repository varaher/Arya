import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout, PublicLayout } from "@/components/layout/Layout";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";
import NotFound from "@/pages/not-found";

import AryaChat from "@/pages/AryaChat";
import Dashboard from "@/pages/Dashboard";
import Orchestrator from "@/pages/Orchestrator";
import Knowledge from "@/pages/Knowledge";
import ERmate from "@/pages/ERmate";
import ErPrana from "@/pages/ErPrana";
import ApiPlayground from "@/pages/ApiPlayground";
import SelfLearning from "@/pages/SelfLearning";
import NeuralLink from "@/pages/NeuralLink";
import DeveloperPortal from "@/pages/DeveloperPortal";
import AdminLogin from "@/pages/AdminLogin";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAdmin, isLoading } = useAdminAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }
  if (!isAdmin) {
    return <Redirect to="/admin/login" />;
  }
  return <Component />;
}

function Router() {
  const { isAdmin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/admin/login">
        {isAdmin ? <Redirect to="/dashboard" /> : <AdminLogin />}
      </Route>

      <Route path="/">
        {isAdmin ? (
          <AdminLayout><AryaChat /></AdminLayout>
        ) : (
          <PublicLayout><AryaChat /></PublicLayout>
        )}
      </Route>

      <Route path="/dashboard">
        <AdminLayout><AdminRoute component={Dashboard} /></AdminLayout>
      </Route>
      <Route path="/orchestrator">
        <AdminLayout><AdminRoute component={Orchestrator} /></AdminLayout>
      </Route>
      <Route path="/knowledge">
        <AdminLayout><AdminRoute component={Knowledge} /></AdminLayout>
      </Route>
      <Route path="/ermate">
        <AdminLayout><AdminRoute component={ERmate} /></AdminLayout>
      </Route>
      <Route path="/erprana">
        <AdminLayout><AdminRoute component={ErPrana} /></AdminLayout>
      </Route>
      <Route path="/learning">
        <AdminLayout><AdminRoute component={SelfLearning} /></AdminLayout>
      </Route>
      <Route path="/neural-link">
        <AdminLayout><AdminRoute component={NeuralLink} /></AdminLayout>
      </Route>
      <Route path="/api">
        <AdminLayout><AdminRoute component={ApiPlayground} /></AdminLayout>
      </Route>
      <Route path="/developers">
        <AdminLayout><AdminRoute component={DeveloperPortal} /></AdminLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminAuthProvider>
          <Toaster />
          <Router />
        </AdminAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
