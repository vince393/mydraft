import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, ArrowRight, LogOut, Mail, ArrowLeft, Sparkles, Zap, Shield, Clock, Building2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import logoPath from "@assets/bd6ad8b0-8b19-4e70-8b55-0ddd333f446e_removalai_preview_1768612163407.png";

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
    {
      icon: Sparkles,
      title: "AI-Powered Replies",
      description: "Draft perfect responses in seconds with intelligent AI assistance"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process your inbox 10x faster with smart automation"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption keeps your emails safe and private"
    },
    {
      icon: Clock,
      title: "Save 2+ Hours Daily",
      description: "Reclaim your time with automated inbox management"
    }
  ];

  // Hero section component
  const HeroSection = () => (
    <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
        {/* Logo */}
        <div className="mb-12">
          <img src={logoPath} alt="MyDraft" className="h-10 w-auto" />
        </div>
        
        {/* Main headline */}
        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
          Your inbox,{" "}
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            reimagined
          </span>
        </h1>
        
        <p className="text-lg xl:text-xl text-slate-300 mb-12 max-w-lg leading-relaxed">
          Stop drowning in emails. Let AI handle the heavy lifting while you focus on what matters most.
        </p>
        
        {/* Feature list */}
        <div className="space-y-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="flex items-start gap-4 group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
                <feature.icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex">
        <HeroSection />
        <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="lg:hidden mb-8">
                <img src={logoPath} alt="MyDraft" className="h-8 w-auto mx-auto" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome back!</h2>
              <p className="text-muted-foreground">
                You're signed in as {authData?.user?.email}
              </p>
            </div>
            <div className="space-y-4">
              <Link href="/inbox">
                <Button className="w-full gap-2 h-12 text-base" data-testid="button-go-to-inbox">
                  Go to Inbox
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full gap-2 h-12"
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
          </div>
        </div>
      </div>
    );
  }

  if (authStep === "verify-registration" || authStep === "verify-2fa") {
    return (
      <div className="min-h-screen flex">
        <HeroSection />
        <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 text-center">
              <img src={logoPath} alt="MyDraft" className="h-8 w-auto mx-auto" />
            </div>
            
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {authStep === "verify-registration" ? "Verify Your Email" : "Two-Factor Authentication"}
              </h2>
              <p className="text-muted-foreground">
                We've sent a 6-digit code to<br />
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                It may take a few minutes to arrive. Check your spam folder if you don't see it.
              </p>
            </div>
            
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">Verification Code</Label>
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
                  className="text-center text-2xl tracking-[0.5em] h-14 font-mono"
                  autoFocus
                  data-testid="input-verification-code"
                />
                {errors.code && <p className="text-sm text-destructive text-center">{errors.code}</p>}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base"
                disabled={isVerifying || verificationCode.length !== 6}
                data-testid="button-verify-code"
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>
            </form>

            <div className="mt-8 space-y-4">
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCodeMutation.isPending}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                  data-testid="button-resend-code"
                >
                  {resendCodeMutation.isPending ? "Sending..." : "Didn't receive a code? Resend"}
                </button>
              </div>
              
              <div className="text-center">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <HeroSection />
      
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img src={logoPath} alt="MyDraft" className="h-8 w-auto mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isRegister ? "Start your free trial" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isRegister ? "No credit card required" : "Sign in to continue to your inbox"}
            </p>
          </div>
          
          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground">
              {isRegister ? "Start your 14-day free trial. No credit card required." : "Sign in to continue to your inbox"}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-sm font-medium"
              onClick={() => handleOAuthLogin('google')}
              disabled={oauthConnecting !== null || isPending}
              data-testid="button-oauth-google"
            >
              {oauthConnecting === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SiGoogle className="w-4 h-4" />
              )}
              {isRegister ? "Sign up with Google" : "Continue with Google"}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-sm font-medium"
              onClick={() => handleOAuthLogin('microsoft')}
              disabled={oauthConnecting !== null || isPending}
              data-testid="button-oauth-microsoft"
            >
              {oauthConnecting === 'microsoft' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
              {isRegister ? "Sign up with Microsoft" : "Continue with Microsoft"}
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={isRegister ? "email" : "email"}
                className="h-12"
                data-testid={isRegister ? "input-register-email" : "input-login-email"}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative flex items-center">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isRegister ? "Create a strong password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  className="pr-10 h-12"
                  data-testid={isRegister ? "input-register-password" : "input-login-password"}
                />
                <button
                  type="button"
                  className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password-visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                <div className="relative flex items-center">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10 h-12"
                    data-testid="input-register-confirm-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-password-visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium"
              disabled={isPending}
              data-testid={isRegister ? "button-register-submit" : "button-login-submit"}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? "Start Free Trial" : "Sign In"}
              {!isPending && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleToggleMode}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-auth-mode"
            >
              {isRegister ? (
                <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-primary font-medium">Start free trial</span></>
              )}
            </button>
          </div>

          <p className="mt-8 text-xs text-center text-muted-foreground leading-relaxed">
            By {isRegister ? "creating an account" : "signing in"}, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
          
          {/* Mobile features preview */}
          <div className="lg:hidden mt-12 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-4">Why professionals choose MyDraft</p>
            <div className="grid grid-cols-2 gap-4">
              {features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <feature.icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{feature.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
