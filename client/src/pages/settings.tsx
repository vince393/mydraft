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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Star,
  MessageSquare,
  Lightbulb,
  Bug,
  CheckCircle2,
  Copy,
  Gift,
  Trophy,
  ArrowRight,
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
    region?: string;
    preferredLanguage?: string;
    formalityLevel?: string;
  } | null;
  emailSignature: string | null;
  signatureEnabled: boolean;
  connectedEmail: { email: string; provider: string } | null;
}

type SettingsSection = "account" | "security" | "appearance" | "ai" | "email" | "connections" | "billing" | "referrals" | "feedback" | "team";

interface NavItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof User;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "account", label: "Account", description: "Profile and password", icon: User, group: "General" },
  { id: "security", label: "Security", description: "2FA and sessions", icon: Shield, group: "General" },
  { id: "appearance", label: "Appearance", description: "Theme and display", icon: Palette, group: "General" },
  { id: "ai", label: "AI Preferences", description: "Tone, language, style", icon: Sparkles, group: "Email" },
  { id: "email", label: "Signature", description: "Email signature", icon: Mail, group: "Email" },
  { id: "connections", label: "Connections", description: "Linked accounts", icon: Link2, group: "Email" },
  { id: "billing", label: "Billing", description: "Plan and payments", icon: CreditCard, group: "Billing" },
  { id: "referrals", label: "Referrals", description: "Earn free Pro", icon: Gift, group: "Billing" },
  { id: "feedback", label: "Feedback", description: "Send us feedback", icon: MessageSquare, group: "Support" },
];

const TEAM_NAV_ITEM: NavItem = { id: "team", label: "Team", description: "Manage members", icon: Users, group: "General" };

function SettingsPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 sm:p-6 ${className || ""}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: typeof User; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground/60" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[12px] text-muted-foreground/50 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function SettingsNav({ active, onChange, showTeam }: { active: SettingsSection; onChange: (s: SettingsSection) => void; showTeam: boolean }) {
  const items = showTeam ? [...NAV_ITEMS.slice(0, 3), TEAM_NAV_ITEM, ...NAV_ITEMS.slice(3)] : NAV_ITEMS;
  const groups = Array.from(new Set(items.map(i => i.group)));

  return (
    <nav className="space-y-5">
      {groups.map(group => (
        <div key={group}>
          <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest px-3 mb-1.5">{group}</p>
          <div className="space-y-0.5">
            {items.filter(i => i.group === group).map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  data-testid={`tab-${item.id}`}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                    isActive
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted-foreground/50 hover:text-foreground/80 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary/80" : ""}`} />
                  <span className="text-[13px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function MobileSettingsNav({ onChange, showTeam }: { onChange: (s: SettingsSection) => void; showTeam: boolean }) {
  const items = showTeam ? [...NAV_ITEMS.slice(0, 3), TEAM_NAV_ITEM, ...NAV_ITEMS.slice(3)] : NAV_ITEMS;
  const groups = Array.from(new Set(items.map(i => i.group)));

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <div key={group}>
          <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest mb-2 px-1">{group}</p>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden divide-y divide-white/[0.04]">
            {items.filter(i => i.group === group).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  data-testid={`tab-${item.id}`}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors active:bg-white/[0.05]"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground/90">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground/35 mt-0.5">{item.description}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/15 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="px-1">
        <TestimonialWidget />
      </div>
    </div>
  );
}

function SettingsContent({ section, settings }: { section: SettingsSection; settings: Settings }) {
  switch (section) {
    case "account": return <AccountTab settings={settings} />;
    case "security": return <SecurityTab settings={settings} />;
    case "appearance": return <AppearanceTab />;
    case "ai": return <AIPreferencesTab settings={settings} />;
    case "email": return <EmailSettingsTab settings={settings} />;
    case "connections": return <ConnectionsTab settings={settings} />;
    case "billing": return <BillingTab settings={settings} />;
    case "referrals": return <ReferralTab />;
    case "feedback": return <FeedbackTab settings={settings} />;
    case "team": return <TeamTab />;
    default: return null;
  }
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground/50">Failed to load settings</p>
      </div>
    );
  }

  const showTeam = settings.plan === "premium";
  const activeItem = activeSection ? [...NAV_ITEMS, TEAM_NAV_ITEM].find(i => i.id === activeSection) : null;

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 py-5">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => activeSection ? setActiveSection(null) : setLocation("/inbox")}
              data-testid="button-back"
              className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {activeItem ? activeItem.label : "Settings"}
              </h1>
              {activeItem && (
                <p className="text-[11px] text-muted-foreground/40">{activeItem.description}</p>
              )}
            </div>
          </div>
          {activeSection ? (
            <SettingsContent section={activeSection} settings={settings} />
          ) : (
            <MobileSettingsNav onChange={setActiveSection} showTeam={showTeam} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setLocation("/inbox")}
            data-testid="button-back"
            className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
        <div className="flex gap-8">
          <div className="w-48 flex-shrink-0 sticky top-8 self-start">
            <SettingsNav active={activeSection || "account"} onChange={setActiveSection} showTeam={showTeam} />
            <div className="mt-5">
              <TestimonialWidget />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <SettingsContent section={activeSection || "account"} settings={settings} />
          </div>
        </div>
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
    <div className="space-y-5">
      <SettingsPanel>
        <SectionHeader icon={User} title="Account Information" description="Your account details" />
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground/60">Email</Label>
          <Input value={settings.email} disabled className="bg-white/[0.03] border-white/[0.06]" data-testid="input-email" />
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Shield} title="Change Password" description="Update your account password" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-xs text-muted-foreground/60">Current Password</Label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-xs text-muted-foreground/60">New Password</Label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-xs text-muted-foreground/60">Confirm New Password</Label>
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
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <LogOut className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Session</h3>
              <p className="text-[12px] text-muted-foreground/50">Sign out of your account</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            {logoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Out"}
          </Button>
        </div>
      </SettingsPanel>

      <SettingsPanel className="border-destructive/20">
        <SectionHeader icon={Trash2} title="Danger Zone" description="Irreversible actions" />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" data-testid="button-delete-account">
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
      </SettingsPanel>
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

function TestimonialWidget() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);

  const { data: existingTestimonial, isLoading } = useQuery<UserTestimonial | null>({
    queryKey: ["/api/testimonials/mine"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/testimonials", { content, rating });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Thank you!", description: "Your testimonial will be reviewed." });
      setExpanded(false);
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials/mine"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return null;

  if (existingTestimonial) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {[...Array(existingTestimonial.rating)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/50 italic leading-relaxed line-clamp-2">"{existingTestimonial.content}"</p>
        <p className="text-[10px] text-muted-foreground/25 mt-1.5 capitalize">{existingTestimonial.status}</p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-lg border border-dashed border-white/[0.08] bg-white/[0.01] p-3 text-left hover:bg-white/[0.03] transition-colors group"
        data-testid="button-open-testimonial"
      >
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-3.5 h-3.5 text-yellow-500/60 group-hover:text-yellow-500 transition-colors" />
          <span className="text-[12px] font-medium text-foreground/60 group-hover:text-foreground/80 transition-colors">Enjoying MyDraft?</span>
        </div>
        <p className="text-[11px] text-muted-foreground/30">Leave a testimonial</p>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground/70">Your rating</span>
        <button onClick={() => setExpanded(false)} className="text-muted-foreground/30 hover:text-foreground/60 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-0.5 hover:scale-110 transition-transform"
            data-testid={`star-rating-${star}`}
          >
            <Star className={`w-4 h-4 ${star <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/20"}`} />
          </button>
        ))}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What do you love about MyDraft?"
        className="min-h-[60px] text-[12px] resize-none"
        data-testid="textarea-testimonial"
      />
      <Button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || content.trim().length < 10}
        size="sm"
        className="w-full text-[12px]"
        data-testid="button-submit-testimonial"
      >
        {submitMutation.isPending && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
        Submit
      </Button>
    </div>
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
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03]">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-emerald-300 text-sm">CASA Tier 2 Certified</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            Independently verified security controls for data protection and encryption.
          </p>
        </div>
      </div>

      <SettingsPanel>
        <SectionHeader icon={Shield} title="Two-Factor Authentication" description="Require a verification code when signing in" />
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground/90">Email verification codes</p>
            <p className="text-[12px] text-muted-foreground/40">
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
      </SettingsPanel>

      <SettingsPanel>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
              <p className="text-[12px] text-muted-foreground/50 mt-0.5">Devices currently logged in</p>
            </div>
          </div>
          {securitySettings && securitySettings.sessions.length > 1 && (
            <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-logout-all-devices">
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Log out all
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
        <div className="space-y-2">
          {securitySettings?.sessions && securitySettings.sessions.length > 0 ? (
            securitySettings.sessions.map((session) => (
              <div 
                key={session.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  session.isCurrent ? "border-primary/20 bg-primary/[0.03]" : "border-white/[0.04] bg-white/[0.01]"
                }`}
                data-testid={`session-item-${session.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <Globe className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground/90">{formatDeviceInfo(session.userAgent)}</p>
                      {session.isCurrent && (
                        <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">Current</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatLocation(session)}
                      </span>
                      {session.ipAddress && (
                        <span>IP: {session.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/40">{formatTime(session.lastActiveAt)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground/40 text-center py-4">
              No active sessions found
            </p>
          )}
        </div>
      </SettingsPanel>

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

interface BillingInfo {
  hasSubscription: boolean;
  nextBillDate: string | null;
  currentPeriodEnd: number | null;
  subscriptionStatus: string | null;
  planName: string | null;
  planAmount: number | null;
  planInterval: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
  invoices: Array<{
    id: string;
    number: string | null;
    amount: number;
    currency: string;
    status: string | null;
    date: string;
    pdfUrl: string | null;
    hostedUrl: string | null;
  }>;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}

function BillingTab({ settings }: { settings: Settings }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const planDetails: Record<string, { name: string; price: string; features: string[] }> = {
    free: { name: "Free", price: "$0/month", features: ["Basic inbox management", "5 emails/day limit", "Standard support"] },
    pro: { name: "Pro", price: "$10/month or $99/year", features: ["Unlimited AI replies", "Unlimited emails", "Advanced tone customization", "Email scheduling", "Priority support"] },
    premium: { name: "Business", price: "$29/month or $299/year", features: ["Everything in Pro", "Voice assistant", "Custom AI training", "Team collaboration", "Dedicated support"] },
    business: { name: "Business", price: "$29/month or $299/year", features: ["Everything in Pro", "Voice assistant", "Custom AI training", "Team collaboration", "Dedicated support"] },
  };

  const currentPlan = (settings?.plan && planDetails[settings.plan]) ? planDetails[settings.plan] : planDetails.free;

  const { data: billingInfo, isLoading: billingLoading } = useQuery<BillingInfo>({
    queryKey: ["/api/stripe/billing-info"],
    enabled: settings.plan !== "free",
  });

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

  const cancelMutation = useMutation({
    mutationFn: async ({ immediately }: { immediately: boolean }) => {
      const response = await apiRequest("POST", "/api/stripe/cancel", { immediately });
      return response.json();
    },
    onSuccess: (data: { message?: string; cancelAt?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/billing-info"] });
      setShowCancelConfirm(false);
      toast({
        title: "Subscription canceled",
        description: data.message || "Your subscription has been canceled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand?.toLowerCase() || '';
    if (brandLower === 'visa') return 'Visa';
    if (brandLower === 'mastercard') return 'Mastercard';
    if (brandLower === 'amex') return 'Amex';
    if (brandLower === 'discover') return 'Discover';
    return brand?.charAt(0).toUpperCase() + brand?.slice(1) || 'Card';
  };

  return (
    <div className="space-y-5">
      <SettingsPanel>
        <SectionHeader icon={CreditCard} title="Current Plan" description="Your subscription details" />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/[0.04] border border-primary/15">
            <div>
              <h3 className="text-base font-semibold text-foreground">{currentPlan.name}</h3>
              <p className="text-[12px] text-muted-foreground/50">{currentPlan.price}</p>
            </div>
            {billingInfo?.cancelAtPeriodEnd ? (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">Canceling</span>
            ) : (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary flex items-center gap-1">
                <Check className="w-3 h-3" /> Active
              </span>
            )}
          </div>

          {billingInfo?.cancelAtPeriodEnd && billingInfo?.nextBillDate && (
            <div className="p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/15">
              <p className="text-[12px] text-foreground/80">
                Cancels on <span className="font-medium">{formatDate(billingInfo.nextBillDate)}</span>. 
                You'll keep {currentPlan.name} features until then.
              </p>
            </div>
          )}

          {settings.plan && settings.plan !== "free" && billingInfo?.nextBillDate && !billingInfo?.cancelAtPeriodEnd && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[11px] text-muted-foreground/40">Next billing date</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{formatDate(billingInfo.nextBillDate)}</p>
              {billingInfo.planAmount && billingInfo.planInterval && (
                <p className="text-[12px] text-muted-foreground/50 mt-0.5">
                  {formatCurrency(billingInfo.planAmount, 'usd')} / {billingInfo.planInterval}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            {currentPlan.features.map((feature, index) => (
              <div key={index} className="text-[12px] text-muted-foreground/60 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-primary/60" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </SettingsPanel>

      {settings.plan && settings.plan !== "free" && (
        <SettingsPanel>
          <SectionHeader icon={CreditCard} title="Payment Method" description="Your card on file" />
          {billingLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : billingInfo?.paymentMethod ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded bg-white/[0.04] flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/90">
                    {getCardBrandIcon(billingInfo.paymentMethod.brand)} ending in {billingInfo.paymentMethod.last4}
                  </p>
                  <p className="text-[11px] text-muted-foreground/40">
                    Expires {billingInfo.paymentMethod.expMonth}/{billingInfo.paymentMethod.expYear}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-update-card"
              >
                Update
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/40">No payment method on file</p>
          )}
        </SettingsPanel>
      )}

      {settings.plan && settings.plan !== "free" && (
        <SettingsPanel>
          <SectionHeader icon={CreditCard} title="Billing History" description="Your past invoices" />
          {billingLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
            <div className="space-y-2">
              {billingInfo.invoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/[0.04]"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground/90">{invoice.number || 'Invoice'}</p>
                    <p className="text-[11px] text-muted-foreground/40">{formatDate(invoice.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground/90">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <span className={`text-[10px] font-medium ${invoice.status === 'paid' ? 'text-emerald-400' : 'text-muted-foreground/40'}`}>
                        {invoice.status === 'paid' ? 'Paid' : invoice.status}
                      </span>
                    </div>
                    {invoice.pdfUrl && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(invoice.pdfUrl!, '_blank')}
                        data-testid={`button-download-invoice-${invoice.id}`}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/40">No invoices yet</p>
          )}
        </SettingsPanel>
      )}

      <SettingsPanel>
        <SectionHeader icon={CreditCard} title="Manage Subscription" description="Change or cancel your plan" />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setLocation("/select-plan?change=true")} data-testid="button-change-plan">
              Change Plan
            </Button>
            {settings.plan && settings.plan !== "free" && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                {portalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Manage Billing
              </Button>
            )}
          </div>

          {settings.plan && settings.plan !== "free" && !showCancelConfirm && !billingInfo?.cancelAtPeriodEnd && (
            <div className="pt-3 border-t border-white/[0.04]">
              <button 
                className="text-[12px] text-destructive/60 hover:text-destructive transition-colors"
                onClick={() => setShowCancelConfirm(true)}
                data-testid="button-cancel-subscription"
              >
                Cancel subscription
              </button>
            </div>
          )}

          {showCancelConfirm && (
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/[0.03] space-y-3">
              <h4 className="text-sm font-medium text-foreground">Are you sure you want to cancel?</h4>
              <p className="text-[12px] text-muted-foreground/60">
                You'll lose access to all {currentPlan.name} features.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelMutation.mutate({ immediately: false })}
                  disabled={cancelMutation.isPending}
                  data-testid="button-cancel-at-period-end"
                >
                  {cancelMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Cancel at end of billing period
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelMutation.mutate({ immediately: true })}
                  disabled={cancelMutation.isPending}
                  data-testid="button-cancel-immediately"
                >
                  {cancelMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Cancel immediately
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelConfirm(false)}
                  data-testid="button-cancel-nevermind"
                >
                  Never mind
                </Button>
              </div>
            </div>
          )}
        </div>
      </SettingsPanel>
    </div>
  );
}

const REGION_LABELS: Record<string, string> = {
  us: "United States", gb: "United Kingdom", ca: "Canada", au: "Australia", de: "Germany",
  fr: "France", es: "Spain", it: "Italy", pt: "Portugal", br: "Brazil",
  nl: "Netherlands", be: "Belgium", ch: "Switzerland", at: "Austria", se: "Sweden",
  no: "Norway", dk: "Denmark", fi: "Finland", pl: "Poland", cz: "Czech Republic",
  jp: "Japan", kr: "South Korea", cn: "China", tw: "Taiwan", hk: "Hong Kong",
  in: "India", sg: "Singapore", my: "Malaysia", th: "Thailand", vn: "Vietnam",
  ph: "Philippines", id: "Indonesia", ae: "UAE", sa: "Saudi Arabia", il: "Israel",
  tr: "Turkey", eg: "Egypt", ng: "Nigeria", za: "South Africa", ke: "Kenya",
  mx: "Mexico", ar: "Argentina", cl: "Chile", co: "Colombia", pe: "Peru",
  ru: "Russia", ua: "Ukraine", ro: "Romania", gr: "Greece", hr: "Croatia",
  other: "Other",
};

const LANGUAGE_LABELS: Record<string, string> = {
  auto: "Auto-detect", en: "English", es: "Spanish", fr: "French", de: "German",
  it: "Italian", pt: "Portuguese", nl: "Dutch", sv: "Swedish", no: "Norwegian",
  da: "Danish", fi: "Finnish", pl: "Polish", cs: "Czech", ru: "Russian",
  uk: "Ukrainian", ro: "Romanian", el: "Greek", hr: "Croatian", tr: "Turkish",
  ar: "Arabic", he: "Hebrew", hi: "Hindi", bn: "Bengali", ja: "Japanese",
  ko: "Korean", zh: "Chinese (Simplified)", "zh-tw": "Chinese (Traditional)",
  th: "Thai", vi: "Vietnamese", ms: "Malay", id: "Indonesian", tl: "Filipino",
  sw: "Swahili",
};

const FORMALITY_OPTIONS = [
  { value: "auto", label: "Auto (adapts to context)" },
  { value: "formal", label: "Formal" },
  { value: "neutral", label: "Neutral" },
  { value: "casual", label: "Casual" },
];

function AIPreferencesTab({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    primaryUse: settings.aiPreferences?.primaryUse || "both",
    aiFeatures: settings.aiPreferences?.aiFeatures || [],
    automationLevel: settings.aiPreferences?.automationLevel || "medium",
    replyTone: settings.aiPreferences?.replyTone || "professional",
    customTone: settings.aiPreferences?.customTone || "",
    region: settings.aiPreferences?.region || "us",
    preferredLanguage: settings.aiPreferences?.preferredLanguage || "auto",
    formalityLevel: settings.aiPreferences?.formalityLevel || "auto",
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
    <div className="space-y-5">
      <SettingsPanel>
        <SectionHeader icon={Globe} title="Language & Region" description="For culturally-aware AI translations" />
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="region-select" className="text-xs text-muted-foreground/60">Region</Label>
            <Select value={preferences.region} onValueChange={(value) => setPreferences((p) => ({ ...p, region: value }))}>
              <SelectTrigger id="region-select" data-testid="select-region"><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {Object.entries(REGION_LABELS).map(([code, label]) => (
                  <SelectItem key={code} value={code} data-testid={`select-region-${code}`}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language-select" className="text-xs text-muted-foreground/60">Preferred Language</Label>
            <Select value={preferences.preferredLanguage} onValueChange={(value) => setPreferences((p) => ({ ...p, preferredLanguage: value }))}>
              <SelectTrigger id="language-select" data-testid="select-preferred-language"><SelectValue placeholder="Select language" /></SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <SelectItem key={code} value={code} data-testid={`select-language-${code}`}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label className="text-xs text-muted-foreground/60">Formality Level</Label>
            <RadioGroup value={preferences.formalityLevel} onValueChange={(value) => setPreferences((p) => ({ ...p, formalityLevel: value }))} className="space-y-2">
              {FORMALITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={`formality-${option.value}`} data-testid={`radio-formality-${option.value}`} />
                  <Label htmlFor={`formality-${option.value}`} className="text-sm text-foreground/80">{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Sparkles} title="Primary Use" description="How you primarily use email" />
        <RadioGroup value={preferences.primaryUse} onValueChange={(value) => setPreferences((p) => ({ ...p, primaryUse: value }))} className="space-y-2">
          {[{ value: "work", label: "Work" }, { value: "personal", label: "Personal" }, { value: "both", label: "Both" }].map((opt) => (
            <div key={opt.value} className="flex items-center space-x-3">
              <RadioGroupItem value={opt.value} id={`use-${opt.value}`} data-testid={`radio-use-${opt.value}`} />
              <Label htmlFor={`use-${opt.value}`} className="text-sm text-foreground/80">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Sparkles} title="AI Features" description="Select which AI features to enable" />
        <div className="space-y-3">
          {featureOptions.map((feature) => (
            <div key={feature.id} className="flex items-start space-x-3">
              <Checkbox id={feature.id} checked={preferences.aiFeatures.includes(feature.id)} onCheckedChange={() => toggleFeature(feature.id)} data-testid={`checkbox-${feature.id}`} />
              <div className="space-y-0.5">
                <Label htmlFor={feature.id} className="cursor-pointer text-sm text-foreground/80">{feature.label}</Label>
                <p className="text-[11px] text-muted-foreground/40">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Sparkles} title="Automation Level" description="How much should AI automate?" />
        <RadioGroup value={preferences.automationLevel} onValueChange={(value) => setPreferences((p) => ({ ...p, automationLevel: value }))} className="space-y-3">
          {[
            { value: "low", label: "Low", desc: "AI suggests, you decide everything" },
            { value: "medium", label: "Medium", desc: "AI drafts replies, you review before sending" },
            { value: "high", label: "High", desc: "AI handles routine emails automatically" },
          ].map((opt) => (
            <div key={opt.value} className="flex items-start space-x-3">
              <RadioGroupItem value={opt.value} id={`auto-${opt.value}`} data-testid={`radio-auto-${opt.value}`} />
              <div className="space-y-0.5">
                <Label htmlFor={`auto-${opt.value}`} className="text-sm text-foreground/80">{opt.label}</Label>
                <p className="text-[11px] text-muted-foreground/40">{opt.desc}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Sparkles} title="Reply Tone" description="Default tone for AI-generated replies" />
        <div className="space-y-4">
          <RadioGroup value={preferences.replyTone} onValueChange={(value) => setPreferences((p) => ({ ...p, replyTone: value }))} className="grid grid-cols-2 gap-3">
            {["professional", "friendly", "concise", "custom"].map((tone) => (
              <div key={tone} className="flex items-center space-x-3">
                <RadioGroupItem value={tone} id={`tone-${tone}`} data-testid={`radio-tone-${tone}`} />
                <Label htmlFor={`tone-${tone}`} className="capitalize text-sm text-foreground/80">{tone}</Label>
              </div>
            ))}
          </RadioGroup>
          {preferences.replyTone === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-tone" className="text-xs text-muted-foreground/60">Describe your preferred tone</Label>
              <Input id="custom-tone" value={preferences.customTone} onChange={(e) => setPreferences((p) => ({ ...p, customTone: e.target.value }))} placeholder="e.g., casual but informative" data-testid="input-custom-tone" />
            </div>
          )}
        </div>
      </SettingsPanel>

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
    <div className="space-y-5">
      <SettingsPanel>
        <SectionHeader icon={Mail} title="Email Signature" description="Added to your outgoing emails" />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <Label htmlFor="signature-toggle" className="text-sm text-foreground/80">Enable signature</Label>
            <Switch id="signature-toggle" checked={signatureEnabled} onCheckedChange={setSignatureEnabled} data-testid="switch-signature-enabled" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature" className="text-xs text-muted-foreground/60">Your signature</Label>
            <Textarea
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Best regards,&#10;John Doe&#10;john@company.com"
              rows={5}
              disabled={!signatureEnabled}
              className={!signatureEnabled ? "opacity-40" : ""}
              data-testid="textarea-signature"
            />
            <p className="text-[11px] text-muted-foreground/40">
              Use plain text. Line breaks will be preserved.
            </p>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Mail} title="Multiple Inboxes" description="Connect additional email accounts" />
        <p className="text-[12px] text-muted-foreground/50">
          Support for multiple inboxes is coming soon.
        </p>
      </SettingsPanel>

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
      const response = await apiRequest("POST", "/api/email/disconnect");
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
      const response = await fetch(`/api/email/auth-url?provider=${provider}`);
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  return (
    <div className="space-y-5">
      <SettingsPanel>
        <SectionHeader icon={Link2} title="Connected Email" description="Manage your email provider" />
        {settings.connectedEmail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                {settings.connectedEmail.provider === "google" ? (
                  <SiGoogle className="w-4 h-4 text-foreground/70" />
                ) : (
                  <Building2 className="w-4 h-4 text-foreground/70" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground/90">{settings.connectedEmail.email}</p>
                  <p className="text-[11px] text-muted-foreground/40 capitalize">{settings.connectedEmail.provider}</p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Connected
              </span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-[12px] text-destructive/60 hover:text-destructive transition-colors" data-testid="button-disconnect">
                  Disconnect Account
                </button>
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
                  <AlertDialogAction onClick={() => disconnectMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {disconnectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[12px] text-muted-foreground/50">No email account connected.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={() => connectMutation.mutate("google")} disabled={connectMutation.isPending} className="gap-2" data-testid="button-connect-google">
                <SiGoogle className="w-3.5 h-3.5" /> Connect Gmail
              </Button>
              <Button variant="outline" size="sm" onClick={() => connectMutation.mutate("microsoft")} disabled={connectMutation.isPending} className="gap-2" data-testid="button-connect-microsoft">
                <Building2 className="w-3.5 h-3.5" /> Connect Outlook
              </Button>
            </div>
          </div>
        )}
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Link2} title="Additional Connections" description="More integrations" />
        <p className="text-[12px] text-muted-foreground/50">
          Calendar, task manager, and more integrations coming soon.
        </p>
      </SettingsPanel>
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
    <div className="space-y-5">
      <SettingsPanel>
        <SectionHeader icon={Palette} title="Theme" description="Customize how MyDraft looks" />
        <RadioGroup
          value={theme}
          onValueChange={(value) => handleThemeChange(value as "light" | "dark")}
          className="grid grid-cols-2 gap-3"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            return (
              <Label
                key={option.value}
                htmlFor={`theme-${option.value}`}
                className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]"
                }`}
              >
                <RadioGroupItem value={option.value} id={`theme-${option.value}`} className="sr-only" data-testid={`radio-theme-${option.value}`} />
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isSelected ? "bg-primary/15 text-primary" : "bg-white/[0.04] text-muted-foreground/50"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground/90">{option.label}</p>
                  <p className="text-[11px] text-muted-foreground/40">{option.description}</p>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={Monitor} title="Preview" description="See how your inbox looks" />
        <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] overflow-hidden">
          <div className="flex items-center gap-3 p-3 border-b border-white/[0.04]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/60 to-purple-500/60" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/80">John Doe</span>
                <span className="text-[10px] text-muted-foreground/30">2:30 PM</span>
              </div>
              <p className="text-[11px] text-muted-foreground/50 truncate">Here's the latest on our project...</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/60 to-cyan-500/60" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/80">Jane Smith</span>
                <span className="text-[10px] text-muted-foreground/30">1:45 PM</span>
              </div>
              <p className="text-[11px] text-muted-foreground/50 truncate">Don't forget about tomorrow's meeting...</p>
            </div>
          </div>
        </div>
      </SettingsPanel>
    </div>
  );
}

const FEEDBACK_TYPES = [
  { id: "feature_request", label: "Feature Request", icon: Lightbulb },
  { id: "bug_report", label: "Bug Report", icon: Bug },
  { id: "general", label: "General Feedback", icon: MessageSquare },
] as const;

type FeedbackType = typeof FEEDBACK_TYPES[number]["id"];

interface UserFeedback {
  id: number;
  feedbackType: string;
  message: string;
  status: string;
  createdAt: string;
}

function FeedbackTab({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: pastFeedback = [], isLoading: isLoadingHistory } = useQuery<UserFeedback[]>({
    queryKey: ["/api/feedback"],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { feedbackType: string; message: string }) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      setSubmitted(true);
      setMessage("");
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (message.trim()) {
      submitMutation.mutate({ feedbackType, message: message.trim() });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "reviewed":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Reviewed</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      <SettingsPanel>
        <SectionHeader icon={MessageSquare} title="Send Feedback" description="Share thoughts, report bugs, or request features" />
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
            <p className="text-sm font-medium text-foreground/90">Thank you for your feedback!</p>
            <p className="text-[12px] text-muted-foreground/50 mt-1">We'll review it and get back to you if needed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground/60">Type</Label>
              <div className="flex gap-2">
                {FEEDBACK_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFeedbackType(type.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                        feedbackType === type.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-white/[0.02] text-muted-foreground/60 border border-white/[0.06] hover:bg-white/[0.04]"
                      }`}
                      data-testid={`feedback-type-${type.id}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-message" className="text-xs text-muted-foreground/60">Message</Label>
              <Textarea id="feedback-message" placeholder="Tell us what's on your mind..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} data-testid="input-feedback-message" />
            </div>
            <Button size="sm" onClick={handleSubmit} disabled={!message.trim() || submitMutation.isPending} data-testid="button-submit-feedback">
              {submitMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Feedback"}
            </Button>
          </div>
        )}
      </SettingsPanel>

      <SettingsPanel>
        <SectionHeader icon={MessageSquare} title="Feedback History" description="Your previously submitted feedback" />
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : pastFeedback.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/40 text-center py-6">No feedback submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {pastFeedback.map((item) => {
              const typeInfo = FEEDBACK_TYPES.find(t => t.id === item.feedbackType);
              const Icon = typeInfo?.icon || MessageSquare;
              return (
                <div key={item.id} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <span className="text-[12px] font-medium text-foreground/80">{typeInfo?.label || item.feedbackType}</span>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-[12px] text-muted-foreground/60 mb-1">{item.message}</p>
                  <p className="text-[10px] text-muted-foreground/30">
                    {new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </SettingsPanel>
    </div>
  );
}

function ReferralTab() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{
    referralCode: string;
    stats: { total: number; subscribed: number };
    proCreditsUntil: string | null;
    progressToNextReward: number;
    subscribedNeeded: number;
  }>({
    queryKey: ["/api/referrals/stats"],
  });

  const referralLink = data?.referralCode
    ? `https://mydraft.io/login?mode=register&ref=${data.referralCode}`
    : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Link copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progress = data ? (data.progressToNextReward / 2) * 100 : 0;
  const subscribedCount = data?.stats.subscribed ?? 0;
  const totalReferred = data?.stats.total ?? 0;
  const creditsActive = data?.proCreditsUntil && new Date(data.proCreditsUntil) > new Date();

  return (
    <div className="space-y-5">
      <div
        className="rounded-lg p-6 sm:p-8 border border-primary/20 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.02))" }}
      >
        <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.08))" }}>
          <Gift className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Give Pro, Get Pro</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Share MyDraft with friends and colleagues. When just 2 of them become paying members, you'll unlock a full month of Pro — on us. There's no cap. Keep sharing, keep earning.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <ReferralStepCard
          icon={<Copy className="w-5 h-5" />}
          title="Share Your Link"
          description="Copy your personal invite link and send it to anyone you think would love MyDraft."
        />
        <ReferralStepCard
          icon={<Users className="w-5 h-5" />}
          title="They Sign Up"
          description="Your friend creates an account and picks a plan that works for them."
        />
        <ReferralStepCard
          icon={<Trophy className="w-5 h-5" />}
          title="You Both Win"
          description="Once 2 friends subscribe, you get a free month of Pro automatically."
        />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Personal Invite Link</Label>
            <div className="flex items-center gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-xs sm:text-sm"
                data-testid="input-referral-link"
              />
              <Button
                variant="default"
                onClick={() => copyToClipboard(referralLink)}
                className="flex-shrink-0"
                data-testid="button-copy-referral"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress to Next Reward</span>
              <Badge variant="secondary">
                {data?.progressToNextReward ?? 0} / 2
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.max(progress, 2)}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                }}
              />
            </div>
            {data && data.subscribedNeeded > 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {data.subscribedNeeded === 1
                  ? "You're so close — just 1 more friend and you unlock free Pro."
                  : `Invite ${data.subscribedNeeded} friends who subscribe to earn your next reward.`}
              </p>
            ) : (
              <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                Reward earned! Keep inviting for more free months.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {creditsActive && (
        <div
          className="p-4 rounded-lg border border-primary/20"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))" }}
        >
          <p className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            Your Pro credit is active until {new Date(data!.proCreditsUntil!).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5 text-center">
            <p className="text-3xl font-bold" data-testid="text-total-referrals">{totalReferred}</p>
            <p className="text-sm text-muted-foreground mt-1">Friends Invited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5 text-center">
            <p className="text-3xl font-bold" data-testid="text-subscribed-referrals">{subscribedCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Became Members</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground/60 leading-relaxed text-center">
        Your reward is applied automatically when 2 referrals subscribe. Free trials don't count — only active paid subscriptions qualify.
      </p>
    </div>
  );
}

function ReferralStepCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg bg-muted/30 text-center">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-xs sm:text-sm font-semibold">{title}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed hidden sm:block">{description}</p>
    </div>
  );
}
