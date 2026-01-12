import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Settings, 
  CreditCard, 
  LogOut, 
  Trash2,
  Crown,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Bot,
  Shield,
  Send,
  Archive,
  Search,
  Eye
} from "lucide-react";
import { SiGmail } from "react-icons/si";
import { FeedbackModal } from "@/components/feedback-modal";

interface AssistantPermissions {
  canReadEmails: boolean;
  canSendEmails: boolean;
  canArchive: boolean;
  canTrash: boolean;
  canSearch: boolean;
  requireConfirmation: boolean;
  maxEmailsPerDay: number;
}

interface UserData {
  id: string;
  email: string;
  plan: string | null;
  connectedEmail: string | null;
  connectedProvider: string | null;
  createdAt: string;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const { data: userData, isLoading } = useQuery<{ user: UserData | null }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: permissions } = useQuery<AssistantPermissions>({
    queryKey: ["/api/ai/permissions"],
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async (updates: Partial<AssistantPermissions>) => {
      const current = permissions || {
        canReadEmails: true,
        canSendEmails: false,
        canArchive: false,
        canTrash: false,
        canSearch: true,
        requireConfirmation: true,
        maxEmailsPerDay: 10
      };
      const response = await apiRequest("POST", "/api/ai/permissions", { ...current, ...updates });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/permissions"] });
      toast({
        title: "Permissions updated",
        description: "Your AI assistant permissions have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update permissions.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user", {});
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = userData?.user;
  if (!user) {
    setLocation("/login");
    return null;
  }

  const userInitials = user.email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  const userName = user.email.split("@")[0];

  const getPlanBadge = () => {
    switch (user.plan) {
      case "business":
        return <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">Business</Badge>;
      case "pro":
        return <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">Pro</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getProviderIcon = () => {
    if (!user.connectedProvider) return null;
    const provider = user.connectedProvider.toLowerCase();
    if (provider === "google" || provider === "gmail") {
      return <SiGmail className="w-5 h-5 text-red-500" />;
    }
    if (provider === "microsoft" || provider === "outlook") {
      return <Mail className="w-5 h-5 text-blue-500" />;
    }
    return <Mail className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => setLocation("/inbox")}
          data-testid="button-back-inbox"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Button>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 ring-4 ring-border/30">
                  <AvatarImage 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}&backgroundColor=3b82f6,8b5cf6,ec4899`}
                    alt={userName}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xl font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{userName}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-2">{getPlanBadge()}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    value={userName} 
                    disabled
                    className="bg-muted/50"
                    data-testid="input-name"
                  />
                  <p className="text-xs text-muted-foreground">Display name is derived from your email</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    value={user.email} 
                    disabled 
                    className="bg-muted/50"
                    data-testid="input-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                Connected Accounts
              </CardTitle>
              <CardDescription>Email accounts linked to MailFlow</CardDescription>
            </CardHeader>
            <CardContent>
              {user.connectedEmail ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                  {getProviderIcon()}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.connectedEmail}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.connectedProvider || "Email"} Account
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              ) : (
                <div className="text-center py-6">
                  <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No email account connected</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/connect-email")}
                    data-testid="button-connect-email"
                  >
                    Connect Email
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Bot className="w-5 h-5" />
                AI Assistant Permissions
              </CardTitle>
              <CardDescription>Control what your AI assistant can do with your emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">All actions are encrypted and logged for security</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Read Emails</p>
                      <p className="text-xs text-muted-foreground">Allow assistant to read email content</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions?.canReadEmails ?? true}
                    onCheckedChange={(checked) => updatePermissionsMutation.mutate({ canReadEmails: checked })}
                    disabled={updatePermissionsMutation.isPending}
                    data-testid="switch-can-read"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Send className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Send Emails</p>
                      <p className="text-xs text-muted-foreground">Allow assistant to send emails on your behalf</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions?.canSendEmails ?? false}
                    onCheckedChange={(checked) => updatePermissionsMutation.mutate({ canSendEmails: checked })}
                    disabled={updatePermissionsMutation.isPending}
                    data-testid="switch-can-send"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Archive Emails</p>
                      <p className="text-xs text-muted-foreground">Allow assistant to archive emails</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions?.canArchive ?? false}
                    onCheckedChange={(checked) => updatePermissionsMutation.mutate({ canArchive: checked })}
                    disabled={updatePermissionsMutation.isPending}
                    data-testid="switch-can-archive"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Delete Emails</p>
                      <p className="text-xs text-muted-foreground">Allow assistant to move emails to trash</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions?.canTrash ?? false}
                    onCheckedChange={(checked) => updatePermissionsMutation.mutate({ canTrash: checked })}
                    disabled={updatePermissionsMutation.isPending}
                    data-testid="switch-can-trash"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Search Emails</p>
                      <p className="text-xs text-muted-foreground">Allow assistant to search through emails</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions?.canSearch ?? true}
                    onCheckedChange={(checked) => updatePermissionsMutation.mutate({ canSearch: checked })}
                    disabled={updatePermissionsMutation.isPending}
                    data-testid="switch-can-search"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Require Confirmation</p>
                      <p className="text-xs text-muted-foreground">All actions require your approval before executing</p>
                    </div>
                  </div>
                  <Switch
                    checked={permissions?.requireConfirmation ?? true}
                    onCheckedChange={(checked) => updatePermissionsMutation.mutate({ requireConfirmation: checked })}
                    disabled={updatePermissionsMutation.isPending}
                    data-testid="switch-require-confirmation"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Crown className="w-5 h-5" />
                Subscription
              </CardTitle>
              <CardDescription>Your current plan and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  {getPlanBadge()}
                  <span className="text-sm">
                    {user.plan === "business" ? "Business Plan" : 
                     user.plan === "pro" ? "Pro Plan" : "Free Plan"}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation("/pricing")}
                  data-testid="button-manage-subscription"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3"
                onClick={() => setLocation("/settings")}
                data-testid="button-settings"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3"
                onClick={() => setLocation("/pricing")}
                data-testid="button-pricing"
              >
                <CreditCard className="w-4 h-4" />
                Manage Subscription
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3"
                onClick={() => setShowFeedbackModal(true)}
                data-testid="button-feedback"
              >
                <MessageSquare className="w-4 h-4" />
                Feedback
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                onClick={() => logoutMutation.mutate()}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-3">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      data-testid="button-delete-account"
                    >
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAccountMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <FeedbackModal 
        open={showFeedbackModal} 
        onOpenChange={setShowFeedbackModal}
        userEmail={user.email}
      />
    </div>
  );
}
