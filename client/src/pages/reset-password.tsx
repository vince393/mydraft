import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff, ArrowLeft, Lock, CheckCircle2, XCircle, Shield, Globe } from "lucide-react";
import logoPath from "@assets/mydraft_logo.png";

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

export default function ResetPasswordPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [resetComplete, setResetComplete] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: tokenValidation, isLoading: validatingToken } = useQuery<{ valid: boolean }>({
    queryKey: ["/api/auth/validate-reset-token", token],
    queryFn: async () => {
      const res = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", data);
      return response.json();
    },
    onSuccess: () => {
      setResetComplete(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message || "Could not reset password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!password || password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    resetMutation.mutate({ token, password });
  };

  if (!token || (!validatingToken && tokenValidation && !tokenValidation.valid)) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-black/90 dark:text-white/90 mb-2">
            Invalid or expired link
          </h2>
          <p className="text-sm text-black/40 dark:text-white/40 mb-6">
            This password reset link is no longer valid. Please request a new one.
          </p>
          <Link href="/login">
            <Button className="w-full gap-2" data-testid="button-back-to-login">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (validatingToken) {
    return (
      <AuthShell>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AuthShell>
    );
  }

  if (resetComplete) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold text-black/90 dark:text-white/90 mb-2">
            Password reset successful
          </h2>
          <p className="text-sm text-black/40 dark:text-white/40 mb-6">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Link href="/login">
            <Button className="w-full gap-2" data-testid="button-go-to-login">
              Sign In
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="text-center mb-7">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-[22px] font-semibold text-black/90 dark:text-white/90 mb-1.5 tracking-tight">
          Set a new password
        </h2>
        <p className="text-[13px] text-black/30 dark:text-white/30">
          Choose a strong password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-black/35 dark:text-white/35">New password</Label>
          <div className="relative flex items-center">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({}); }}
              autoComplete="new-password"
              autoFocus
              className="pr-10 bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.07] dark:border-white/[0.07] focus:border-black/[0.15] dark:focus:border-white/[0.15] text-white placeholder:text-black/15 dark:text-white/15 h-11"
              data-testid="input-new-password"
            />
            <button
              type="button"
              className="absolute right-3 text-black/15 dark:text-white/15 hover:text-black/40 dark:hover:text-white/40 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              data-testid="button-toggle-new-password-visibility"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-black/35 dark:text-white/35">Confirm new password</Label>
          <div className="relative flex items-center">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({}); }}
              autoComplete="new-password"
              className="pr-10 bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.07] dark:border-white/[0.07] focus:border-black/[0.15] dark:focus:border-white/[0.15] text-white placeholder:text-black/15 dark:text-white/15 h-11"
              data-testid="input-confirm-new-password"
            />
            <button
              type="button"
              className="absolute right-3 text-black/15 dark:text-white/15 hover:text-black/40 dark:hover:text-white/40 transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              data-testid="button-toggle-confirm-new-password-visibility"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
        </div>

        <Button
          type="submit"
          className="w-full font-medium mt-1 h-11"
          disabled={resetMutation.isPending}
          data-testid="button-reset-password-submit"
        >
          {resetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reset Password
        </Button>
      </form>

      <div className="mt-5">
        <Link href="/login">
          <button
            type="button"
            className="text-sm text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors inline-flex items-center gap-1"
            data-testid="button-back-to-login"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
        </Link>
      </div>
    </AuthShell>
  );
}
