import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, ArrowRight, LogOut, Mail, ArrowLeft, Building2, Inbox, Shield, Sparkles, Lock, Zap } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import logoPath from "@assets/bd6ad8b0-8b19-4e70-8b55-0ddd333f446e_removalai_preview_1768612163407.png";

interface AuthResponse {
  user: { id: string; email: string; plan?: string; onboardingCompleted?: boolean; emailVerified?: boolean; twoFactorEnabled?: boolean } | null;
}

type AuthStep = "credentials" | "verify-registration" | "verify-2fa";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-[#0a0a0f]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/[0.07] rounded-full blur-[200px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] bg-violet-600/[0.05] rounded-full blur-[180px]" />
        <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] bg-indigo-600/[0.03] rounded-full blur-[150px]" />
      </div>

      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative z-10 flex-col justify-between p-10 xl:p-14">
        <div>
          <img src={logoPath} alt="MyDraft" className="h-7 w-auto opacity-70 mb-16" />
          <h1 className="text-[2.75rem] xl:text-5xl font-bold text-white/90 leading-[1.1] tracking-tight mb-5">
            Your inbox,<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              reimagined.
            </span>
          </h1>
          <p className="text-[15px] text-white/40 leading-relaxed max-w-[380px]">
            AI-powered email management that helps you focus on what matters. Reply faster, organize smarter.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-blue-400/70" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/70 mb-0.5">AI-Powered Drafts</p>
              <p className="text-[12px] text-white/30 leading-relaxed">Generate context-aware replies in seconds with advanced AI</p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-indigo-400/70" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/70 mb-0.5">50+ Languages</p>
              <p className="text-[12px] text-white/30 leading-relaxed">Translate and compose emails with cultural awareness</p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lock className="w-4 h-4 text-violet-400/70" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/70 mb-0.5">CASA Tier 2 Certified</p>
              <p className="text-[12px] text-white/30 leading-relaxed">Enterprise-grade security with end-to-end encryption</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10 lg:py-0 relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoPath} alt="MyDraft" className="h-7 w-auto opacity-60" />
          </div>
          <div
            className="rounded-2xl p-7 sm:p-8"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              boxShadow: "0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {children}
          </div>
          <div className="mt-6 flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/20">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              <span>CASA Tier 2 Certified</span>
            </div>
            <div className="w-px h-3 bg-white/[0.06] hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              <span>256-bit encryption</span>
            </div>
            <div className="w-px h-3 bg-white/[0.06] hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>AI-powered inbox</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const [isRegister, setIsRegister] = useState(urlParams.get("mode") === "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; confirmPassword?: string; code?: string}>({});
  const [oauthConnecting, setOauthConnecting] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
      if (data.requires2FA) {
        setPendingEmail(data.email);
        setAuthStep("verify-2fa");
        toast({
          title: "Verification Required",
          description: "A verification code has been sent to your email.",
        });
        return;
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
    onError: (error: Error) => {
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
      verify2FAMutation.mutate({ email: pendingEmail, code: verificationCode });
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
  const isVerifying = verifyRegistrationMutation.isPending || verify2FAMutation.isPending;

  if (isLoggedIn) {
    return (
      <AuthShell>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-white/90 mb-1">Welcome back</h2>
          <p className="text-sm text-white/40">
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

  if (authStep === "verify-registration" || authStep === "verify-2fa") {
    return (
      <AuthShell>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-white/90 mb-1">
            {authStep === "verify-registration" ? "Verify your email" : "Two-factor authentication"}
          </h2>
          <p className="text-sm text-white/40">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-white/60">{pendingEmail}</span>
          </p>
          <p className="text-xs text-white/20 mt-2">
            Check your spam folder if you don't see it.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-xs font-medium text-white/40">Verification Code</Label>
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
              className="text-center text-2xl tracking-[0.5em] font-mono bg-white/[0.03] border-white/[0.08]"
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
            className="text-sm text-white/30 hover:text-white/60 transition-colors inline-flex items-center gap-1"
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
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white/90 mb-1">
          {isRegister ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-[13px] text-white/35">
          {isRegister ? "Start your free trial today" : "Sign in to your inbox"}
        </p>
      </div>

      <div className="space-y-2.5 mb-5">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 text-sm font-medium h-11 rounded-xl transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.75)",
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
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.75)",
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

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-[11px] text-white/20 uppercase tracking-wider" style={{ background: "rgba(15,15,25,0.8)" }}>or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-white/40">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="bg-white/[0.03] border-white/[0.08] focus:border-white/[0.15] text-white placeholder:text-white/20"
            data-testid={isRegister ? "input-register-email" : "input-login-email"}
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-white/40">Password</Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={isRegister ? "Min. 8 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="pr-10 bg-white/[0.03] border-white/[0.08] focus:border-white/[0.15] text-white placeholder:text-white/20"
              data-testid={isRegister ? "input-register-password" : "input-login-password"}
            />
            <button
              type="button"
              className="absolute right-3 text-white/20 hover:text-white/50 transition-colors"
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
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-white/40">Confirm password</Label>
            <div className="relative flex items-center">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10 bg-white/[0.03] border-white/[0.08] focus:border-white/[0.15] text-white placeholder:text-white/20"
                data-testid="input-register-confirm-password"
              />
              <button
                type="button"
                className="absolute right-3 text-white/20 hover:text-white/50 transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                data-testid="button-toggle-confirm-password-visibility"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
          </div>
        )}

        <Button
          type="submit"
          className="w-full font-medium mt-1"
          disabled={isPending}
          data-testid={isRegister ? "button-register-submit" : "button-login-submit"}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isRegister ? "Start Free Trial" : "Sign In"}
          {!isPending && <ArrowRight className="ml-2 w-4 h-4" />}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-white/35">
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

      <p className="mt-5 text-[11px] text-center text-white/15 leading-relaxed">
        By {isRegister ? "creating an account" : "signing in"}, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-white/30 transition-colors">
          Terms
        </Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline hover:text-white/30 transition-colors">
          Privacy Policy
        </Link>
      </p>
    </AuthShell>
  );
}