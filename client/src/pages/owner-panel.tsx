import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

interface OwnerStats {
  totalUsers: number;
  activeUsers: number;
  freeUsers: number;
  proUsers: number;
  premiumUsers: number;
  connectedAccounts: number;
  estimatedMRR: number;
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

export default function OwnerPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");

  const [notificationTarget, setNotificationTarget] = useState("all");
  const [notificationPlan, setNotificationPlan] = useState("free");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

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
          <TabsList className="mb-6">
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
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
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
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">Currently registered</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage all registered users</CardDescription>
              </CardHeader>
              <CardContent>
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
                          <TableHead>Status</TableHead>
                          <TableHead>Connected Email</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
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
        </Tabs>
      </div>
    </div>
  );
}
