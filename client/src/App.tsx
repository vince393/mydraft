import { useState } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { AssistantModal } from "@/components/assistant-modal";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useScreenSize } from "@/hooks/use-screen-size";
import { usePlan } from "@/hooks/use-plan";
import Inbox from "@/pages/inbox";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import LandingPage from "@/pages/landing";
import PublicPricingPage from "@/pages/public-pricing";
import ProductPage from "@/pages/product";
import SecurityPage from "@/pages/security";
import HelpPage from "@/pages/help";
import PricingPage from "@/pages/pricing";
import OnboardingPage from "@/pages/onboarding";
import ConnectEmailPage from "@/pages/connect-email";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import OwnerPanel from "@/pages/owner-panel";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import CookiePolicyPage from "@/pages/cookie-policy";
import AcceptableUsePolicyPage from "@/pages/acceptable-use-policy";
import DataProcessingAgreementPage from "@/pages/data-processing-agreement";
import AIUsePolicyPage from "@/pages/ai-use-policy";
import RefundPolicyPage from "@/pages/refund-policy";
import type { Email, User } from "@shared/schema";
import { Loader2, Sparkles } from "lucide-react";

interface AuthResponse {
  user: (User & { emailConnected?: boolean }) | null;
}

interface UnreadCounts {
  inbox: number;
  sent: number;
  archived: number;
  trash: number;
  drafts: number;
  junk: number;
}

function AuthenticatedApp() {
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [composeMode, setComposeMode] = useState<"new" | "reply" | "replyAll" | "forward">("new");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const screen = useScreenSize();
  const { hasPro } = usePlan();

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: unreadCounts } = useQuery<UnreadCounts>({
    queryKey: ["/api/emails/unread-counts"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadCounts?.inbox || emails.filter((e) => !e.isRead).length;

  const handleCompose = () => {
    setComposeMode("new");
    setShowComposeDialog(true);
  };

  const handleOpenAssistant = () => {
    if (!hasPro) {
      setShowUpgradeModal(true);
    } else {
      setIsAssistantOpen(true);
    }
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": screen.isMobile ? "0rem" : "12%",
        "--sidebar-width-icon": "0rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {!screen.isMobile && (
          <AppSidebar
            activeFolder={activeFolder}
            onFolderChange={setActiveFolder}
            unreadCount={unreadCount}
            unreadCounts={unreadCounts}
            onCompose={handleCompose}
          />
        )}
        <SidebarInset className="flex flex-1 min-w-0">
          <Inbox 
            activeFolder={activeFolder} 
            showComposeDialog={showComposeDialog}
            setShowComposeDialog={setShowComposeDialog}
            composeMode={composeMode}
            setComposeMode={setComposeMode}
          />
        </SidebarInset>
        {screen.isMobile && (
          <>
            <MobileBottomNav
              activeFolder={activeFolder}
              onFolderChange={setActiveFolder}
              unreadCounts={unreadCounts}
              onCompose={handleCompose}
            />
            <button
              onClick={handleOpenAssistant}
              className="fixed bottom-[72px] right-3 z-40 w-11 h-11 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-md active:scale-95 transition-transform"
              data-testid="mobile-ai-assistant-button"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </button>
          </>
        )}
      </div>
      
      <AssistantModal open={isAssistantOpen} onOpenChange={setIsAssistantOpen} />
      
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="AI Assistant"
        requiredPlan="pro"
      />
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

  // New flow: Login → Onboarding → Pricing → Connect Email
  // Step 1: Complete onboarding first
  if (!user.onboardingCompleted && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  // Step 2: Select plan after onboarding
  if (user.onboardingCompleted && !user.plan && location !== "/select-plan") {
    return <Redirect to="/select-plan" />;
  }

  // Step 3: Email connection is now optional - users can skip and connect later
  // The "Connect Account" button in the inbox header will remind them

  return <>{children}</>;
}

function PublicRoute({ children, redirectIfAuthenticated = true }: { children: React.ReactNode; redirectIfAuthenticated?: boolean }) {
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

  if (redirectIfAuthenticated && authData?.user) {
    // New flow: Onboarding → Pricing → Connect Email → Inbox
    if (!authData.user.onboardingCompleted) {
      return <Redirect to="/onboarding" />;
    }
    if (!authData.user.plan) {
      return <Redirect to="/select-plan" />;
    }
    // Redirect to inbox (or connect-email will be enforced by ProtectedRoute if needed)
    return <Redirect to="/inbox" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login">
        <PublicRoute redirectIfAuthenticated={false}>
          <LoginPage />
        </PublicRoute>
      </Route>
      <Route path="/pricing">
        <PublicPricingPage />
      </Route>
      <Route path="/product">
        <ProductPage />
      </Route>
      <Route path="/security">
        <SecurityPage />
      </Route>
      <Route path="/help">
        <HelpPage />
      </Route>
      <Route path="/privacy">
        <PrivacyPolicyPage />
      </Route>
      <Route path="/terms">
        <TermsOfServicePage />
      </Route>
      <Route path="/cookies">
        <CookiePolicyPage />
      </Route>
      <Route path="/acceptable-use">
        <AcceptableUsePolicyPage />
      </Route>
      <Route path="/dpa">
        <DataProcessingAgreementPage />
      </Route>
      <Route path="/ai-policy">
        <AIUsePolicyPage />
      </Route>
      <Route path="/refund-policy">
        <RefundPolicyPage />
      </Route>
      <Route path="/select-plan">
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
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/inbox">
        <ProtectedRoute>
          <AuthenticatedApp />
        </ProtectedRoute>
      </Route>
      <Route path="/owner">
        <ProtectedRoute>
          <OwnerPanel />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <PublicRoute redirectIfAuthenticated={false}>
          <LandingPage />
        </PublicRoute>
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
