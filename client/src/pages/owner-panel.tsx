import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Users,
  DollarSign,
  Activity,
  MessageSquare,
  Bell,
  ArrowLeft,
  Loader2,
  Crown,
  Mail,
  Calendar,
  Shield,
  TrendingUp,
  Send,
  Search,
  UserX,
  RotateCcw,
  Zap,
  Server,
  ToggleLeft,
  CheckCircle,
  AlertCircle,
  XCircle,
  Sparkles,
  UserPlus,
  Wallet,
  PieChart,
  BarChart3,
  Plus,
  Trash2,
  TrendingDown,
  Star,
  Check,
  X,
} from "lucide-react";

interface OwnerStats {
  totalUsers: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  freeUsers: number;
  proUsers: number;
  premiumUsers: number;
  connectedAccounts: number;
  signupsToday: number;
  signupsThisWeek: number;
  estimatedMRR: number;
  aiUsage: {
    draftsGenerated: number;
    emailsSent: number;
    polishUsed: number;
  };
}

interface UserData {
  id: string;
  email: string;
  plan: string;
  onboardingCompleted: boolean;
  createdAt: string;
  connectedProvider: string | null;
  connectedEmail: string | null;
}

interface Feedback {
  id: number;
  userId: string;
  userEmail: string;
  feedbackType: string;
  message: string;
  status: string;
  createdAt: string;
}

interface ActivityLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  actionType: string;
  details: string | null;
  createdAt: string;
}

interface SystemStatus {
  database: string;
  nylas: string;
  stripe: string;
  openai: string;
  lastChecked: string;
}

interface FeatureFlag {
  id: number;
  key: string;
  enabled: boolean;
  allowedEmails: string[] | null;
  description: string | null;
  updatedAt: string;
}

interface FinancialSummary {
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  expensesByCategory: Record<string, number>;
  revenueByPlan: Record<string, number>;
}

interface Expense {
  id: number;
  category: string;
  serviceName: string;
  amount: number;
  currency: string;
  description: string | null;
  billingPeriod: string | null;
  expenseDate: string;
  isRecurring: boolean;
  createdAt: string;
}

interface Revenue {
  id: number;
  userId: string | null;
  userEmail: string | null;
  plan: string;
  amount: number;
  type: string;
  description: string | null;
  revenueDate: string;
  createdAt: string;
}

interface Testimonial {
  id: number;
  userId: string;
  userEmail: string;
  content: string;
  rating: number;
  status: string;
  isFounder: boolean;
  createdAt: string;
}

interface OwnerNote {
  id: number;
  content: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const EXPENSE_CATEGORIES = [
  { value: "replit", label: "Replit", color: "#3B82F6" },
  { value: "nylas", label: "Nylas", color: "#8B5CF6" },
  { value: "openai", label: "OpenAI", color: "#10B981" },
  { value: "stripe", label: "Stripe", color: "#F59E0B" },
  { value: "google", label: "Google Cloud", color: "#4285F4" },
  { value: "aws", label: "AWS", color: "#FF9900" },
  { value: "cloudflare", label: "Cloudflare", color: "#F38020" },
  { value: "vercel", label: "Vercel", color: "#000000" },
  { value: "domain", label: "Domain & DNS", color: "#0EA5E9" },
  { value: "analytics", label: "Analytics", color: "#6366F1" },
  { value: "marketing", label: "Marketing", color: "#EC4899" },
  { value: "design", label: "Design Tools", color: "#A855F7" },
  { value: "legal", label: "Legal & Compliance", color: "#64748B" },
  { value: "other", label: "Other", color: "#6B7280" },
];

export default function OwnerPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState("all");

