import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, ArrowRight, LogOut, Mail, ArrowLeft } from "lucide-react";

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
    mutationFn: async (data: { email: string; password: string }) => {
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
    mutationFn: async (data: { email: string; type: string }) => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend code",
        description: error.message || "Could not send verification code",
        variant: "destructive",
      });
    },
  });

  const navigateAfterAuth = (user: AuthResponse["user"]) => {
    if (!user?.plan || user.plan === "free") {
      setLocation("/select-plan");
    } else if (!user?.onboardingCompleted) {
      setLocation("/onboarding");
    } else {
      setLocation("/inbox");
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
      registerMutation.mutate({ email, password });
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

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    setAuthStep("credentials");
    setPendingEmail("");
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;
  const isVerifying = verifyRegistrationMutation.isPending || verify2FAMutation.isPending;

  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back!</CardTitle>
            <CardDescription>
              You're signed in as {authData?.user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              Sign out to use a different account
            </Button>
            <div className="text-center pt-2">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authStep === "verify-registration" || authStep === "verify-2fa") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {authStep === "verify-registration" ? "Verify Your Email" : "Two-Factor Authentication"}
            </CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to<br />
              <span className="font-medium text-foreground">{pendingEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setVerificationCode(value);
                    if (errors.code) setErrors({});
                  }}
                  className="text-center text-2xl tracking-widest"
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

            <div className="mt-6 space-y-4">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            {isRegister ? "Create your account to get started" : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={isRegister ? "email" : "email"}
                data-testid={isRegister ? "input-register-email" : "input-login-email"}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative flex items-center">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isRegister ? "Create a password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  className="pr-10"
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative flex items-center">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
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
              className="w-full"
              disabled={isPending}
              data-testid={isRegister ? "button-register-submit" : "button-login-submit"}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="mt-4 text-xs text-center text-muted-foreground leading-relaxed">
            By {isRegister ? "creating an account" : "signing in"}, you agree to our{" "}
            <Link href="/legal/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            ,{" "}
            <Link href="/legal/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            , and{" "}
            <Link href="/legal/acceptable-use" className="underline hover:text-foreground transition-colors">
              Acceptable Use Policy
            </Link>
            .
          </p>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleToggleMode}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-auth-mode"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
