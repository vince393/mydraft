import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
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
  Minus,
  Coins,
  Trash2,
  TrendingDown,
  Star,
  Check,
  X,
  HeartPulse,
  Globe,
  Eye,
  MousePointer,
  MapPin,
  ArrowUpRight,
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
  google: string;
  microsoft: string;
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

interface ApiHealthSummary {
  status: string;
  errorsLast24h: number;
  unresolvedCritical: number;
  googleErrorsLast24h: number;
  microsoftErrorsLast24h: number;
}

interface ApiHealthLog {
  id: number;
  provider: string;
  endpoint: string;
  statusCode: number;
  errorMessage: string;
  severity: string;
  resolved: boolean;
  createdAt: string;
}

interface AiCostSummary {
  totalCostCents: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCalls: number;
  byModel: Record<string, { calls: number; costCents: number; tokens: number }>;
  byEndpoint: Record<string, { calls: number; costCents: number; tokens: number }>;
  dailyCosts: { date: string; costCents: number; calls: number }[];
}

const EXPENSE_CATEGORIES = [
  { value: "replit", label: "Replit", color: "#3B82F6" },
  { value: "google", label: "Google", color: "#4285F4" },
  { value: "microsoft", label: "Microsoft", color: "#00A4EF" },
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

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  dailyData: { date: string; views: number; visitors: number }[];
  topCountries: { name: string; count: number }[];
  topRegions: { name: string; count: number }[];
  topPages: { path: string; count: number }[];
  topReferrers: { source: string; count: number }[];
  revenue: number;
  expenses: number;
  profit: number;
  newUsers: number;
  totalUsers: number;
  conversionRate: number;
  overallConversion: number;
  range: string;
}

