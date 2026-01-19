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
  Eye,
  Clock,
  DollarSign,
  Sparkles,
  TrendingUp,
  FileText,
  Zap,
  Camera,
  Pencil,
  Check,
  X
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

interface AiSavingsStats {
  minutesSaved: number;
  hoursSaved: number;
  moneySaved: number;
  draftCount: number;
  summaryCount: number;
  actionCount: number;
  totalActions: number;
}

interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  plan: string | null;
  connectedEmail: string | null;
  connectedProvider: string | null;
  createdAt: string;
}

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=happy&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=confident&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=creative&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=friendly&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=professional&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=serene&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=calm&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=warm&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/bottts/svg?seed=tech&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/bottts/svg?seed=modern&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=smile",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=wink",
];

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const { data: userData, isLoading } = useQuery<{ user: UserData | null }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: permissions } = useQuery<AssistantPermissions>({
    queryKey: ["/api/ai/permissions"],
  });

  const { data: savingsStats } = useQuery<AiSavingsStats>({
    queryKey: ["/api/ai/savings"],
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; avatarUrl?: string }) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditingProfile(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile.",
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

  const userName = user.displayName || user.email.split("@")[0];

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
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <Button
          variant="ghost"
          className="mb-4 sm:mb-6 gap-2 touch-target"
          onClick={() => setLocation("/inbox")}
          data-testid="button-back-inbox"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to </span>Inbox
        </Button>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                Profile
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="relative group">
                  <Avatar className="w-16 h-16 sm:w-20 sm:h-20 ring-4 ring-border/30">
                    <AvatarImage 
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}&backgroundColor=3b82f6,8b5cf6,ec4899`}
                      alt={userName}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-lg sm:text-xl font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setShowAvatarPicker(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    data-testid="button-change-avatar"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingProfile ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="h-9"
                        autoFocus
                        data-testid="input-edit-display-name"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          updateProfileMutation.mutate({ displayName: editDisplayName });
                        }}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-name"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsEditingProfile(false)}
                        data-testid="button-cancel-edit"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-semibold truncate">{userName}</h2>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditDisplayName(user.displayName || userName);
                          setIsEditingProfile(true);
                        }}
                        data-testid="button-edit-name"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                  <div className="mt-2">{getPlanBadge()}</div>
                </div>
              </div>

              {/* Avatar Picker Modal */}
              {showAvatarPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Choose Your Avatar</CardTitle>
                      <CardDescription>Select a profile picture</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-3">
                        {AVATAR_OPTIONS.map((avatarUrl, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              updateProfileMutation.mutate({ avatarUrl });
                              setShowAvatarPicker(false);
                            }}
                            className={`relative rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary transition-all ${
                              user.avatarUrl === avatarUrl ? "ring-primary ring-offset-2" : ""
                            }`}
                            data-testid={`button-avatar-option-${index}`}
                          >
                            <Avatar className="w-14 h-14">
                              <AvatarImage src={avatarUrl} alt={`Avatar option ${index + 1}`} />
                            </Avatar>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            updateProfileMutation.mutate({ avatarUrl: null });
                            setShowAvatarPicker(false);
                          }}
                          data-testid="button-reset-avatar"
                        >
                          Use Default
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowAvatarPicker(false)}
                          data-testid="button-close-avatar-picker"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
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

          {/* AI Savings Stats Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  Your AI Savings
                </CardTitle>
                <CardDescription>See how much time and money you've saved with MyDraft AI</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-muted-foreground font-medium">Time Saved</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {savingsStats?.hoursSaved || 0}
                      </span>
                      <span className="text-sm text-muted-foreground">hours</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {savingsStats?.minutesSaved || 0} minutes total
                    </p>
                  </div>

                  <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground font-medium">Money Saved</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${savingsStats?.moneySaved?.toFixed(0) || 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      vs hiring an email assistant
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-background/60 rounded-lg p-3 text-center border border-border/30">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <FileText className="w-3 h-3 text-purple-500" />
                    </div>
                    <span className="text-lg font-semibold">{savingsStats?.draftCount || 0}</span>
                    <p className="text-[10px] text-muted-foreground">AI Drafts</p>
                  </div>
                  <div className="bg-background/60 rounded-lg p-3 text-center border border-border/30">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                    </div>
                    <span className="text-lg font-semibold">{savingsStats?.summaryCount || 0}</span>
                    <p className="text-[10px] text-muted-foreground">Summaries</p>
                  </div>
                  <div className="bg-background/60 rounded-lg p-3 text-center border border-border/30">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-cyan-500" />
                    </div>
                    <span className="text-lg font-semibold">{savingsStats?.totalActions || 0}</span>
                    <p className="text-[10px] text-muted-foreground">AI Actions</p>
                  </div>
                </div>

                {(savingsStats?.totalActions || 0) === 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      Start using AI features to see your savings grow!
                    </p>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                Connected Accounts
              </CardTitle>
              <CardDescription>Email accounts linked to MyDraft</CardDescription>
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
                  onClick={() => setLocation("/select-plan")}
                  data-testid="button-manage-subscription"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Change Plan
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
                onClick={() => setLocation("/select-plan")}
                data-testid="button-pricing"
              >
                <CreditCard className="w-4 h-4" />
                Change Plan
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
