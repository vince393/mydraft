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
  Check
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Building2 } from "lucide-react";

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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="account" className="flex items-center gap-2 py-2" data-testid="tab-account">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2 py-2" data-testid="tab-billing">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2 py-2" data-testid="tab-ai">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2 py-2" data-testid="tab-email">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2 py-2" data-testid="tab-connections">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Connections</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountTab settings={settings!} />
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

function BillingTab({ settings }: { settings: Settings }) {
  const [, setLocation] = useLocation();

  const planDetails = {
    free: { name: "Free", price: "$0/month", features: ["5 AI replies/day", "Basic email management", "Single inbox"] },
    pro: { name: "Pro", price: "$12/month", features: ["Unlimited AI replies", "Smart categorization", "Priority support"] },
    business: { name: "Business", price: "$29/month", features: ["Everything in Pro", "Team collaboration", "Custom AI training", "API access"] },
  };

  const currentPlan = settings.plan ? planDetails[settings.plan as keyof typeof planDetails] : planDetails.free;

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
        <CardContent className="space-y-4">
          <Button onClick={() => setLocation("/pricing")} data-testid="button-change-plan">
            Change Plan
          </Button>
          {settings.plan && settings.plan !== "free" && (
            <Button variant="outline" className="ml-2" data-testid="button-cancel-subscription">
              Cancel Subscription
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment details</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Payment processing is handled securely through our payment provider.
          </p>
          <Button variant="outline" data-testid="button-manage-payment">
            Manage Payment Method
          </Button>
        </CardContent>
      </Card>
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
                      This will disconnect your email account. You'll need to reconnect to access your emails through MailFlow.
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
                No email account connected. Connect your email to start using MailFlow.
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