function AnalyticsTab() {
  const [range, setRange] = useState("7d");
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/owner/analytics", range],
    queryFn: async () => {
      const res = await fetch(`/api/owner/analytics?range=${range}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });

  const rangeOptions = [
    { value: "1d", label: "Today" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "365d", label: "1 Year" },
  ];

  const maxViews = data?.dailyData ? Math.max(...data.dailyData.map((d) => d.views), 1) : 1;
  const maxVisitors = data?.dailyData ? Math.max(...data.dailyData.map((d) => d.visitors), 1) : 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics Overview</h2>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                range === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              data-testid={`analytics-range-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground">Page Views</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-views">{data?.totalViews?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MousePointer className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-xs text-muted-foreground">Unique Visitors</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-unique-visitors">{data?.uniqueVisitors?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-analytics-revenue">${((data?.revenue || 0) / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-xs text-muted-foreground">Conversion</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-conversion-rate">{data?.overallConversion || 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-muted-foreground">Costs</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-analytics-costs">${((data?.expenses || 0) / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Profit</span>
            </div>
            <p className={`text-xl font-bold ${(data?.profit || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`} data-testid="text-analytics-profit">
              {(data?.profit || 0) >= 0 ? "" : "-"}${(Math.abs(data?.profit || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-muted-foreground">New Users</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-new-users">{data?.newUsers?.toLocaleString() || 0}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{data?.totalUsers?.toLocaleString() || 0} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground">Conversion</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-period-conversion">{data?.conversionRate || 0}%</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{data?.overallConversion || 0}% overall</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Visitors Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.dailyData && data.dailyData.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-end gap-[2px] h-40" data-testid="chart-visitors">
                {data.dailyData.map((day, i) => {
                  const viewHeight = (day.views / maxViews) * 100;
                  const visitorHeight = (day.visitors / maxVisitors) * 100;
                  const dateLabel = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-[1px] group relative" title={`${dateLabel}: ${day.views} views, ${day.visitors} visitors`}>
                      <div className="w-full flex gap-[1px] items-end h-full">
                        <div
                          className="flex-1 bg-blue-500/60 rounded-t-sm transition-all hover:bg-blue-500/80"
                          style={{ height: `${Math.max(viewHeight, 2)}%` }}
                        />
                        <div
                          className="flex-1 bg-green-500/50 rounded-t-sm transition-all hover:bg-green-500/70"
                          style={{ height: `${Math.max(visitorHeight, 2)}%` }}
                        />
                      </div>
                      {(i === 0 || i === data.dailyData.length - 1 || data.dailyData.length <= 14 || i % Math.ceil(data.dailyData.length / 10) === 0) && (
                        <span className="text-[9px] text-muted-foreground/50 mt-1 whitespace-nowrap">{dateLabel}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 justify-end pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/60" />
                  <span className="text-[10px] text-muted-foreground">Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-500/50" />
                  <span className="text-[10px] text-muted-foreground">Visitors</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/40">
              <BarChart3 className="w-8 h-8 mb-2" />
              <p className="text-xs">No data yet for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topCountries && data.topCountries.length > 0 ? (
              <div className="space-y-2">
                {data.topCountries.map((c) => {
                  const pct = data.totalViews > 0 ? (c.count / data.totalViews) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-3" data-testid={`geo-country-${c.name}`}>
                      <span className="text-xs text-foreground/80 w-28 truncate">{c.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500/50" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40 py-4 text-center">No location data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-400" />
              Top Regions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topRegions && data.topRegions.length > 0 ? (
              <div className="space-y-2">
                {data.topRegions.map((r) => {
                  const pct = data.totalViews > 0 ? (r.count / data.totalViews) * 100 : 0;
                  return (
                    <div key={r.name} className="flex items-center gap-3" data-testid={`geo-region-${r.name}`}>
                      <span className="text-xs text-foreground/80 w-28 truncate">{r.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full bg-green-500/50" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{r.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40 py-4 text-center">No location data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topPages && data.topPages.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Page</TableHead>
                    <TableHead className="text-xs text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPages.map((p) => (
                    <TableRow key={p.path}>
                      <TableCell className="text-xs font-mono">{p.path}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{p.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-xs text-muted-foreground/40 py-4 text-center">No page data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topReferrers && data.topReferrers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs text-right">Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topReferrers.map((r) => (
                    <TableRow key={r.source}>
                      <TableCell className="text-xs truncate max-w-[200px]">{r.source}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-xs text-muted-foreground/40 py-4 text-center">No referrer data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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

  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastPlan, setBroadcastPlan] = useState("pro");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  
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

  const { data: aiCosts, isLoading: aiCostsLoading } = useQuery<AiCostSummary>({
    queryKey: ["/api/owner/ai-costs", financePeriod],
    queryFn: async () => {
      const days = financePeriod === "day" ? "1" : financePeriod === "week" ? "7" : financePeriod === "month" ? "30" : financePeriod === "year" ? "365" : "3650";
      const res = await fetch(`/api/owner/ai-costs?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch AI costs");
      return res.json();
    },
    enabled: isOwnerData?.isOwner === true && activeTab === "finances",
  });

  const { data: dailyFinancials = [] } = useQuery<{ date: string; totalExpenses: number; totalRevenue: number; netProfit: number }[]>({
    queryKey: ["/api/owner/finances/daily", financePeriod],
    queryFn: async () => {
      const days = financePeriod === "day" ? "1" : financePeriod === "week" ? "7" : financePeriod === "month" ? "30" : financePeriod === "year" ? "365" : "3650";
      const res = await fetch(`/api/owner/finances/daily?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily financials");
      return res.json();
    },
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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: apiHealthSummary, isLoading: healthSummaryLoading } = useQuery<ApiHealthSummary>({
    queryKey: ["/api/owner/api-health/summary"],
    enabled: isOwnerData?.isOwner === true && activeTab === "api-health",
    refetchInterval: 30000,
  });

  const { data: apiHealthLogs = [], isLoading: healthLogsLoading } = useQuery<ApiHealthLog[]>({
    queryKey: ["/api/owner/api-health/logs"],
    enabled: isOwnerData?.isOwner === true && activeTab === "api-health",
  });

  const { data: apiHealthUnresolved = [], isLoading: healthUnresolvedLoading } = useQuery<ApiHealthLog[]>({
    queryKey: ["/api/owner/api-health/unresolved"],
    enabled: isOwnerData?.isOwner === true && activeTab === "api-health",
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

  const [creditUser, setCreditUser] = useState<UserData | null>(null);
  const [creditAmount, setCreditAmount] = useState("");

  const { data: creditData, isLoading: creditLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/owner/users", creditUser?.id, "credits"],
    enabled: !!creditUser,
  });

  const adjustCreditsMutation = useMutation({
    mutationFn: async ({
      userId,
      amount,
      mode,
    }: {
      userId: string;
      amount: number;
      mode: "give" | "take";
    }) => {
      const res = await apiRequest("POST", `/api/owner/users/${userId}/credits`, {
        amount,
        mode,
      });
      return res.json() as Promise<{ balance: number; removed: number }>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/owner/users", variables.userId, "credits"],
      });
      setCreditAmount("");
      toast({
        title:
          variables.mode === "give"
            ? `Gave ${variables.amount} credits`
            : `Removed ${data.removed} credits`,
      });
    },
    onError: () => {
      toast({ title: "Failed to update credits", variant: "destructive" });
    },
  });

  const handleAdjustCredits = (mode: "give" | "take") => {
    if (!creditUser) return;
    const amount = parseInt(creditAmount, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast({
        title: "Enter a whole number greater than 0",
        variant: "destructive",
      });
      return;
    }
    adjustCreditsMutation.mutate({ userId: creditUser.id, amount, mode });
  };

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

  const broadcastEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/owner/email/broadcast", {
        target: broadcastTarget,
        targetPlan: broadcastPlan,
        subject: broadcastSubject,
        body: broadcastBody,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `Email sent to ${data.sent} users` + (data.failed ? ` (${data.failed} failed)` : "") });
      setBroadcastSubject("");
      setBroadcastBody("");
    },
    onError: () => {
      toast({ title: "Failed to send broadcast email", variant: "destructive" });
    },
  });

  const { data: emailStats, isLoading: emailStatsLoading } = useQuery({
    queryKey: ["/api/owner/email/stats"],
    enabled: activeTab === "notifications",
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

  const resolveHealthIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/owner/api-health/resolve/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/api-health/unresolved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/api-health/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/api-health/summary"] });
      toast({ title: "Issue resolved" });
    },
    onError: () => {
      toast({ title: "Failed to resolve issue", variant: "destructive" });
    },
  });

  const resolveAllHealthIssuesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/owner/api-health/resolve-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/api-health/unresolved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/api-health/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/api-health/summary"] });
      toast({ title: "All issues resolved" });
    },
    onError: () => {
      toast({ title: "Failed to resolve all issues", variant: "destructive" });
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

  const navItems = [
    { value: "dashboard", icon: TrendingUp, label: "Dashboard" },
    { value: "users", icon: Users, label: "Users" },
    { value: "feedback", icon: MessageSquare, label: "Feedback" },
    { value: "notifications", icon: Bell, label: "Notifications" },
    { value: "system", icon: Server, label: "System" },
    { value: "features", icon: ToggleLeft, label: "Features" },
    { value: "activity", icon: Activity, label: "Activity" },
    { value: "finances", icon: Wallet, label: "Finances" },
    { value: "testimonials", icon: Star, label: "Testimonials" },
    { value: "notes", icon: MessageSquare, label: "Notes" },
    { value: "analytics", icon: BarChart3, label: "Analytics" },
    { value: "api-health", icon: HeartPulse, label: "API Health" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            <h1 className="text-base sm:text-xl font-semibold">Owner Panel</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/inbox")} data-testid="button-back-inbox">
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Inbox</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-4 md:gap-6">
          <nav className="md:w-48 flex-shrink-0 md:sticky md:top-6 md:self-start -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0">
            <div className="flex md:flex-col gap-1 md:gap-0.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setActiveTab(item.value)}
                    data-testid={`tab-${item.value}`}
                    className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors text-left cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="flex-1 min-w-0">

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
                  <>
                    <div className="hidden md:block">
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
                                      onClick={() => {
                                        setCreditAmount("");
                                        setCreditUser(user);
                                      }}
                                      title="Manage credits"
                                      data-testid={`button-manage-credits-${user.id}`}
                                    >
                                      <Coins className="w-4 h-4" />
                                    </Button>
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
                    </div>

                    <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <div key={user.id} className="p-3 rounded-lg border bg-card space-y-2" data-testid={`row-user-${user.id}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{user.email}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <Badge variant={getPlanBadgeVariant(user.plan)} className="text-[10px]">
                                  {user.plan === "premium" ? "Business" : user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                                </Badge>
                                {user.onboardingCompleted ? (
                                  <Badge variant="secondary" className="text-[10px]">Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">Onboarding</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setCreditAmount("");
                                  setCreditUser(user);
                                }}
                                data-testid={`button-manage-credits-${user.id}`}
                              >
                                <Coins className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => resetUserLimitsMutation.mutate(user.id)}
                                disabled={resetUserLimitsMutation.isPending}
                                data-testid={`button-reset-limits-${user.id}`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              {user.connectedProvider ? `${user.connectedProvider}: ${user.connectedEmail}` : "Not connected"}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {format(new Date(user.createdAt), "MMM d")}
                            </span>
                          </div>
                          <Select
                            value={user.plan}
                            onValueChange={(value) =>
                              updateUserPlanMutation.mutate({ userId: user.id, plan: value })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs" data-testid={`select-plan-${user.id}`}>
                              <SelectValue placeholder="Change plan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="premium">Business</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </>
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
                    <div className="hidden md:block">
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
                    </div>
                    <div className="md:hidden space-y-3">
                      {feedback.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg border bg-card space-y-2" data-testid={`row-feedback-${item.id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{item.userEmail}</span>
                            {getFeedbackTypeBadge(item.feedbackType)}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3">{item.message}</p>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(item.status)}
                              <span className="text-[10px] text-muted-foreground">{format(new Date(item.createdAt), "MMM d")}</span>
                            </div>
                            <Select
                              value={item.status}
                              onValueChange={(value) =>
                                updateFeedbackMutation.mutate({ id: item.id, status: value })
                              }
                            >
                              <SelectTrigger className="w-[100px] h-8 text-xs" data-testid={`select-status-${item.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
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

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Email Broadcast</CardTitle>
                <CardDescription>Send emails to users via Resend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {emailStatsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : emailStats ? (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">Sent</p>
                      <p className="text-xl font-bold">{(emailStats as any)?.stats?.sent ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">Delivered</p>
                      <p className="text-xl font-bold">{(emailStats as any)?.stats?.delivered ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">Monthly limit</p>
                      <p className="text-xl font-bold">{(emailStats as any)?.monthlyLimit ?? 3000}</p>
                    </div>
                    <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">Opened</p>
                      <p className="text-xl font-bold">{(emailStats as any)?.stats?.opened ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">Clicked</p>
                      <p className="text-xl font-bold">{(emailStats as any)?.stats?.clicked ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-3">
                      <p className="text-xs text-muted-foreground">Bounced</p>
                      <p className="text-xl font-bold text-red-400">{(emailStats as any)?.stats?.bounced ?? 0}</p>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Audience</label>
                  <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                    <SelectTrigger data-testid="select-broadcast-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="paid">Paid Users Only</SelectItem>
                      <SelectItem value="plan">Specific Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {broadcastTarget === "plan" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan</label>
                    <Select value={broadcastPlan} onValueChange={setBroadcastPlan}>
                      <SelectTrigger data-testid="select-broadcast-plan">
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
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    placeholder="Email subject line"
                    data-testid="input-broadcast-subject"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Body</label>
                  <Textarea
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="Email body (HTML supported)"
                    rows={6}
                    data-testid="input-broadcast-body"
                  />
                </div>

                <Button
                  onClick={() => broadcastEmailMutation.mutate()}
                  disabled={!broadcastSubject || !broadcastBody || broadcastEmailMutation.isPending}
                  data-testid="button-send-broadcast"
                >
                  {broadcastEmailMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Broadcast Email
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
                          <span className="font-medium">Google (Gmail API)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(systemStatus?.google || "unknown")}
                          <span className="text-sm capitalize">{systemStatus?.google || "Unknown"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">Microsoft (Graph API)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(systemStatus?.microsoft || "unknown")}
                          <span className="text-sm capitalize">{systemStatus?.microsoft || "Unknown"}</span>
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
                    <div className="hidden md:block">
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
                    </div>
                    <div className="md:hidden space-y-2">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="p-3 rounded-lg border bg-card space-y-1" data-testid={`row-activity-${log.id}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{log.userEmail || "System"}</span>
                            {getActionTypeBadge(log.actionType)}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{log.details || "-"}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(log.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances">
            <div className="space-y-6">
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

              {summaryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">
                          {formatCurrency(financialSummary?.totalRevenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">From Stripe payments</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">Manual Expenses</CardTitle>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                          {formatCurrency(financialSummary?.totalExpenses || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Hosting, services, etc.</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">AI API Cost</CardTitle>
                        <Zap className="w-4 h-4 text-amber-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-600" data-testid="text-ai-cost">
                          ${((aiCosts?.totalCostCents || 0) / 100).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {aiCosts?.totalCalls || 0} API calls tracked
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const totalExpensesWithAi = (financialSummary?.totalExpenses || 0) + (aiCosts?.totalCostCents || 0);
                          const netWithAi = (financialSummary?.totalRevenue || 0) - totalExpensesWithAi;
                          return (
                            <>
                              <div className={`text-2xl font-bold ${netWithAi >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-net-profit">
                                {formatCurrency(netWithAi)}
                              </div>
                              <p className="text-xs text-muted-foreground">Revenue - All Costs</p>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue vs Expenses Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Revenue vs Expenses Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dailyFinancials.length === 0 && (!aiCosts?.dailyCosts || aiCosts.dailyCosts.length === 0) ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No financial data yet</p>
                          <p className="text-sm mt-1">Charts will populate as revenue and AI costs are tracked</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-green-500" /> Revenue</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-red-500" /> Expenses</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-amber-500" /> AI Cost</span>
                          </div>
                          <div className="flex items-end gap-1 h-[200px] overflow-x-auto" data-testid="chart-revenue-expenses">
                            {(() => {
                              const allDates = new Set<string>();
                              dailyFinancials.forEach(d => allDates.add(d.date));
                              aiCosts?.dailyCosts?.forEach(d => allDates.add(d.date));
                              const dates = Array.from(allDates).sort().slice(-30);
                              if (dates.length === 0) return null;

                              const dailyMap = new Map(dailyFinancials.map(d => [d.date, d]));
                              const aiDailyMap = new Map((aiCosts?.dailyCosts || []).map(d => [d.date, d]));

                              let maxVal = 1;
                              dates.forEach(date => {
                                const fin = dailyMap.get(date);
                                const ai = aiDailyMap.get(date);
                                const rev = Number(fin?.totalRevenue || 0);
                                const exp = Number(fin?.totalExpenses || 0) + (ai?.costCents || 0);
                                maxVal = Math.max(maxVal, rev, exp);
                              });

                              return dates.map(date => {
                                const fin = dailyMap.get(date);
                                const ai = aiDailyMap.get(date);
                                const rev = Number(fin?.totalRevenue || 0);
                                const manualExp = Number(fin?.totalExpenses || 0);
                                const aiExp = ai?.costCents || 0;
                                const revH = Math.max(2, (rev / maxVal) * 180);
                                const manualH = Math.max(0, (manualExp / maxVal) * 180);
                                const aiH = Math.max(0, (aiExp / maxVal) * 180);
                                const day = date.split("-")[2];
                                return (
                                  <div key={date} className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1" title={`${date}\nRevenue: $${(rev / 100).toFixed(2)}\nExpenses: $${(manualExp / 100).toFixed(2)}\nAI: $${(aiExp / 100).toFixed(2)}`}>
                                    <div className="flex items-end gap-px h-[180px]">
                                      <div className="w-2 bg-green-500 rounded-t-sm transition-all" style={{ height: `${revH}px` }} />
                                      <div className="flex flex-col justify-end">
                                        {manualH > 0 && <div className="w-2 bg-red-500 rounded-t-sm transition-all" style={{ height: `${manualH}px` }} />}
                                        {aiH > 0 && <div className="w-2 bg-amber-500 rounded-t-sm transition-all" style={{ height: `${aiH}px` }} />}
                                      </div>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground/60">{day}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* AI Cost Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          AI Cost by Model
                        </CardTitle>
                        <CardDescription>Token usage and cost per model</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {aiCostsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : !aiCosts || aiCosts.totalCalls === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No AI calls tracked yet</p>
                            <p className="text-sm mt-1">Costs will appear automatically as users make AI requests</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(aiCosts.byModel).map(([model, data]) => {
                              const percentage = aiCosts.totalCostCents > 0 ? (data.costCents / aiCosts.totalCostCents) * 100 : 0;
                              const color = model === "gpt-4o" ? "#F59E0B" : "#10B981";
                              return (
                                <div key={model} className="space-y-2" data-testid={`ai-model-${model}`}>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                      <span className="font-medium">{model}</span>
                                    </span>
                                    <span className="font-medium">${(data.costCents / 100).toFixed(4)}</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div className="h-2 rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{data.calls.toLocaleString()} calls</span>
                                    <span>{data.tokens.toLocaleString()} tokens</span>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-lg font-bold">{aiCosts.totalCalls.toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground">Total Calls</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold">{(aiCosts.totalPromptTokens + aiCosts.totalCompletionTokens).toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground">Total Tokens</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold">${(aiCosts.totalCostCents / 100).toFixed(4)}</div>
                                  <div className="text-xs text-muted-foreground">Total Cost</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="w-5 h-5" />
                          AI Cost by Feature
                        </CardTitle>
                        <CardDescription>Which features cost the most</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {aiCostsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : !aiCosts || aiCosts.totalCalls === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No AI endpoint data yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(aiCosts.byEndpoint)
                              .sort(([, a], [, b]) => b.costCents - a.costCents)
                              .slice(0, 8)
                              .map(([endpoint, data], i) => {
                                const percentage = aiCosts.totalCostCents > 0 ? (data.costCents / aiCosts.totalCostCents) * 100 : 0;
                                const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];
                                return (
                                  <div key={endpoint} className="space-y-1" data-testid={`ai-endpoint-${i}`}>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="flex items-center gap-2 truncate max-w-[200px]">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                                        <span className="truncate">{endpoint}</span>
                                      </span>
                                      <span className="font-medium text-nowrap ml-2">${(data.costCents / 100).toFixed(4)} ({data.calls})</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5">
                                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: colors[i % colors.length] }} />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Expense & Revenue Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wallet className="w-5 h-5" />
                          Expenses by Service
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!financialSummary?.expensesByCategory || Object.keys(financialSummary.expensesByCategory).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No manual expenses recorded</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {EXPENSE_CATEGORIES.filter(cat => (financialSummary?.expensesByCategory[cat.value] || 0) > 0).map((cat) => {
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
                                    <div className="h-2 rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
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
                          <TrendingUp className="w-5 h-5" />
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
                              { value: "pro", label: "Pro ($4.99/mo)", color: "#8B5CF6" },
                              { value: "premium", label: "Business ($14.99/mo)", color: "#F59E0B" },
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
                                    <div className="h-2 rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: plan.color }} />
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg">Manual Expenses</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">Track recurring costs like hosting, domains, and services</CardDescription>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setShowAddExpenseForm(!showAddExpenseForm)}
                          data-testid="button-add-expense"
                          className="flex-shrink-0"
                        >
                          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Add Expense</span>
                          <span className="sm:hidden">Add</span>
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
                                placeholder="e.g., Replit Core, Domain"
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
                              placeholder="Additional details..."
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
                            <Button variant="outline" onClick={() => setShowAddExpenseForm(false)} data-testid="button-cancel-expense">
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
                        <div className="text-center py-8 text-muted-foreground">
                          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No manual expenses recorded</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="hidden md:block">
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
                                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryInfo?.color }} />
                                          {categoryInfo?.label || expense.category}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-medium text-red-600">
                                        {formatCurrency(expense.amount)}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {expense.billingPeriod || "-"}
                                        {expense.isRecurring && <Badge variant="secondary" className="ml-2 text-xs">Recurring</Badge>}
                                      </TableCell>
                                      <TableCell>{format(new Date(expense.expenseDate), "MMM d, yyyy")}</TableCell>
                                      <TableCell>
                                        <Button size="icon" variant="ghost" onClick={() => deleteExpenseMutation.mutate(expense.id)} disabled={deleteExpenseMutation.isPending} data-testid={`button-delete-expense-${expense.id}`}>
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="md:hidden space-y-2">
                            {expensesList.map((expense) => {
                              const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                              return (
                                <div key={expense.id} className="p-3 rounded-lg border bg-card flex items-center justify-between gap-2" data-testid={`row-expense-${expense.id}`}>
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{expense.serviceName}</span>
                                      <span className="text-sm font-medium text-red-600">{formatCurrency(expense.amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryInfo?.color }} />
                                        {categoryInfo?.label || expense.category}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground">{expense.billingPeriod || "-"}</span>
                                      {expense.isRecurring && <Badge variant="secondary" className="text-[10px]">Recurring</Badge>}
                                    </div>
                                  </div>
                                  <Button size="icon" variant="ghost" className="flex-shrink-0 h-8 w-8" onClick={() => deleteExpenseMutation.mutate(expense.id)} disabled={deleteExpenseMutation.isPending} data-testid={`button-delete-expense-${expense.id}`}>
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Revenue List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue History</CardTitle>
                      <CardDescription>Payments from Stripe subscriptions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {revenueLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : revenueList.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No revenue yet. Revenue auto-tracks from Stripe payments.</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="hidden md:block">
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
                                    <TableCell className="font-medium">{rev.userEmail || "Unknown"}</TableCell>
                                    <TableCell>
                                      <Badge variant={rev.plan === "premium" ? "default" : "secondary"}>
                                        {rev.plan === "premium" ? "Business" : rev.plan === "pro" ? "Pro" : "Free"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className={`font-medium ${Number(rev.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                      {formatCurrency(rev.amount)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground capitalize">{rev.type}</TableCell>
                                    <TableCell>{format(new Date(rev.revenueDate), "MMM d, yyyy")}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="md:hidden space-y-2">
                            {revenueList.map((rev) => (
                              <div key={rev.id} className="p-3 rounded-lg border bg-card" data-testid={`row-revenue-${rev.id}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium truncate">{rev.userEmail || "Unknown"}</span>
                                  <span className={`text-sm font-medium flex-shrink-0 ${Number(rev.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatCurrency(rev.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={rev.plan === "premium" ? "default" : "secondary"} className="text-[10px]">
                                    {rev.plan === "premium" ? "Business" : rev.plan === "pro" ? "Pro" : "Free"}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground capitalize">{rev.type}</span>
                                  <span className="text-[10px] text-muted-foreground">{format(new Date(rev.revenueDate), "MMM d")}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
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
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium text-sm truncate" data-testid={`text-email-${testimonial.id}`}>{testimonial.userEmail}</span>
                                  {testimonial.isFounder && (
                                    <Badge variant="secondary" className="text-[10px]">Founder</Badge>
                                  )}
                                  <Badge 
                                    variant={
                                      testimonial.status === "approved" ? "default" :
                                      testimonial.status === "denied" ? "destructive" : "outline"
                                    }
                                    className="text-[10px]"
                                    data-testid={`status-${testimonial.id}`}
                                  >
                                    {testimonial.status}
                                  </Badge>
                                </div>
                                <div className="flex gap-0.5 mb-2" data-testid={`rating-stars-${testimonial.id}`}>
                                  {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-500 text-yellow-500" />
                                  ))}
                                  {[...Array(5 - testimonial.rating)].map((_, i) => (
                                    <Star key={`empty-${i}`} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                                  ))}
                                </div>
                                <p className="text-sm text-muted-foreground">"{testimonial.content}"</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Submitted {format(new Date(testimonial.createdAt), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
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
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Owner Notes</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Personal notes and reminders</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                    data-testid="button-add-note"
                    className="flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Add Note</span>
                    <span className="sm:hidden">Add</span>
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

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="api-health">
            <div className="space-y-6">
              {healthSummaryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Card data-testid="card-health-summary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Health Summary
                      <Badge
                        data-testid="badge-health-status"
                        variant={
                          apiHealthSummary?.status === "healthy"
                            ? "secondary"
                            : apiHealthSummary?.status === "warning"
                              ? "outline"
                              : "destructive"
                        }
                        className={
                          apiHealthSummary?.status === "healthy"
                            ? "bg-green-500 text-white"
                            : apiHealthSummary?.status === "warning"
                              ? "bg-yellow-500 text-white"
                              : ""
                        }
                      >
                        {apiHealthSummary?.status || "unknown"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Errors (24h)</p>
                        <p className="text-2xl font-bold" data-testid="text-errors-24h">
                          {apiHealthSummary?.errorsLast24h ?? 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Unresolved Critical</p>
                        <p className="text-2xl font-bold" data-testid="text-unresolved-critical">
                          {apiHealthSummary?.unresolvedCritical ?? 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Google Errors (24h)</p>
                        <p className="text-2xl font-bold" data-testid="text-google-errors">
                          {apiHealthSummary?.googleErrorsLast24h ?? 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Microsoft Errors (24h)</p>
                        <p className="text-2xl font-bold" data-testid="text-microsoft-errors">
                          {apiHealthSummary?.microsoftErrorsLast24h ?? 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-unresolved-issues">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle>Unresolved Issues</CardTitle>
                    {apiHealthUnresolved.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => resolveAllHealthIssuesMutation.mutate()}
                        disabled={resolveAllHealthIssuesMutation.isPending}
                        data-testid="button-resolve-all"
                      >
                        {resolveAllHealthIssuesMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Resolve All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {healthUnresolvedLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : apiHealthUnresolved.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No unresolved issues</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apiHealthUnresolved.map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 flex-wrap"
                          data-testid={`row-issue-${issue.id}`}
                        >
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" data-testid={`badge-provider-${issue.id}`}>
                                {issue.provider}
                              </Badge>
                              <span className="font-medium text-sm">{issue.endpoint}</span>
                              <Badge
                                data-testid={`badge-severity-${issue.id}`}
                                className={
                                  issue.severity === "critical"
                                    ? "bg-purple-500 text-white"
                                    : issue.severity === "error"
                                      ? "bg-red-500 text-white"
                                      : issue.severity === "warning"
                                        ? "bg-yellow-500 text-white"
                                        : "bg-blue-500 text-white"
                                }
                              >
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate" data-testid={`text-error-${issue.id}`}>
                              {issue.errorMessage}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveHealthIssueMutation.mutate(issue.id)}
                            disabled={resolveHealthIssueMutation.isPending}
                            data-testid={`button-resolve-${issue.id}`}
                          >
                            Resolve
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-recent-logs">
                <CardHeader>
                  <CardTitle>Recent Logs</CardTitle>
                  <CardDescription>Last 50 health log entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {healthLogsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : apiHealthLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No health logs yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Timestamp</TableHead>
                              <TableHead>Provider</TableHead>
                              <TableHead>Endpoint</TableHead>
                              <TableHead>Status Code</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Error Message</TableHead>
                              <TableHead>Resolved</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {apiHealthLogs.map((log) => (
                              <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                                <TableCell className="text-xs whitespace-nowrap">
                                  {format(new Date(log.createdAt), "MMM d, h:mm a")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{log.provider}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{log.endpoint}</TableCell>
                                <TableCell>
                                  <span className="font-mono text-sm">{log.statusCode}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      log.severity === "critical"
                                        ? "bg-purple-500 text-white"
                                        : log.severity === "error"
                                          ? "bg-red-500 text-white"
                                          : log.severity === "warning"
                                            ? "bg-yellow-500 text-white"
                                            : "bg-blue-500 text-white"
                                    }
                                  >
                                    {log.severity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-sm">
                                  {log.errorMessage}
                                </TableCell>
                                <TableCell>
                                  {log.resolved ? (
                                    <Badge variant="secondary" className="bg-green-500 text-white">
                                      Resolved
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Open</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-2">
                        {apiHealthLogs.map((log) => (
                          <div key={log.id} className="p-3 rounded-lg border bg-card space-y-1.5" data-testid={`row-log-${log.id}`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px]">{log.provider}</Badge>
                                <Badge
                                  className={`text-[10px] ${
                                    log.severity === "critical"
                                      ? "bg-purple-500 text-white"
                                      : log.severity === "error"
                                        ? "bg-red-500 text-white"
                                        : log.severity === "warning"
                                          ? "bg-yellow-500 text-white"
                                          : "bg-blue-500 text-white"
                                  }`}
                                >
                                  {log.severity}
                                </Badge>
                                <span className="font-mono text-xs">{log.statusCode}</span>
                              </div>
                              {log.resolved ? (
                                <Badge variant="secondary" className="bg-green-500 text-white text-[10px]">Resolved</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Open</Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium">{log.endpoint}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{log.errorMessage}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(log.createdAt), "MMM d, h:mm a")}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog
        open={!!creditUser}
        onOpenChange={(open) => {
          if (!open) {
            setCreditUser(null);
            setCreditAmount("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]" data-testid="dialog-manage-credits">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Manage Credits
            </DialogTitle>
            <DialogDescription className="truncate">
              {creditUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Current balance</p>
              {creditLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto mt-1 text-muted-foreground" />
              ) : (
                <p
                  className="text-3xl font-bold mt-1"
                  data-testid="text-credit-balance"
                >
                  {creditData?.balance ?? 0}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 100"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                data-testid="input-credit-amount"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleAdjustCredits("take")}
                disabled={adjustCreditsMutation.isPending}
                data-testid="button-take-credits"
              >
                <Minus className="w-4 h-4 mr-1" />
                Take
              </Button>
              <Button
                onClick={() => handleAdjustCredits("give")}
                disabled={adjustCreditsMutation.isPending}
                data-testid="button-give-credits"
              >
                <Plus className="w-4 h-4 mr-1" />
                Give
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