  const [notificationTarget, setNotificationTarget] = useState("all");
  const [notificationPlan, setNotificationPlan] = useState("free");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  
  // Finance state
  const [financePeriod, setFinancePeriod] = useState("month");
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: "replit",
    serviceName: "",
    amount: "",
    description: "",
    billingPeriod: "monthly",
    isRecurring: false,
  });
  
  // Notes state
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [pendingDeleteNoteIds, setPendingDeleteNoteIds] = useState<Set<number>>(new Set());
  const pendingDeleteTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [newNote, setNewNote] = useState({
    content: "",
    category: "general",
    isPinned: false,
  });

  const { data: isOwnerData, isLoading: checkingOwner } = useQuery<{ isOwner: boolean }>({
    queryKey: ["/api/owner/check"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
    enabled: isOwnerData?.isOwner === true,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/owner/users"],
    enabled: isOwnerData?.isOwner === true,
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/owner/feedback"],
    enabled: isOwnerData?.isOwner === true,
  });

  const { data: activityLogs = [], isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/owner/activity-logs"],
    enabled: isOwnerData?.isOwner === true,
  });

  const { data: systemStatus, isLoading: statusLoading } = useQuery<SystemStatus>({
    queryKey: ["/api/owner/system-status"],
    enabled: isOwnerData?.isOwner === true && activeTab === "system",
    refetchInterval: 30000,
  });

  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/owner/feature-flags"],
    enabled: isOwnerData?.isOwner === true && activeTab === "features",
  });

  // Finance queries
  const { data: financialSummary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/owner/finances/summary", financePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/owner/finances/summary?period=${financePeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch financial summary");
      return res.json();
    },
    enabled: isOwnerData?.isOwner === true && activeTab === "finances",
  });

  const { data: expensesList = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/owner/finances/expenses"],
    enabled: isOwnerData?.isOwner === true && activeTab === "finances",
  });

  const { data: revenueList = [], isLoading: revenueLoading } = useQuery<Revenue[]>({
    queryKey: ["/api/owner/finances/revenue"],
    enabled: isOwnerData?.isOwner === true && activeTab === "finances",
  });

  const { data: testimonialsList = [], isLoading: testimonialsLoading } = useQuery<Testimonial[]>({
    queryKey: ["/api/owner/testimonials"],
    enabled: isOwnerData?.isOwner === true && activeTab === "testimonials",
  });

  // Notes query - refetch on focus to sync across devices
  const { data: notesList = [], isLoading: notesLoading } = useQuery<OwnerNote[]>({
    queryKey: ["/api/owner/notes"],
    enabled: isOwnerData?.isOwner === true && activeTab === "notes",
    staleTime: 0, // Always refetch when tab becomes active
    refetchOnWindowFocus: true, // Refetch when window regains focus (for cross-device sync)
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/owner/feedback/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/feedback"] });
      toast({ title: "Feedback status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update feedback", variant: "destructive" });
    },
  });

  const updateUserPlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      return apiRequest("PATCH", `/api/owner/users/${userId}/plan`, { plan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      toast({ title: "User plan updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user plan", variant: "destructive" });
    },
  });

  const resetUserLimitsMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/owner/users/${userId}/reset-limits`, {});
    },
    onSuccess: () => {
      toast({ title: "User limits reset successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reset user limits", variant: "destructive" });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/owner/notifications/send", {
        target: notificationTarget,
        targetPlan: notificationPlan,
        title: notificationTitle,
        message: notificationMessage,
        type: "admin_notification",
      });
    },
    onSuccess: () => {
      toast({ title: "Notifications sent successfully" });
      setNotificationTitle("");
      setNotificationMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send notifications", variant: "destructive" });
    },
  });

  const toggleFeatureFlagMutation = useMutation({
    mutationFn: async ({ key, enabled, allowedEmails }: { key: string; enabled: boolean; allowedEmails?: string[] }) => {
      return apiRequest("PATCH", `/api/owner/feature-flags/${key}`, { enabled, allowedEmails });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/feature-flags"] });
      toast({ title: "Feature flag updated" });
    },
    onError: () => {
      toast({ title: "Failed to update feature flag", variant: "destructive" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (expense: typeof newExpense) => {
      return apiRequest("POST", "/api/owner/finances/expenses", {
        ...expense,
        amount: parseFloat(expense.amount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/finances/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/finances/summary"] });
      toast({ title: "Expense added successfully" });
      setShowAddExpenseForm(false);
      setNewExpense({
        category: "replit",
        serviceName: "",
        amount: "",
        description: "",
        billingPeriod: "monthly",
        isRecurring: false,
      });
    },
    onError: () => {
      toast({ title: "Failed to add expense", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/owner/finances/expenses/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/finances/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/finances/summary"] });
      toast({ title: "Expense deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete expense", variant: "destructive" });
    },
  });

  const updateTestimonialMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/owner/testimonials/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({ title: `Testimonial ${variables.status}` });
    },
    onError: () => {
      toast({ title: "Failed to update testimonial", variant: "destructive" });
    },
  });

  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/owner/testimonials/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({ title: "Testimonial deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete testimonial", variant: "destructive" });
    },
  });

  // Notes mutations
  const createNoteMutation = useMutation({
    mutationFn: async (note: typeof newNote) => {
      return apiRequest("POST", "/api/owner/notes", note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/notes"] });
      toast({ title: "Note created" });
      setShowAddNoteForm(false);
      setNewNote({ content: "", category: "general", isPinned: false });
    },
    onError: () => {
      toast({ title: "Failed to create note", variant: "destructive" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; content?: string; category?: string; isPinned?: boolean }) => {
      return apiRequest("PATCH", `/api/owner/notes/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/notes"] });
      toast({ title: "Note updated" });
      setEditingNoteId(null);
    },
    onError: () => {
      toast({ title: "Failed to update note", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/owner/notes/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/notes"] });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    },
  });

  const handleDeleteNote = (noteId: number) => {
    setPendingDeleteNoteIds(prev => new Set([...prev, noteId]));
    const timer = setTimeout(() => {
      deleteNoteMutation.mutate(noteId);
      setPendingDeleteNoteIds(prev => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
      pendingDeleteTimers.current.delete(noteId);
    }, 5000);
    pendingDeleteTimers.current.set(noteId, timer);
    toast({
      title: "Note deleted",
      description: "This note will be permanently removed shortly.",
      action: (
        <ToastAction
          altText="Undo delete"
          onClick={() => {
            const existingTimer = pendingDeleteTimers.current.get(noteId);
            if (existingTimer) {
              clearTimeout(existingTimer);
              pendingDeleteTimers.current.delete(noteId);
            }
            setPendingDeleteNoteIds(prev => {
              const next = new Set(prev);
              next.delete(noteId);
              return next;
            });
            toast({ title: "Note restored" });
          }}
          data-testid="button-undo-delete-note"
        >
          Undo
        </ToastAction>
      ),
    });
  };

  useEffect(() => {
    return () => {
      pendingDeleteTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Format currency helper
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (checkingOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwnerData?.isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You do not have permission to access the owner panel.
            </p>
            <Button onClick={() => setLocation("/inbox")} data-testid="button-back-inbox">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = userSearchQuery === "" || 
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.id.includes(userSearchQuery);
    const matchesPlan = userPlanFilter === "all" || user.plan === userPlanFilter;
    return matchesSearch && matchesPlan;
  });

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "premium":
        return "default";
      case "pro":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getFeedbackTypeBadge = (type: string) => {
    switch (type) {
      case "feature_request":
        return <Badge variant="secondary">Feature Request</Badge>;
      case "bug_report":
        return <Badge variant="destructive">Bug Report</Badge>;
      default:
        return <Badge variant="outline">General</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "reviewed":
        return <Badge variant="secondary">Reviewed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getActionTypeBadge = (actionType: string) => {
    switch (actionType) {
      case "signup":
        return <Badge variant="secondary">Signup</Badge>;
      case "plan_upgrade":
        return <Badge className="bg-green-500">Upgrade</Badge>;
      case "plan_downgrade":
        return <Badge variant="destructive">Downgrade</Badge>;
      case "team_invite_sent":
        return <Badge variant="outline">Team Invite</Badge>;
      case "email_connected":
        return <Badge variant="secondary">Email Connected</Badge>;
      default:
        return <Badge variant="outline">{actionType}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "configured":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "degraded":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-500" />
            <h1 className="text-xl font-semibold">Owner Panel</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation("/inbox")} data-testid="button-back-inbox">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <TrendingUp className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system">
              <Server className="w-4 h-4 mr-2" />
              System
            </TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features">
              <ToggleLeft className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="finances" data-testid="tab-finances">
              <Wallet className="w-4 h-4 mr-2" />
              Finances
            </TabsTrigger>
            <TabsTrigger value="testimonials" data-testid="tab-testimonials">
              <Star className="w-4 h-4 mr-2" />
              Testimonials
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes">
              <MessageSquare className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.connectedAccounts || 0} with connected email
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${stats?.estimatedMRR || 0}</div>
                      <p className="text-xs text-muted-foreground">Estimated MRR</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">New Signups</CardTitle>
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.signupsToday || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.signupsThisWeek || 0} this week
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.activeUsers7Days || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.activeUsers30Days || 0} in 30 days
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
                      <Crown className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{stats?.freeUsers || 0} Free</Badge>
                        <Badge variant="secondary">{stats?.proUsers || 0} Pro</Badge>
                        <Badge>{stats?.premiumUsers || 0} Business</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Drafts Generated</span>
                          <span>{stats?.aiUsage?.draftsGenerated || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Emails Sent</span>
                          <span>{stats?.aiUsage?.emailsSent || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Polish Used</span>
                          <span>{stats?.aiUsage?.polishUsed || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Connected Emails</CardTitle>
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.connectedAccounts || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.totalUsers ? Math.round((stats.connectedAccounts / stats.totalUsers) * 100) : 0}% connection rate
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage all registered users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email or ID..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-user-search"
                    />
                  </div>
                  <Select value={userPlanFilter} onValueChange={setUserPlanFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-plan-filter">
                      <SelectValue placeholder="Filter by plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Change Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Connected Email</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                {user.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPlanBadgeVariant(user.plan)}>
                                {user.plan === "premium" ? "Business" : user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.plan}
                                onValueChange={(value) =>
                                  updateUserPlanMutation.mutate({ userId: user.id, plan: value })
                                }
                              >
                                <SelectTrigger className="w-[110px]" data-testid={`select-plan-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="premium">Business</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {user.onboardingCompleted ? (
                                <Badge variant="secondary">Active</Badge>
                              ) : (
                                <Badge variant="outline">Onboarding</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.connectedProvider ? (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline">{user.connectedProvider}</Badge>
                                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {user.connectedEmail}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not connected</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(user.createdAt), "MMM d, yyyy")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => resetUserLimitsMutation.mutate(user.id)}
                                  disabled={resetUserLimitsMutation.isPending}
                                  title="Reset AI usage limits"
                                  data-testid={`button-reset-limits-${user.id}`}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>User Feedback</CardTitle>
                <CardDescription>Review and manage user feedback submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : feedback.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No feedback submissions yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedback.map((item) => (
                          <TableRow key={item.id} data-testid={`row-feedback-${item.id}`}>
                            <TableCell className="font-medium">{item.userEmail}</TableCell>
                            <TableCell>{getFeedbackTypeBadge(item.feedbackType)}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{item.message}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>{format(new Date(item.createdAt), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <Select
                                value={item.status}
                                onValueChange={(value) =>
                                  updateFeedbackMutation.mutate({ id: item.id, status: value })
                                }
                              >
                                <SelectTrigger className="w-[120px]" data-testid={`select-status-${item.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="reviewed">Reviewed</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Send Notifications</CardTitle>
                <CardDescription>Send notifications to users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target</label>
                  <Select value={notificationTarget} onValueChange={setNotificationTarget}>
                    <SelectTrigger data-testid="select-notification-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="plan">By Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {notificationTarget === "plan" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan</label>
                    <Select value={notificationPlan} onValueChange={setNotificationPlan}>
                      <SelectTrigger data-testid="select-notification-plan">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Notification title"
                    data-testid="input-notification-title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Notification message"
                    rows={4}
                    data-testid="input-notification-message"
                  />
                </div>

                <Button
                  onClick={() => sendNotificationMutation.mutate()}
                  disabled={!notificationTitle || !notificationMessage || sendNotificationMutation.isPending}
                  data-testid="button-send-notification"
                >
                  {sendNotificationMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Notification
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service Status</CardTitle>
                  <CardDescription>Current status of connected services</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Server className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Database</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(systemStatus?.database || "unknown")}
                          <span className="text-sm capitalize">{systemStatus?.database || "Unknown"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Nylas (Email)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(systemStatus?.nylas || "unknown")}
                          <span className="text-sm capitalize">{systemStatus?.nylas || "Unknown"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Stripe (Payments)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(systemStatus?.stripe || "unknown")}
                          <span className="text-sm capitalize">{systemStatus?.stripe || "Unknown"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Zap className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">OpenAI (AI)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(systemStatus?.openai || "unknown")}
                          <span className="text-sm capitalize">{systemStatus?.openai || "Unknown"}</span>
                        </div>
                      </div>

                      {systemStatus?.lastChecked && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Last checked: {format(new Date(systemStatus.lastChecked), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Platform overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Total Users</span>
                      <span className="font-bold">{stats?.totalUsers || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Paying Users</span>
                      <span className="font-bold">{(stats?.proUsers || 0) + (stats?.premiumUsers || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Conversion Rate</span>
                      <span className="font-bold">
                        {stats?.totalUsers 
                          ? Math.round(((stats.proUsers + stats.premiumUsers) / stats.totalUsers) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Email Connection Rate</span>
                      <span className="font-bold">
                        {stats?.totalUsers 
                          ? Math.round((stats.connectedAccounts / stats.totalUsers) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Features Control
                  </CardTitle>
                  <CardDescription>
                    Toggle AI Chat, Voice Assistant, and other AI features. When disabled globally, 
                    only allowed emails can access the feature.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {flagsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {featureFlags.map((flag) => (
                        <div
                          key={flag.id}
                          className="p-4 rounded-lg border bg-card"
                          data-testid={`feature-flag-${flag.key}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">
                                  {flag.description || flag.key.replace(/_/g, " ")}
                                </span>
                                {flag.enabled ? (
                                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Enabled for All
                                  </Badge>
                                ) : flag.allowedEmails && flag.allowedEmails.length > 0 ? (
                                  <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-600">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Limited Access
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-red-500/20 text-red-600">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Key: <code className="bg-muted px-1 rounded">{flag.key}</code>
                              </p>
                            </div>
                            <Switch
                              checked={flag.enabled}
                              onCheckedChange={(checked) =>
                                toggleFeatureFlagMutation.mutate({ 
                                  key: flag.key, 
                                  enabled: checked,
                                  allowedEmails: flag.allowedEmails || []
                                })
                              }
                              data-testid={`toggle-feature-${flag.key}`}
                            />
                          </div>
                          
                          {!flag.enabled && (
                            <div className="mt-3 pt-3 border-t">
                              <label className="text-sm font-medium mb-2 block">
                                Allowed Emails (can still access when disabled)
                              </label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="email@example.com"
                                  className="flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const input = e.target as HTMLInputElement;
                                      const email = input.value.trim();
                                      if (email && email.includes("@")) {
                                        const currentEmails = flag.allowedEmails || [];
                                        if (!currentEmails.includes(email)) {
                                          toggleFeatureFlagMutation.mutate({
                                            key: flag.key,
                                            enabled: false,
                                            allowedEmails: [...currentEmails, email]
                                          });
                                        }
                                        input.value = "";
                                      }
                                    }
                                  }}
                                  data-testid={`allowed-email-input-${flag.key}`}
                                />
                              </div>
                              {flag.allowedEmails && flag.allowedEmails.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {flag.allowedEmails.map((email) => (
                                    <Badge 
                                      key={email} 
                                      variant="secondary" 
                                      className="text-xs flex items-center gap-1"
                                    >
                                      {email}
                                      <button
                                        onClick={() => {
                                          toggleFeatureFlagMutation.mutate({
                                            key: flag.key,
                                            enabled: false,
                                            allowedEmails: (flag.allowedEmails || []).filter(e => e !== email)
                                          });
                                        }}
                                        className="ml-1 hover:text-destructive"
                                        data-testid={`remove-email-${flag.key}-${email}`}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent user activity and events</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity logs yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs.map((log) => (
                          <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                            <TableCell className="font-medium">
                              {log.userEmail || "System"}
                            </TableCell>
                            <TableCell>{getActionTypeBadge(log.actionType)}</TableCell>
                            <TableCell className="max-w-[300px] truncate text-muted-foreground">
                              {log.details || "-"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances">
            <div className="space-y-6">
              {/* Period Selector */}
              <div className="flex items-center gap-4">
                <Select value={financePeriod} onValueChange={setFinancePeriod}>
                  <SelectTrigger className="w-[180px]" data-testid="select-finance-period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Financial Summary Cards */}
              {summaryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialSummary?.totalRevenue || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {financePeriod === "day" ? "Today" : 
                         financePeriod === "week" ? "This week" :
                         financePeriod === "month" ? "This month" :
                         financePeriod === "year" ? "This year" : "All time"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(financialSummary?.totalExpenses || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Across all services
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${(financialSummary?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(financialSummary?.netProfit || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Revenue - Expenses
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Expense Breakdown by Category */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Expenses by Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!financialSummary?.expensesByCategory || Object.keys(financialSummary.expensesByCategory).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No expenses recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {EXPENSE_CATEGORIES.map((cat) => {
                          const amount = financialSummary?.expensesByCategory[cat.value] || 0;
                          const total = financialSummary?.totalExpenses || 1;
                          const percentage = total > 0 ? (amount / total) * 100 : 0;
                          return (
                            <div key={cat.value} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.label}
                                </span>
                                <span className="font-medium">{formatCurrency(amount)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Revenue by Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!financialSummary?.revenueByPlan || Object.keys(financialSummary.revenueByPlan).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No revenue recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { value: "pro", label: "Pro ($10/mo)", color: "#8B5CF6" },
                          { value: "premium", label: "Business ($29/mo)", color: "#F59E0B" },
                          { value: "free", label: "Free", color: "#6B7280" },
                        ].map((plan) => {
                          const amount = financialSummary?.revenueByPlan[plan.value] || 0;
                          const total = financialSummary?.totalRevenue || 1;
                          const percentage = total > 0 ? (amount / total) * 100 : 0;
                          return (
                            <div key={plan.value} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                                  {plan.label}
                                </span>
                                <span className="font-medium">{formatCurrency(amount)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%`, backgroundColor: plan.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Add Expense Form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Service Expenses</CardTitle>
                      <CardDescription>Track costs for Replit, Nylas, OpenAI, Stripe, and other services</CardDescription>
                    </div>
                    <Button
                      onClick={() => setShowAddExpenseForm(!showAddExpenseForm)}
                      data-testid="button-add-expense"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showAddExpenseForm && (
                    <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Service Category</label>
                          <Select
                            value={newExpense.category}
                            onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                          >
                            <SelectTrigger data-testid="select-expense-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Service Name</label>
                          <Input
                            placeholder="e.g., Replit Core, OpenAI API"
                            value={newExpense.serviceName}
                            onChange={(e) => setNewExpense({ ...newExpense, serviceName: e.target.value })}
                            data-testid="input-expense-service"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Amount ($)</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                            data-testid="input-expense-amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Billing Period</label>
                          <Select
                            value={newExpense.billingPeriod}
                            onValueChange={(value) => setNewExpense({ ...newExpense, billingPeriod: value })}
                          >
                            <SelectTrigger data-testid="select-expense-billing">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                              <SelectItem value="per-usage">Per Usage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description (optional)</label>
                        <Textarea
                          placeholder="Additional details about this expense..."
                          value={newExpense.description}
                          onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                          data-testid="input-expense-description"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newExpense.isRecurring}
                          onCheckedChange={(checked) => setNewExpense({ ...newExpense, isRecurring: checked })}
                          data-testid="toggle-expense-recurring"
                        />
                        <label className="text-sm">Recurring expense</label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createExpenseMutation.mutate(newExpense)}
                          disabled={!newExpense.serviceName || !newExpense.amount || createExpenseMutation.isPending}
                          data-testid="button-save-expense"
                        >
                          {createExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Save Expense
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddExpenseForm(false)}
                          data-testid="button-cancel-expense"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {expensesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : expensesList.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No expenses recorded yet</p>
                      <p className="text-sm mt-2">Click "Add Expense" to track your service costs</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Billing</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expensesList.map((expense) => {
                            const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                            return (
                              <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                                <TableCell className="font-medium">{expense.serviceName}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1 w-fit"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: categoryInfo?.color }}
                                    />
                                    {categoryInfo?.label || expense.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-red-600">
                                  {formatCurrency(expense.amount)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {expense.billingPeriod || "-"}
                                  {expense.isRecurring && (
                                    <Badge variant="secondary" className="ml-2 text-xs">Recurring</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deleteExpenseMutation.mutate(expense.id)}
                                    disabled={deleteExpenseMutation.isPending}
                                    data-testid={`button-delete-expense-${expense.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Revenue List */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue History</CardTitle>
                  <CardDescription>Subscription payments and income</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : revenueList.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No revenue recorded yet</p>
                      <p className="text-sm mt-2">Revenue from Stripe subscriptions will appear here</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueList.map((rev) => (
                            <TableRow key={rev.id} data-testid={`row-revenue-${rev.id}`}>
                              <TableCell className="font-medium">
                                {rev.userEmail || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={rev.plan === "premium" ? "default" : "secondary"}>
                                  {rev.plan === "premium" ? "Business" : rev.plan === "pro" ? "Pro" : "Free"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-green-600">
                                {formatCurrency(rev.amount)}
                              </TableCell>
                              <TableCell className="text-muted-foreground capitalize">
                                {rev.type}
                              </TableCell>
                              <TableCell>
                                {format(new Date(rev.revenueDate), "MMM d, yyyy")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="testimonials">
            <Card>
              <CardHeader>
                <CardTitle>Testimonial Management</CardTitle>
                <CardDescription>Review and approve user testimonials for the landing page</CardDescription>
              </CardHeader>
              <CardContent>
                {testimonialsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : testimonialsList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No testimonials submitted yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {testimonialsList.map((testimonial) => (
                        <div
                          key={testimonial.id}
                          className="p-4 border rounded-lg space-y-3"
                          data-testid={`testimonial-${testimonial.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium" data-testid={`text-email-${testimonial.id}`}>{testimonial.userEmail}</span>
                                {testimonial.isFounder && (
                                  <Badge variant="secondary">Founder</Badge>
                                )}
                                <Badge 
                                  variant={
                                    testimonial.status === "approved" ? "default" :
                                    testimonial.status === "denied" ? "destructive" : "outline"
                                  }
                                  data-testid={`status-${testimonial.id}`}
                                >
                                  {testimonial.status}
                                </Badge>
                              </div>
                              <div className="flex gap-0.5 mb-2" data-testid={`rating-stars-${testimonial.id}`}>
                                {[...Array(testimonial.rating)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                ))}
                                {[...Array(5 - testimonial.rating)].map((_, i) => (
                                  <Star key={`empty-${i}`} className="w-4 h-4 text-muted-foreground" />
                                ))}
                              </div>
                              <p className="text-muted-foreground">"{testimonial.content}"</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Submitted {format(new Date(testimonial.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {testimonial.status !== "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTestimonialMutation.mutate({ id: testimonial.id, status: "approved" })}
                                  disabled={updateTestimonialMutation.isPending}
                                  data-testid={`approve-testimonial-${testimonial.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {testimonial.status !== "denied" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTestimonialMutation.mutate({ id: testimonial.id, status: "denied" })}
                                  disabled={updateTestimonialMutation.isPending}
                                  data-testid={`deny-testimonial-${testimonial.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Deny
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteTestimonialMutation.mutate(testimonial.id)}
                                disabled={deleteTestimonialMutation.isPending}
                                data-testid={`delete-testimonial-${testimonial.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Owner Notes</CardTitle>
                    <CardDescription>Personal notes and reminders</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                    data-testid="button-add-note"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddNoteForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" data-testid="label-note-content">Note Content</label>
                      <Textarea
                        placeholder="Write your note here..."
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        className="min-h-[120px]"
                        data-testid="input-note-content"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" data-testid="label-note-category">Category</label>
                        <Select
                          value={newNote.category}
                          onValueChange={(value) => setNewNote({ ...newNote, category: value })}
                        >
                          <SelectTrigger data-testid="select-note-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general" data-testid="option-note-category-general">General</SelectItem>
                            <SelectItem value="todo" data-testid="option-note-category-todo">To-Do</SelectItem>
                            <SelectItem value="ideas" data-testid="option-note-category-ideas">Ideas</SelectItem>
                            <SelectItem value="important" data-testid="option-note-category-important">Important</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          checked={newNote.isPinned}
                          onCheckedChange={(checked) => setNewNote({ ...newNote, isPinned: checked })}
                          data-testid="toggle-note-pinned"
                        />
                        <label className="text-sm" data-testid="label-note-pinned">Pin this note</label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => createNoteMutation.mutate(newNote)}
                        disabled={!newNote.content.trim() || createNoteMutation.isPending}
                        data-testid="button-save-note"
                      >
                        {createNoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Note
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddNoteForm(false);
                          setNewNote({ content: "", category: "general", isPinned: false });
                        }}
                        data-testid="button-cancel-note"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {notesLoading ? (
                  <div className="flex items-center justify-center py-12" data-testid="notes-loading">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : notesList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground" data-testid="notes-empty-state">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p data-testid="text-notes-empty-title">No notes yet</p>
                    <p className="text-sm mt-2" data-testid="text-notes-empty-hint">Click "Add Note" to create your first note</p>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="notes-list">
                    {notesList.filter(note => !pendingDeleteNoteIds.has(note.id)).map((note) => {
                      const categoryColors: Record<string, string> = {
                        general: "bg-muted-foreground/70 dark:bg-muted-foreground/50",
                        todo: "bg-blue-500 dark:bg-blue-400",
                        ideas: "bg-purple-500 dark:bg-purple-400",
                        important: "bg-destructive dark:bg-destructive",
                      };
                      return (
                        <div
                          key={note.id}
                          className={`p-4 border rounded-lg ${note.isPinned ? "border-primary bg-primary/5" : ""}`}
                          data-testid={`note-${note.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className={`w-2 h-2 rounded-full ${categoryColors[note.category] || "bg-muted-foreground/70 dark:bg-muted-foreground/50"}`}
                                  data-testid={`note-category-dot-${note.id}`}
                                />
                                <Badge variant="outline" className="text-xs" data-testid={`badge-note-category-${note.id}`}>
                                  {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                                </Badge>
                                {note.isPinned && (
                                  <Badge variant="secondary" className="text-xs" data-testid={`badge-note-pinned-${note.id}`}>Pinned</Badge>
                                )}
                              </div>
                              {editingNoteId === note.id ? (
                                <Textarea
                                  defaultValue={note.content}
                                  className="min-h-[100px]"
                                  onBlur={(e) => {
                                    if (e.target.value.trim() !== note.content) {
                                      updateNoteMutation.mutate({ id: note.id, content: e.target.value.trim() });
                                    } else {
                                      setEditingNoteId(null);
                                    }
                                  }}
                                  autoFocus
                                  data-testid={`edit-note-${note.id}`}
                                />
                              ) : (
                                <p 
                                  className="text-sm whitespace-pre-wrap cursor-pointer p-2 rounded hover-elevate"
                                  data-testid={`text-note-content-${note.id}`}
                                  onClick={() => setEditingNoteId(note.id)}
                                >
                                  {note.content}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground" data-testid={`text-note-timestamp-${note.id}`}>
                                Updated {format(new Date(note.updatedAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateNoteMutation.mutate({ id: note.id, isPinned: !note.isPinned })}
                                disabled={updateNoteMutation.isPending}
                                data-testid={`pin-note-${note.id}`}
                              >
                                {note.isPinned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={pendingDeleteNoteIds.has(note.id)}
                                className="text-destructive"
                                data-testid={`delete-note-${note.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
