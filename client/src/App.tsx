import { useState } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Inbox from "@/pages/inbox";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import PricingPage from "@/pages/pricing";
import OnboardingPage from "@/pages/onboarding";
import ConnectEmailPage from "@/pages/connect-email";
import type { Email, User } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface AuthResponse {
  user: User | null;
}

function AuthenticatedApp() {
  const [activeFolder, setActiveFolder] = useState("inbox");

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "11rem",
        "--sidebar-width-icon": "0rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          unreadCount={unreadCount}
        />
        <SidebarInset className="flex flex-1 min-w-0">
          <Inbox activeFolder={activeFolder} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  const { data: authData, isLoading, isError } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !authData?.user) {
    return <Redirect to="/login" />;
  }

  const user = authData.user;

  if (!user.plan && location !== "/pricing") {
    return <Redirect to="/pricing" />;
  }

  if (user.plan && !user.onboardingCompleted && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { data: authData, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authData?.user) {
    if (!authData.user.plan) {
      return <Redirect to="/pricing" />;
    }
    if (!authData.user.onboardingCompleted) {
      return <Redirect to="/onboarding" />;
    }
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>
      <Route path="/pricing">
        <ProtectedRoute>
          <PricingPage />
        </ProtectedRoute>
      </Route>
      <Route path="/onboarding">
        <ProtectedRoute>
          <OnboardingPage />
        </ProtectedRoute>
      </Route>
      <Route path="/connect-email">
        <ProtectedRoute>
          <ConnectEmailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <AuthenticatedApp />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRoutes />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
