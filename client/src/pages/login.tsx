import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, ArrowRight, LogOut, Mail, ArrowLeft, Sparkles, Zap, Shield, Clock, Building2, Globe } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import logoPath from "@assets/bd6ad8b0-8b19-4e70-8b55-0ddd333f446e_removalai_preview_1768612163407.png";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/20 ${className}`}>
    {children}
  </div>
);

interface AuthResponse {
  user: { id: string; email: string; plan?: string; onboardingCompleted?: boolean; emailVerified?: boolean; twoFactorEnabled?: boolean } | null;
}

type AuthStep = "credentials" | "verify-registration" | "verify-2fa";

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

  const features = [
    { icon: Sparkles, label: "AI-Powered Replies" },
    { icon: Zap, label: "Lightning Fast" },
    { icon: Shield, label: "Enterprise Security" },
    { icon: Globe, label: "50+ Languages" },
  ];

  const BackgroundDecor = () => (
    <>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(139,92,246,0.06),transparent)]" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:72px_72px]" />
    </>
  );

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <BackgroundDecor />
        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-8">
            <img src={logoPath} alt="MyDraft" className="h-8 w-auto mx-auto mb-8" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome back!</h2>
            <p className="text-muted-foreground text-sm">
              You're signed in as {authData?.user?.email}
            </p>
          </div>
          <GlassCard className="p-6">
            <div className="space-y-3">
              <Link href="/inbox">
                <Button className="w-full gap-2" data-testid="button-go-to-inbox">
                  Go to Inbox
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full gap-2 border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
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
          </GlassCard>
        </div>
      </div>
    );
  }

  if (authStep === "verify-registration" || authStep === "verify-2fa") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <BackgroundDecor />
        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-8">
            <img src={logoPath} alt="MyDraft" className="h-8 w-auto mx-auto mb-8" />
            <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {authStep === "verify-registration" ? "Verify Your Email" : "Two-Factor Authentication"}
            </h2>
            <p className="text-muted-foreground text-sm">
              We've sent a 6-digit code to<br />
              <span className="font-medium text-foreground">{pendingEmail}</span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              It may take a few minutes. Check your spam folder if needed.
            </p>
          </div>

          <GlassCard className="p-6">
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verification Code</Label>
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
                  className="text-center text-2xl tracking-[0.5em] h-14 font-mono bg-white/[0.03] border-white/10"
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
                Verify Email
              </Button>
            </form>
          </GlassCard>

          <div className="mt-6 space-y-3 text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCodeMutation.isPending}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
              data-testid="button-resend-code"
            >
              {resendCodeMutation.isPending ? "Sending..." : "Didn't receive a code? Resend"}
            </button>
            <div>
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to {authStep === "verify-registration" ? "sign up" : "sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <BackgroundDecor />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logoPath} alt="MyDraft" className="h-8 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isRegister ? "14-day free trial. No credit card required." : "Sign in to continue to your inbox"}
          </p>
        </div>

        <GlassCard className="p-6">
          <div className="space-y-3 mb-5">
            <Button
              variant="outline"
              className="w-full gap-3 text-sm font-medium border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
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
            </Button>
            <Button
              variant="outline"
              className="w-full gap-3 text-sm font-medium border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
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
            </Button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-3 text-muted-foreground/50 backdrop-blur-sm">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="bg-white/[0.03] border-white/10 focus:border-blue-500/40"
                data-testid={isRegister ? "input-register-email" : "input-login-email"}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
              <div className="relative flex items-center">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isRegister ? "Min. 8 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  className="pr-10 bg-white/[0.03] border-white/10 focus:border-blue-500/40"
                  data-testid={isRegister ? "input-register-password" : "input-login-password"}
                />
                <button
                  type="button"
                  className="absolute right-3 text-muted-foreground/50 hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">Confirm Password</Label>
                <div className="relative flex items-center">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10 bg-white/[0.03] border-white/10 focus:border-blue-500/40"
                    data-testid="input-register-confirm-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 text-muted-foreground/50 hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-password-visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={isPending}
              data-testid={isRegister ? "button-register-submit" : "button-login-submit"}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? "Start Free Trial" : "Sign In"}
              {!isPending && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>
        </GlassCard>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleToggleMode}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-auth-mode"
          >
            {isRegister ? (
              <>Already have an account? <span className="text-blue-400 font-medium">Sign in</span></>
            ) : (
              <>Don't have an account? <span className="text-blue-400 font-medium">Start free trial</span></>
            )}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <feature.icon className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-[11px] text-muted-foreground/40 whitespace-nowrap">{feature.label}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-[11px] text-center text-muted-foreground/40 leading-relaxed">
          By {isRegister ? "creating an account" : "signing in"}, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-muted-foreground transition-colors">
            Terms
          </Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-muted-foreground transition-colors">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
