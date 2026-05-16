import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout, PublicLayout } from "@/components/layout/Layout";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";
import { UserAuthProvider, useUserAuth } from "@/lib/user-auth";
import { ThemeProvider } from "@/lib/theme";
import PWAPrompt from "@/components/PWAPrompt";
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
import UserGoals from "@/pages/UserGoals";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import UserAnalytics from "@/pages/UserAnalytics";
import Community from "@/pages/Community";
import ReflectionPage from "@/pages/ReflectionPage";
import PrivacyControlPage from "@/pages/PrivacyControlPage";
import VedicLensPage from "@/pages/VedicLensPage";
import NitiPage from "@/pages/NitiPage";
import WeeklyReviewPage from "@/pages/WeeklyReviewPage";
import OnboardingFlow from "@/pages/OnboardingFlow";
import AdminARYA from "@/pages/AdminARYA";
import PranaPage from "@/pages/PranaPage";
import PricingPage from "@/pages/PricingPage";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, refreshUser } = useUserAuth();
  if (!isLoading && user && user.onboardingComplete === false) {
    return <OnboardingFlow onComplete={refreshUser} />;
  }
  return <>{children}</>;
}

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

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};
const pageTransition = { duration: 0.25, ease: "easeInOut" as const };

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

function Router() {
  const { isAdmin, isLoading } = useAdminAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-muted-foreground text-sm"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Switch key={location}>
        <Route path="/admin/login">
          <AnimatedPage>
            {isAdmin ? <Redirect to="/dashboard" /> : <AdminLogin />}
          </AnimatedPage>
        </Route>

        <Route path="/">
          <AnimatedPage>
            {isAdmin ? (
              <AdminLayout><AryaChat /></AdminLayout>
            ) : (
              <PublicLayout><AryaChat /></PublicLayout>
            )}
          </AnimatedPage>
        </Route>

        <Route path="/my-goals">
          <AnimatedPage>
            <PublicLayout><UserGoals /></PublicLayout>
          </AnimatedPage>
        </Route>

        <Route path="/reflection/:token">
          <ReflectionPage />
        </Route>

        <Route path="/dashboard">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={Dashboard} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/orchestrator">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={Orchestrator} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/knowledge">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={Knowledge} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/ermate">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={ERmate} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/erprana">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={ErPrana} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/learning">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={SelfLearning} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/neural-link">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={NeuralLink} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/api">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={ApiPlayground} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/developers">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={DeveloperPortal} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/users">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={UserAnalytics} /></AdminLayout>
          </AnimatedPage>
        </Route>
        <Route path="/my-arya">
          <AnimatedPage>
            <AdminLayout><AdminRoute component={AdminARYA} /></AdminLayout>
          </AnimatedPage>
        </Route>

        <Route path="/community">
          <AnimatedPage><Community /></AnimatedPage>
        </Route>

        <Route path="/privacy">
          <AnimatedPage><PrivacyPolicy /></AnimatedPage>
        </Route>

        <Route path="/privacy-control">
          <AnimatedPage><PrivacyControlPage /></AnimatedPage>
        </Route>

        <Route path="/vedic-lens">
          <VedicLensPage />
        </Route>

        <Route path="/niti">
          <NitiPage />
        </Route>

        <Route path="/review">
          <WeeklyReviewPage />
        </Route>

        <Route path="/prana">
          <PranaPage />
        </Route>

        <Route path="/pricing">
          <AnimatedPage><PricingPage /></AnimatedPage>
        </Route>

        <Route path="/terms">
          <AnimatedPage><TermsAndConditions /></AnimatedPage>
        </Route>

        <Route>
          <AnimatedPage>
            <NotFound />
          </AnimatedPage>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AdminAuthProvider>
            <UserAuthProvider>
              <Toaster />
              <PWAPrompt />
              <OnboardingGuard>
                <Router />
              </OnboardingGuard>
            </UserAuthProvider>
          </AdminAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
