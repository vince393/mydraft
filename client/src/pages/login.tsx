import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackMetaEvent, trackMetaEventOnce } from "@/lib/meta-pixel";
import { saveDeviceAccount } from "@/lib/device-accounts";
import { Loader2, Eye, EyeOff, ArrowRight, LogOut, Mail, ArrowLeft, Building2, Inbox, Shield, Sparkles, Lock, Zap, Globe } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import logoPath from "@assets/mydraft_logo.png";

interface AuthResponse {
  user: { id: string; email: string; plan?: string; onboardingCompleted?: boolean; emailVerified?: boolean; twoFactorEnabled?: boolean } | null;
}

type AuthStep = "credentials" | "verify-registration" | "verify-2fa" | "restore";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen flex items-center justify-center relative overflow-hidden bg-[#07070c]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[20%] w-[600px] h-[600px] bg-blue-600/[0.04] rounded-full blur-[180px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] bg-indigo-600/[0.03] rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[440px] mx-auto px-5 py-10">
        <div className="flex justify-center mb-8">
          <img src={logoPath} alt="MyDraft" className="h-6 w-auto opacity-50" />
        </div>

        <div
          className="rounded-2xl p-7 sm:p-8"
          style={{
            background: "linear-gradient(160deg, rgba(var(--overlay-rgb), 0.04) 0%, rgba(var(--overlay-rgb), 0.008) 100%)",
            border: "1px solid rgba(var(--overlay-rgb), 0.06)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(var(--overlay-rgb), 0.04)",
          }}
        >
          {children}
        </div>

        <div className="mt-8 flex items-center justify-center flex-wrap gap-x-5 gap-y-2 text-[11px] text-black/15 dark:text-white/15">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            <span>CASA Tier 2 Approved</span>
          </div>
          <div className="w-px h-3 bg-black/[0.04] dark:bg-white/[0.04]" />
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>AES-256 encryption</span>
          </div>
          <div className="w-px h-3 bg-black/[0.04] dark:bg-white/[0.04]" />
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            <span>50+ languages</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const switchEmail = urlParams.get("switch") || "";
  const [isRegister, setIsRegister] = useState(!switchEmail && urlParams.get("mode") === "register");
  const [email, setEmail] = useState(switchEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; confirmPassword?: string; code?: string}>({});
  const [oauthConnecting, setOauthConnecting] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [restoreInfo, setRestoreInfo] = useState<{ email: string; daysLeft: number } | null>(null);
  const [isRestore2FA, setIsRestore2FA] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Surface OAuth redirect errors (e.g. a passed restore window) as a toast.
  useEffect(() => {
    const oauthError = urlParams.get("error");
    if (!oauthError) return;
    const messages: Record<string, string> = {
      restore_window_expired:
        "This account's 30-day restore window has passed and it can no longer be recovered.",
      session_expired: "Your sign-in session expired. Please try again.",
      invalid_state: "Sign in could not be completed. Please try again.",
    };
    toast({
      title: "Sign in failed",
      description: messages[oauthError] || "Something went wrong. Please try again.",
      variant: "destructive",
    });
    // Clear the error from the URL so it doesn't re-fire on refresh.
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const isLoggedIn = !!authData?.user;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.accountPendingDeletion) {
        setRestoreInfo({ email: data.email, daysLeft: data.daysLeft ?? 0 });
        setAuthStep("restore");
        return;
      }

      if (data.requires2FA) {
        setPendingEmail(data.email);
        setAuthStep("verify-2fa");
        toast({
          title: "Verification Required",
          description: "A verification code has been sent to your email.",
        });
        return;
      }
      
      if (data.user && data.deviceSwitchToken) {
        saveDeviceAccount({
          userId: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName ?? null,
          plan: data.user.plan ?? null,
          switchToken: data.deviceSwitchToken,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigateAfterAuth(data.user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; code?: string }) => {
      const response = await apiRequest("POST", "/api/auth/restore", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Account has 2FA enabled — collect the emailed code before restoring.
      if (data.requires2FA) {
        setPendingEmail(data.email);
        setIsRestore2FA(true);
        setVerificationCode("");
        setAuthStep("verify-2fa");
        toast({
          title: "Verification Required",
          description: "A verification code has been sent to your email.",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome back!",
        description: "Your account has been restored. Choose a plan to continue.",
      });
      setRestoreInfo(null);
      setIsRestore2FA(false);
      setAuthStep("credentials");
      // After restore the account is on the free plan; prompt for plan choice.
      setLocation("/select-plan");
    },
    onError: (error: Error) => {
      toast({
        title: "Restore failed",
        description: error.message || "Could not restore your account",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; referralCode?: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        setPendingEmail(data.email);
        setAuthStep("verify-registration");
        toast({
          title: "Check your email",
          description: "We've sent a verification code to your email address.",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/select-plan");
    },
    onError: (error: Error & { status?: number }) => {
      // Account exists but is pending deletion — steer them to the restore flow.
      if (error.status === 409) {
        setRestoreInfo({ email: email.toLowerCase().trim(), daysLeft: 0 });
        setAuthStep("restore");
        return;
      }
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const verifyRegistrationMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-registration", data);
      return response.json();
    },
    onSuccess: (data) => {
      trackMetaEventOnce("signup", "CompleteRegistration");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Email verified!",
        description: "Your account has been created successfully.",
      });
      navigateAfterAuth(data.user);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-2fa", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.user && data.deviceSwitchToken) {
        saveDeviceAccount({
          userId: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName ?? null,
          plan: data.user.plan ?? null,
          switchToken: data.deviceSwitchToken,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Verified!",
        description: "You have been signed in successfully.",
      });
      navigateAfterAuth(data.user);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async (data: { email: string; type: "signup" | "login" }) => {
      const response = await apiRequest("POST", "/api/auth/resend-code", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code sent!",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend",
        description: error.message || "Could not resend code",
        variant: "destructive",
      });
    },
  });

  const navigateAfterAuth = (user: AuthResponse["user"]) => {
    if (!user) return;
    
    if (!user.plan) {
      setLocation("/select-plan");
    } else if (!user.onboardingCompleted) {
      setLocation("/onboarding");
    } else {
      setLocation("/inbox");
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (isRegister && password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (isRegister && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    if (isRegister) {
      const refCode = urlParams.get("ref") || undefined;
      registerMutation.mutate({ email, password, referralCode: refCode });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: "Please enter a valid 6-digit code" });
      return;
    }
    
    if (authStep === "verify-registration") {
      verifyRegistrationMutation.mutate({ email: pendingEmail, code: verificationCode });
    } else if (authStep === "verify-2fa") {
      if (isRestore2FA) {
        restoreMutation.mutate({ email: pendingEmail, password, code: verificationCode });
      } else {
        verify2FAMutation.mutate({ email: pendingEmail, code: verificationCode });
      }
    }
  };

  const handleResendCode = () => {
    const type = authStep === "verify-registration" ? "signup" : "login";
    resendCodeMutation.mutate({ email: pendingEmail, type });
  };

  const handleBack = () => {
    setAuthStep("credentials");
    setVerificationCode("");
    setPendingEmail("");
    setIsRestore2FA(false);
    setErrors({});
  };

  const handleOAuthLogin = async (provider: 'google' | 'microsoft') => {
    setOauthConnecting(provider);
    try {
      const refCode = urlParams.get("ref") || "";
      const refParam = refCode ? `&ref=${encodeURIComponent(refCode)}` : "";
      const response = await fetch(`/api/auth/oauth/login?provider=${provider}${refParam}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Connection failed",
          description: data.error || "Could not start sign in. Please try again.",
          variant: "destructive",
        });
        setOauthConnecting(null);
      }
    } catch (error) {
      console.error("OAuth login failed:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to " + (provider === 'google' ? 'Google' : 'Microsoft'),
        variant: "destructive",
      });
      setOauthConnecting(null);
    }
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    setOauthConnecting(null);
    setAuthStep("credentials");
    setPendingEmail("");
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const isVerifying = verifyRegistrationMutation.isPending || verify2FAMutation.isPending || restoreMutation.isPending;

  if (isLoggedIn) {
    return (
      <AuthShell>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-black/90 dark:text-white/90 mb-1">Welcome back</h2>
          <p className="text-sm text-black/40 dark:text-white/40">
            Signed in as {authData?.user?.email}
          </p>
        </div>
        <div className="space-y-2.5">
          <Link href="/inbox">
            <Button className="w-full gap-2" data-testid="button-go-to-inbox">
              Go to Inbox
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-sign-out"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Sign out
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (authStep === "restore") {
    return (
      <AuthShell>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-black/90 dark:text-white/90 mb-1">
            Restore your account
          </h2>
          <p className="text-sm text-black/40 dark:text-white/40">
            <span className="font-medium text-black/60 dark:text-white/60">{restoreInfo?.email}</span>{" "}
            is scheduled for deletion.
          </p>
          {restoreInfo && restoreInfo.daysLeft > 0 && (
            <p className="text-xs text-black/30 dark:text-white/30 mt-2">
              You have {restoreInfo.daysLeft} day{restoreInfo.daysLeft === 1 ? "" : "s"} left to bring it back before it's permanently deleted.
            </p>
          )}
          <p className="text-xs text-black/30 dark:text-white/30 mt-2">
            Restore it now to keep your emails and settings. Your subscription was cancelled, so you'll pick a plan next.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            disabled={restoreMutation.isPending}
            onClick={() => {
              if (restoreInfo) {
                restoreMutation.mutate({ email: restoreInfo.email, password });
              }
            }}
            data-testid="button-restore-account"
          >
            {restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restore my account
          </Button>

          {!password && (
            <p className="text-xs text-center text-black/30 dark:text-white/30">
              For your security, go back and enter your password to confirm.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setRestoreInfo(null);
              setAuthStep("credentials");
            }}
            className="w-full text-sm text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors inline-flex items-center justify-center gap-1"
            data-testid="button-back-from-restore"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>
      </AuthShell>
    );
  }

  if (authStep === "verify-registration" || authStep === "verify-2fa") {
    return (
      <AuthShell>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-black/90 dark:text-white/90 mb-1">
            {authStep === "verify-registration" ? "Verify your email" : "Two-factor authentication"}
          </h2>
          <p className="text-sm text-black/40 dark:text-white/40">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-black/60 dark:text-white/60">{pendingEmail}</span>
          </p>
          <p className="text-xs text-black/20 dark:text-white/20 mt-2">
            Check your spam folder if you don't see it.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-xs font-medium text-black/40 dark:text-white/40">Verification Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setVerificationCode(value);
                if (errors.code) setErrors({});
              }}
              className="text-center text-2xl tracking-[0.5em] font-mono bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.08] dark:border-white/[0.08]"
              autoFocus
              data-testid="input-verification-code"
            />
            {errors.code && <p className="text-sm text-destructive text-center">{errors.code}</p>}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isVerifying || verificationCode.length !== 6}
            data-testid="button-verify-code"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors inline-flex items-center gap-1"
            data-testid="button-back-to-login"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendCodeMutation.isPending}
            className="text-sm text-primary/80 hover:text-primary disabled:opacity-50 transition-colors"
            data-testid="button-resend-code"
          >
            {resendCodeMutation.isPending ? "Sending..." : "Resend code"}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="text-center mb-7">
        <h2 className="text-[22px] font-semibold text-black/90 dark:text-white/90 mb-1.5 tracking-tight">
          {switchEmail ? "Switch Account" : isRegister ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-[13px] text-black/30 dark:text-white/30">
          {switchEmail ? `Sign in as ${switchEmail}` : isRegister ? "Start managing your inbox with AI" : "Sign in to your inbox"}
        </p>
      </div>

      <div className="space-y-2.5 mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 text-sm font-medium h-11 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: "rgba(var(--overlay-rgb), 0.03)",
            border: "1px solid rgba(var(--overlay-rgb), 0.07)",
            color: "rgba(var(--overlay-rgb), 0.7)",
          }}
          onClick={() => handleOAuthLogin('google')}
          disabled={oauthConnecting !== null || isPending}
          data-testid="button-oauth-google"
        >
          {oauthConnecting === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SiGoogle className="w-4 h-4" />
          )}
          {isRegister ? "Sign up with Google" : "Continue with Google"}
        </button>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 text-sm font-medium h-11 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: "rgba(var(--overlay-rgb), 0.03)",
            border: "1px solid rgba(var(--overlay-rgb), 0.07)",
            color: "rgba(var(--overlay-rgb), 0.7)",
          }}
          onClick={() => handleOAuthLogin('microsoft')}
          disabled={oauthConnecting !== null || isPending}
          data-testid="button-oauth-microsoft"
        >
          {oauthConnecting === 'microsoft' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Building2 className="w-4 h-4" />
          )}
          {isRegister ? "Sign up with Microsoft" : "Continue with Microsoft"}
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-black/[0.05] dark:border-white/[0.05]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-[11px] text-black/15 dark:text-white/15 uppercase tracking-wider bg-[#0d0d14]">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-black/35 dark:text-white/35">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.07] dark:border-white/[0.07] focus:border-black/[0.15] dark:focus:border-white/[0.15] text-white placeholder:text-black/15 dark:placeholder:text-white/15 h-11"
            data-testid={isRegister ? "input-register-email" : "input-login-email"}
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-black/35 dark:text-white/35">Password</Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={isRegister ? "Min. 8 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              autoFocus={!!switchEmail}
              className="pr-10 bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.07] dark:border-white/[0.07] focus:border-black/[0.15] dark:focus:border-white/[0.15] text-white placeholder:text-black/15 dark:placeholder:text-white/15 h-11"
              data-testid={isRegister ? "input-register-password" : "input-login-password"}
            />
            <button
              type="button"
              className="absolute right-3 text-black/15 dark:text-white/15 hover:text-black/40 dark:hover:text-white/40 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              data-testid="button-toggle-password-visibility"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
        </div>

        {isRegister && (
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-black/35 dark:text-white/35">Confirm password</Label>
            <div className="relative flex items-center">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10 bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.07] dark:border-white/[0.07] focus:border-black/[0.15] dark:focus:border-white/[0.15] text-white placeholder:text-black/15 dark:placeholder:text-white/15 h-11"
                data-testid="input-register-confirm-password"
              />
              <button
                type="button"
                className="absolute right-3 text-black/15 dark:text-white/15 hover:text-black/40 dark:hover:text-white/40 transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                data-testid="button-toggle-confirm-password-visibility"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>
        )}

        {!isRegister && (
          <div className="flex justify-end mt-1">
            <Link href="/forgot-password">
              <button
                type="button"
                className="text-xs text-primary/60 hover:text-primary transition-colors"
                data-testid="link-forgot-password"
              >
                Forgot password?
              </button>
            </Link>
          </div>
        )}

        <Button
          type="submit"
          className="w-full font-medium mt-1 h-11"
          disabled={isPending}
          data-testid={isRegister ? "button-register-submit" : "button-login-submit"}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isRegister ? "Create Account" : "Sign In"}
          {!isPending && <ArrowRight className="ml-2 w-4 h-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-black/30 dark:text-white/30">
        {isRegister ? "Already have an account? " : "Don't have an account? "}
        <button
          type="button"
          onClick={handleToggleMode}
          className="text-primary/80 font-medium hover:text-primary transition-colors"
          data-testid="button-toggle-auth-mode"
        >
          {isRegister ? "Sign in" : "Start free trial"}
        </button>
      </p>

      <p className="mt-5 text-[11px] text-center text-black/12 dark:text-white/12 leading-relaxed">
        By {isRegister ? "creating an account" : "signing in"}, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-black/25 dark:hover:text-white/25 transition-colors">
          Terms
        </Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline hover:text-black/25 dark:hover:text-white/25 transition-colors">
          Privacy Policy
        </Link>
      </p>
    </AuthShell>
  );
}