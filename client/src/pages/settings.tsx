import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  CreditCard, 
  Sparkles, 
  Mail, 
  Link2,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  Check,
  Users,
  UserPlus,
  X,
  Shield,
  Smartphone,
  MapPin,
  Globe,
  Palette,
  Sun,
  Moon,
  Monitor,
  Star
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Settings {
  email: string;
  plan: string | null;
  aiPreferences: {
    primaryUse?: string;
    aiFeatures?: string[];
    automationLevel?: string;
    replyTone?: string;
    customTone?: string;
  } | null;
  emailSignature: string | null;
  signatureEnabled: boolean;
  connectedEmail: { email: string; provider: string } | null;
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/inbox")}
            data-testid="button-back"
            className="touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className={`inline-flex sm:grid w-auto sm:w-full h-auto p-1 gap-1 ${settings.plan === "premium" ? "sm:grid-cols-8" : "sm:grid-cols-7"}`}>
              <TabsTrigger value="account" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-account">
                <User className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Account</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-appearance">
                <Palette className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Theme</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-security">
                <Shield className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Security</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-billing">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-ai">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs sm:text-sm">AI</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-email">
                <Mail className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Email</span>
              </TabsTrigger>
              <TabsTrigger value="connections" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-connections">
                <Link2 className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Connect</span>
              </TabsTrigger>
              {settings.plan === "premium" && (
                <TabsTrigger value="team" className="flex items-center gap-2 py-2 px-3 touch-target whitespace-nowrap" data-testid="tab-team">
                  <Users className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Team</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="account">
            <AccountTab settings={settings!} />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearanceTab />
          </TabsContent>
          <TabsContent value="security">
            <SecurityTab settings={settings!} />
          </TabsContent>
          <TabsContent value="billing">
            <BillingTab settings={settings!} />
          </TabsContent>
          <TabsContent value="ai">
            <AIPreferencesTab settings={settings!} />
          </TabsContent>
          <TabsContent value="email">
            <EmailSettingsTab settings={settings!} />
          </TabsContent>
          <TabsContent value="connections">
            <ConnectionsTab settings={settings!} />
          </TabsContent>
          {settings.plan === "premium" && (
            <TabsContent value="team">
              <TeamTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function AccountTab({ settings }: { settings: Settings }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/settings/password", { 
        currentPassword, 
        newPassword 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete account", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={settings.email} disabled className="bg-muted" data-testid="input-email" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
          <Button 
            onClick={handleChangePassword} 
            disabled={changePasswordMutation.isPending}
            data-testid="button-change-password"
          >
            {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Manage your session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </CardContent>
      </Card>

      <TestimonialCard />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-account">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account, 
                  disconnect your email, and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAccountMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

interface UserTestimonial {
  id: number;
  content: string;
  rating: number;
  status: string;
  createdAt: string;
}

function TestimonialCard() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [isEditing, setIsEditing] = useState(false);

  const { data: existingTestimonial, isLoading } = useQuery<UserTestimonial | null>({
    queryKey: ["/api/testimonials/mine"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/testimonials", { content, rating });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Thank you for your testimonial!", description: "It will be reviewed before appearing on our site." });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials/mine"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit testimonial", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            Leave a Testimonial
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (existingTestimonial && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
            Your Testimonial
          </CardTitle>
          <CardDescription>
            Status: {existingTestimonial.status === "approved" ? (
              <span className="text-green-500">Approved</span>
            ) : existingTestimonial.status === "denied" ? (
              <span className="text-red-500">Not Approved</span>
            ) : (
              <span className="text-yellow-500">Pending Review</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1">
            {[...Array(existingTestimonial.rating)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            ))}
          </div>
          <p className="text-muted-foreground">"{existingTestimonial.content}"</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
          Leave a Testimonial
        </CardTitle>
        <CardDescription>Share your experience with MyDraft</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Rating</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform"
                data-testid={`star-rating-${star}`}
              >
                <Star 
                  className={`w-6 h-6 ${star <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} 
                />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="testimonial-content">Your Experience</Label>
          <Textarea
            id="testimonial-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell us what you love about MyDraft..."
            className="min-h-[100px]"
            data-testid="textarea-testimonial"
          />
          <p className="text-xs text-muted-foreground">
            Minimum 10 characters. Your testimonial will be reviewed before appearing on our site.
          </p>
        </div>
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || content.trim().length < 10}
          data-testid="button-submit-testimonial"
        >
          {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Testimonial
        </Button>
      </CardContent>
    </Card>
  );
}

interface UserSession {
  id: number;
  ipAddress: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessions: UserSession[];
}

function SecurityTab({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationAction, setVerificationAction] = useState<"disable2fa" | "logoutAll" | null>(null);

  const { data: securitySettings, isLoading: isLoadingSecurity, error: securityError } = useQuery<SecuritySettings>({
    queryKey: ["/api/settings/security"],
  });

  const twoFactorEnabled = securitySettings?.twoFactorEnabled ?? false;

  const toggle2FAMutation = useMutation({
    mutationFn: async ({ enable, code }: { enable: boolean; code?: string }) => {
      const response = await apiRequest("POST", "/api/settings/2fa/toggle", { enable, code });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.requiresVerification) {
        setVerificationAction("disable2fa");
        setShowVerificationDialog(true);
        toast({ title: "Verification required", description: "A code has been sent to your email" });
        return;
      }
      toast({ 
        title: variables.enable ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
        description: variables.enable 
          ? "You'll now receive a verification code when signing in" 
          : "You can enable 2FA again anytime"
      });
      setShowVerificationDialog(false);
      setVerificationCode("");
      setVerificationAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/security"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update 2FA", description: error.message, variant: "destructive" });
    },
  });

  const logoutAllDevicesMutation = useMutation({
    mutationFn: async (code?: string) => {
      const response = await apiRequest("POST", "/api/settings/sessions/logout-all", code ? { code } : {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        setVerificationAction("logoutAll");
        setShowVerificationDialog(true);
        setShowLogoutAllDialog(false);
        toast({ title: "Verification required", description: "A code has been sent to your email" });
        return;
      }
      toast({ title: "All other devices logged out" });
      setShowLogoutAllDialog(false);
      setShowVerificationDialog(false);
      setVerificationCode("");
      setVerificationAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/security"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log out devices", description: error.message, variant: "destructive" });
    },
  });

  const handleVerificationSubmit = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({ title: "Please enter a 6-digit code", variant: "destructive" });
      return;
    }
    if (verificationAction === "disable2fa") {
      toggle2FAMutation.mutate({ enable: false, code: verificationCode });
    } else if (verificationAction === "logoutAll") {
      logoutAllDevicesMutation.mutate(verificationCode);
    }
  };

  const handleToggle2FA = (checked: boolean) => {
    if (!checked && twoFactorEnabled) {
      toggle2FAMutation.mutate({ enable: false });
    } else if (checked) {
      toggle2FAMutation.mutate({ enable: true });
    }
  };

  const formatDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return "Unknown device";
    if (userAgent.includes("Chrome")) return "Chrome Browser";
    if (userAgent.includes("Firefox")) return "Firefox Browser";
    if (userAgent.includes("Safari")) return "Safari Browser";
    if (userAgent.includes("Edge")) return "Microsoft Edge";
    return "Web Browser";
  };

  const formatLocation = (session: UserSession) => {
    const parts = [];
    if (session.city) parts.push(session.city);
    if (session.region) parts.push(session.region);
    if (session.country) parts.push(session.country);
    return parts.length > 0 ? parts.join(", ") : "Unknown location";
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoadingSecurity) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (securityError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Failed to load security settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by requiring a verification code when signing in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Email verification codes</p>
              <p className="text-sm text-muted-foreground">
                {twoFactorEnabled 
                  ? "You'll receive a 6-digit code via email when signing in" 
                  : "Enable to receive verification codes when signing in"}
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
              disabled={toggle2FAMutation.isPending}
              data-testid="switch-2fa-toggle"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Devices where your account is currently logged in
              </CardDescription>
            </div>
            {securitySettings && securitySettings.sessions.length > 1 && (
              <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-logout-all-devices">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out all devices
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Log out all other devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out from all other devices except this one. 
                      You'll stay signed in on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-logout-all">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => logoutAllDevicesMutation.mutate(undefined)}
                      data-testid="button-confirm-logout-all"
                    >
                      {logoutAllDevicesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Log out all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securitySettings?.sessions && securitySettings.sessions.length > 0 ? (
              securitySettings.sessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    session.isCurrent ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid={`session-item-${session.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{formatDeviceInfo(session.userAgent)}</p>
                        {session.isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {formatLocation(session)}
                        </span>
                        {session.ipAddress && (
                          <span className="text-xs">IP: {session.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Active {formatTime(session.lastActiveAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active sessions found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showVerificationDialog} onOpenChange={(open) => {
        setShowVerificationDialog(open);
        if (!open) {
          setVerificationCode("");
          setVerificationAction(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter verification code</AlertDialogTitle>
            <AlertDialogDescription>
              We've sent a 6-digit verification code to your email. Enter it below to confirm this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              data-testid="input-verification-code"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setVerificationCode("");
                setVerificationAction(null);
              }}
              data-testid="button-cancel-verification"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerificationSubmit}
              disabled={verificationCode.length !== 6 || toggle2FAMutation.isPending || logoutAllDevicesMutation.isPending}
              data-testid="button-confirm-verification"
            >
              {(toggle2FAMutation.isPending || logoutAllDevicesMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Verify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BillingTab({ settings }: { settings: Settings }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const planDetails = {
    free: { name: "Free", price: "$0/month", features: ["Basic inbox management", "Standard support"] },
    pro: { name: "Pro", price: "$10/month or $99/year", features: ["Unlimited AI replies", "Advanced tone customization", "Email scheduling", "Priority support"] },
    business: { name: "Business", price: "$29/month or $299/year", features: ["Everything in Pro", "Voice assistant", "Custom AI training", "Team collaboration", "Dedicated support"] },
  };

  const currentPlan = settings.plan ? planDetails[settings.plan as keyof typeof planDetails] : planDetails.free;

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/portal", {});
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to open billing portal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your subscription details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{currentPlan.name}</h3>
              <p className="text-sm text-muted-foreground">{currentPlan.price}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
              <Check className="w-4 h-4" />
              Active
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Plan features:</p>
            <ul className="space-y-1">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Subscription</CardTitle>
          <CardDescription>Change or cancel your plan</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setLocation("/select-plan")} data-testid="button-change-plan">
            Change Plan
          </Button>
          {settings.plan && settings.plan !== "free" && (
            <Button 
              variant="outline" 
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-cancel-subscription"
            >
              {portalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancel Subscription
            </Button>
          )}
        </CardContent>
      </Card>

      {settings.plan && settings.plan !== "free" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment details and billing history</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View invoices, update payment method, or download receipts through the billing portal.
            </p>
            <Button 
              variant="outline" 
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-payment"
            >
              {portalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AIPreferencesTab({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    primaryUse: settings.aiPreferences?.primaryUse || "both",
    aiFeatures: settings.aiPreferences?.aiFeatures || [],
    automationLevel: settings.aiPreferences?.automationLevel || "medium",
    replyTone: settings.aiPreferences?.replyTone || "professional",
    customTone: settings.aiPreferences?.customTone || "",
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/settings/ai-preferences", { aiPreferences: preferences });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "AI preferences updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update preferences", description: error.message, variant: "destructive" });
    },
  });

  const toggleFeature = (feature: string) => {
    setPreferences((prev) => ({
      ...prev,
      aiFeatures: prev.aiFeatures.includes(feature)
        ? prev.aiFeatures.filter((f) => f !== feature)
        : [...prev.aiFeatures, feature],
    }));
  };

  const featureOptions = [
    { id: "auto-draft", label: "Auto-draft replies", description: "AI writes reply drafts automatically" },
    { id: "suggest-replies", label: "Reply suggestions", description: "Get AI-powered reply suggestions" },
    { id: "summarize", label: "Email summaries", description: "Summarize long email threads" },
    { id: "auto-label", label: "Smart labeling", description: "Auto-categorize incoming emails" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Primary Use</CardTitle>
          <CardDescription>How do you primarily use email?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.primaryUse}
            onValueChange={(value) => setPreferences((p) => ({ ...p, primaryUse: value }))}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="work" id="use-work" data-testid="radio-use-work" />
              <Label htmlFor="use-work">Work</Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="personal" id="use-personal" data-testid="radio-use-personal" />
              <Label htmlFor="use-personal">Personal</Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="both" id="use-both" data-testid="radio-use-both" />
              <Label htmlFor="use-both">Both</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Features</CardTitle>
          <CardDescription>Select which AI features to enable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {featureOptions.map((feature) => (
            <div key={feature.id} className="flex items-start space-x-3">
              <Checkbox
                id={feature.id}
                checked={preferences.aiFeatures.includes(feature.id)}
                onCheckedChange={() => toggleFeature(feature.id)}
                data-testid={`checkbox-${feature.id}`}
              />
              <div className="space-y-1">
                <Label htmlFor={feature.id} className="cursor-pointer">{feature.label}</Label>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Level</CardTitle>
          <CardDescription>How much should AI automate?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.automationLevel}
            onValueChange={(value) => setPreferences((p) => ({ ...p, automationLevel: value }))}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="low" id="auto-low" data-testid="radio-auto-low" />
              <div className="space-y-1">
                <Label htmlFor="auto-low">Low</Label>
                <p className="text-sm text-muted-foreground">AI suggests, you decide everything</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="medium" id="auto-medium" data-testid="radio-auto-medium" />
              <div className="space-y-1">
                <Label htmlFor="auto-medium">Medium</Label>
                <p className="text-sm text-muted-foreground">AI drafts replies, you review before sending</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="high" id="auto-high" data-testid="radio-auto-high" />
              <div className="space-y-1">
                <Label htmlFor="auto-high">High</Label>
                <p className="text-sm text-muted-foreground">AI handles routine emails automatically</p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reply Tone</CardTitle>
          <CardDescription>Default tone for AI-generated replies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={preferences.replyTone}
            onValueChange={(value) => setPreferences((p) => ({ ...p, replyTone: value }))}
            className="grid grid-cols-2 gap-4"
          >
            {["professional", "friendly", "concise", "custom"].map((tone) => (
              <div key={tone} className="flex items-center space-x-3">
                <RadioGroupItem value={tone} id={`tone-${tone}`} data-testid={`radio-tone-${tone}`} />
                <Label htmlFor={`tone-${tone}`} className="capitalize">{tone}</Label>
              </div>
            ))}
          </RadioGroup>
          {preferences.replyTone === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-tone">Describe your preferred tone</Label>
              <Input
                id="custom-tone"
                value={preferences.customTone}
                onChange={(e) => setPreferences((p) => ({ ...p, customTone: e.target.value }))}
                placeholder="e.g., casual but informative"
                data-testid="input-custom-tone"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button 
        onClick={() => updateMutation.mutate()} 
        disabled={updateMutation.isPending}
        className="w-full"
        data-testid="button-save-ai-preferences"
      >
        {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save AI Preferences
      </Button>
    </div>
  );
}

function EmailSettingsTab({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [signature, setSignature] = useState(settings.emailSignature || "");
  const [signatureEnabled, setSignatureEnabled] = useState(settings.signatureEnabled);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/settings/signature", { 
        emailSignature: signature,
        signatureEnabled 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Email settings updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Signature</CardTitle>
          <CardDescription>Create a signature that will be added to your outgoing emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="signature-toggle">Enable signature</Label>
            <Switch
              id="signature-toggle"
              checked={signatureEnabled}
              onCheckedChange={setSignatureEnabled}
              data-testid="switch-signature-enabled"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature">Your signature</Label>
            <Textarea
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Best regards,&#10;John Doe&#10;john@company.com"
              rows={5}
              disabled={!signatureEnabled}
              className={!signatureEnabled ? "opacity-50" : ""}
              data-testid="textarea-signature"
            />
            <p className="text-sm text-muted-foreground">
              Use plain text. Line breaks will be preserved.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Multiple Inboxes</CardTitle>
          <CardDescription>Connect additional email accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Support for multiple inboxes is coming soon. You'll be able to manage all your email accounts in one place.
          </p>
          <Button variant="outline" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>

      <Button 
        onClick={() => updateMutation.mutate()} 
        disabled={updateMutation.isPending}
        className="w-full"
        data-testid="button-save-email-settings"
      >
        {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Email Settings
      </Button>
    </div>
  );
}

function ConnectionsTab({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/nylas/disconnect");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Email disconnected" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to disconnect", description: error.message, variant: "destructive" });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/nylas/auth-url?provider=${provider}`);
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Email Account</CardTitle>
          <CardDescription>Manage your connected email provider</CardDescription>
        </CardHeader>
        <CardContent>
          {settings.connectedEmail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  {settings.connectedEmail.provider === "google" ? (
                    <SiGoogle className="w-5 h-5 text-foreground" />
                  ) : (
                    <Building2 className="w-5 h-5 text-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{settings.connectedEmail.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">{settings.connectedEmail.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium">
                  <Check className="w-4 h-4" />
                  Connected
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive" data-testid="button-disconnect">
                    Disconnect Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Email?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect your email account. You'll need to reconnect to access your emails through MyDraft.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => disconnectMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {disconnectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No email account connected. Connect your email to start using MyDraft.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => connectMutation.mutate("google")}
                  disabled={connectMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-connect-google"
                >
                  <SiGoogle className="w-4 h-4" />
                  Connect Gmail
                </Button>
                <Button
                  variant="outline"
                  onClick={() => connectMutation.mutate("microsoft")}
                  disabled={connectMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-connect-microsoft"
                >
                  <Building2 className="w-4 h-4" />
                  Connect Outlook
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Connections</CardTitle>
          <CardDescription>Connect more services to enhance your experience</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Additional integrations coming soon. Connect your calendar, task manager, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface TeamInvite {
  id: number;
  inviterId: string;
  inviteeId: string;
  inviteeEmail?: string;
  inviterEmail?: string;
  status: string;
  createdAt: string;
}

interface TeamMember {
  id: number;
  ownerId: string;
  memberId: string;
  memberEmail?: string;
  role: string;
  joinedAt: string;
}

function TeamTab() {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: sentInvites = [], isLoading: loadingInvites } = useQuery<TeamInvite[]>({
    queryKey: ["/api/team/invites/sent"],
  });

  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/team/invite", { inviteeEmail: email });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invite");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invite sent successfully" });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/team/invites/sent"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invite", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("DELETE", `/api/team/member/${memberId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team member removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      sendInviteMutation.mutate(inviteEmail.trim());
    }
  };

  const pendingInvites = sentInvites.filter(i => i.status === "pending");
  const hasTeamMember = teamMembers.length > 0;
  const canInvite = !hasTeamMember && pendingInvites.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Management
          </CardTitle>
          <CardDescription>
            Invite team members to collaborate on your inbox. Business plan allows 1 additional team member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {canInvite ? (
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Invite by Email</Label>
                <p className="text-sm text-muted-foreground">
                  Enter the email of an existing MyDraft user to invite them to your team.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                  data-testid="input-invite-email"
                />
                <Button 
                  type="submit" 
                  disabled={!inviteEmail.trim() || sendInviteMutation.isPending}
                  data-testid="button-send-invite"
                >
                  {sendInviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {hasTeamMember 
                  ? "You have reached the maximum team size (1 member). Remove the current member to invite someone else."
                  : "You have a pending invite. Wait for a response or the invite will expire."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People currently on your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No team members yet. Invite someone to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`team-member-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium">
                      {member.memberEmail?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{member.memberEmail || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.memberEmail} from your team? They will no longer have access to team features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeMemberMutation.mutate(member.memberId)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invites</CardTitle>
          <CardDescription>
            Invites waiting for a response
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvites ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No pending invites.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`pending-invite-${invite.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.inviteeEmail || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        Sent {new Date(invite.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite History</CardTitle>
          <CardDescription>
            Past invites and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentInvites.filter(i => i.status !== "pending").length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No invite history yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sentInvites.filter(i => i.status !== "pending").map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`invite-history-${invite.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.inviteeEmail || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={invite.status === "accepted" ? "default" : "secondary"}
                    className={invite.status === "declined" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : ""}
                  >
                    {invite.status === "accepted" ? (
                      <><Check className="w-3 h-3 mr-1" /> Accepted</>
                    ) : (
                      <><X className="w-3 h-3 mr-1" /> Declined</>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      return (saved === "light" || saved === "dark") ? saved : "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    toast({
      title: "Theme updated",
      description: `Switched to ${newTheme} mode`,
    });
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun, description: "Clean, bright interface" },
    { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
  ] as const;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how MyDraft looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Theme</Label>
            <RadioGroup
              value={theme}
              onValueChange={(value) => handleThemeChange(value as "light" | "dark")}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <Label
                    key={option.value}
                    htmlFor={`theme-${option.value}`}
                    className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`theme-${option.value}`}
                      className="sr-only"
                      data-testid={`radio-theme-${option.value}`}
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Preview</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  See how your inbox looks with the current theme
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">John Doe</span>
                    <span className="text-xs text-muted-foreground">2:30 PM</span>
                  </div>
                  <p className="text-sm font-medium">Project Update</p>
                  <p className="text-xs text-muted-foreground truncate">Here's the latest on our project...</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Jane Smith</span>
                    <span className="text-xs text-muted-foreground">1:45 PM</span>
                  </div>
                  <p className="text-sm font-medium">Meeting Reminder</p>
                  <p className="text-xs text-muted-foreground truncate">Don't forget about tomorrow's meeting...</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
