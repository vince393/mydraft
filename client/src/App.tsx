import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { saveDeviceAccount } from "@/lib/device-accounts";

function getOrCreateSessionId() {
  let sid = sessionStorage.getItem("_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_sid", sid);
  }
  return sid;
}

function usePageTracking() {
  const [location] = useLocation();
  const lastTracked = useRef("");
  useEffect(() => {
    if (location === lastTracked.current) return;
    lastTracked.current = location;
    const sessionId = getOrCreateSessionId();
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: location,
        referrer: document.referrer || null,
        sessionId,
      }),
    }).catch(() => {});
  }, [location]);
}
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AssistantModal } from "@/components/assistant-modal";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useScreenSize } from "@/hooks/use-screen-size";
import { usePlan } from "@/hooks/use-plan";
import Inbox from "@/pages/inbox";
import type { Email, User } from "@shared/schema";
import { getCategoryCounts, type EmailCategory } from "@/lib/email-categories";
import { Loader2 } from "lucide-react";
import { useMemo, Component, type ReactNode, type ErrorInfo } from "react";

const NotFound = lazy(() => import("@/pages/not-found"));
const LoginPage = lazy(() => import("@/pages/login"));
const LandingPage = lazy(() => import("@/pages/landing"));
const PublicPricingPage = lazy(() => import("@/pages/public-pricing"));
const ProductPage = lazy(() => import("@/pages/product"));
const SecurityPage = lazy(() => import("@/pages/security"));
const HelpPage = lazy(() => import("@/pages/help"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const ConnectEmailPage = lazy(() => import("@/pages/connect-email"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const OwnerPanel = lazy(() => import("@/pages/owner-panel"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));
const TermsOfServicePage = lazy(() => import("@/pages/terms-of-service"));
const CookiePolicyPage = lazy(() => import("@/pages/cookie-policy"));
const AcceptableUsePolicyPage = lazy(() => import("@/pages/acceptable-use-policy"));
const DataProcessingAgreementPage = lazy(() => import("@/pages/data-processing-agreement"));
const AIUsePolicyPage = lazy(() => import("@/pages/ai-use-policy"));
const RefundPolicyPage = lazy(() => import("@/pages/refund-policy"));
const TestimonialRewardPage = lazy(() => import("@/pages/testimonial-reward"));
const CampaignsPage = lazy(() => import("@/pages/campaigns"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
            <pre className="text-sm text-muted-foreground bg-muted p-4 rounded-lg text-left overflow-auto max-h-[300px] whitespace-pre-wrap">
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
            <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: unreadCounts } = useQuery<UnreadCounts>({
    queryKey: ["/api/emails/unread-counts"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Check if AI chat feature is enabled for this user
  const { data: aiChatEnabled, isLoading: aiChatLoading } = useQuery<{ key: string; enabled: boolean }>({
    queryKey: ["/api/feature-enabled", "ai_chat"],
    queryFn: async () => {
      const res = await fetch("/api/feature-enabled/ai_chat", { credentials: "include" });
      if (!res.ok) return { key: "ai_chat", enabled: false }; // Default to disabled if check fails
      return res.json();
    },
    staleTime: 60000, // Cache for 1 minute
    retry: 1, // Only retry once to avoid long delays
  });

  // Default to disabled while loading or on error to prevent unauthorized access
  const isAIChatEnabled = !aiChatLoading && aiChatEnabled?.enabled === true;

  const unreadCount = unreadCounts?.inbox || emails.filter((e) => !e.isRead).length;

  const categoryCounts = useMemo(() => {
    const inboxEmails = emails.filter(e => (e.folder || "inbox") === "inbox");
    return getCategoryCounts(inboxEmails);
  }, [emails]);

  const handleCompose = () => {
    setComposeMode("new");
    setShowComposeDialog(true);
  };

  const handleOpenAssistant = () => {
    if (!isAIChatEnabled) {
      return; // Feature is disabled for this user
    }
    if (!hasPro) {
      setShowUpgradeModal(true);
    } else {
      setIsAssistantOpen(true);
    }
  };

  const { toast } = useToast();

  const handleDropEmail = useCallback(async (emailId: string, targetFolder: string, targetFolderId?: number) => {
    if (!emailId) return;
    
    try {
      if (targetFolderId) {
        await apiRequest("POST", `/api/folders/${targetFolderId}/bulk-assign`, { messageIds: [emailId] });
        queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
        toast({ title: "Email moved", description: "Added to folder successfully" });
      } else {
        const validSystemFolders = ["inbox", "archived", "trash", "sent", "drafts", "junk"];
        if (!validSystemFolders.includes(targetFolder)) return;
        
        await apiRequest("PATCH", `/api/emails/${emailId}/folder`, { folder: targetFolder });
        queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
        queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
        const folderNames: Record<string, string> = { inbox: "Inbox", archived: "Archive", trash: "Trash", sent: "Sent", drafts: "Drafts", junk: "Junk" };
        toast({ title: "Email moved", description: `Moved to ${folderNames[targetFolder] || targetFolder}` });
      }
    } catch {
      toast({ title: "Failed to move email", description: "Please try again", variant: "destructive" });
    }
  }, [toast]);

  return (
    <SidebarProvider
      defaultOpen={screen.isDesktop}
      className="!min-h-0 h-dvh overflow-hidden"
      style={{
        "--sidebar-width": screen.isMobile ? "18rem" : "12%",
        "--sidebar-width-icon": "0rem",
      } as React.CSSProperties}
    >
      <div className="flex h-full w-full bg-background overflow-hidden">
        <AppSidebar
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          unreadCount={unreadCount}
          unreadCounts={unreadCounts}
          categoryCounts={categoryCounts}
          onCompose={handleCompose}
          onDropEmail={handleDropEmail}
        />
        <SidebarInset className="flex flex-1 min-w-0 overflow-hidden relative">
          <Inbox 
            activeFolder={activeFolder} 
            onFolderChange={setActiveFolder}
            showComposeDialog={showComposeDialog}
            setShowComposeDialog={setShowComposeDialog}
            composeMode={composeMode}
            setComposeMode={setComposeMode}
            onOpenAssistant={handleOpenAssistant}
            onCompose={handleCompose}
            isAIChatEnabled={isAIChatEnabled}
          />
        </SidebarInset>
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
    staleTime: 0,
  });

  const user = authData?.user ?? null;

  useEffect(() => {
    if (user) {
      saveDeviceAccount({
        userId: user.id,
        email: user.email,
        displayName: user.displayName || null,
        plan: user.plan || null,
      });
    }
  }, [user?.id, user?.email, user?.displayName, user?.plan]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !user) {
    return <Redirect to="/login" />;
  }

  // New flow: Login → Onboarding → Checkout → Connect Email
  // Step 1: Complete onboarding first (but allow checkout since it's part of onboarding)
  if (!user.onboardingCompleted && location !== "/onboarding" && !location.startsWith("/checkout")) {
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
    staleTime: 0,
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
  usePageTracking();
  return (
    <Suspense fallback={<PageLoader />}>
    <Switch>
      <Route path="/login">
        <PublicRoute redirectIfAuthenticated={true}>
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
      <Route path="/testimonial-reward">
        <TestimonialRewardPage />
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
      <Route path="/checkout">
        <ProtectedRoute>
          <CheckoutPage />
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
          <ErrorBoundary>
            <OwnerPanel />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      <Route path="/campaigns">
        <ProtectedRoute>
          <CampaignsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <LandingPage />
      </Route>
      <Route component={NotFound} />
    </Switch>
    </Suspense>
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
