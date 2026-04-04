import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowLeft, ArrowRight, Mail, CheckCircle2, Shield, Lock, Globe } from "lucide-react";
import logoPath from "@assets/bd6ad8b0-8b19-4e70-8b55-0ddd333f446e_removalai_preview_1768612163407.png";

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const forgotMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      setEmailSent(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setEmailError("");
    forgotMutation.mutate({ email: trimmed });
  };

  if (emailSent) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold text-black/90 dark:text-white/90 mb-2">
            Check your email
          </h2>
          <p className="text-sm text-black/40 dark:text-white/40 mb-1">
            If an account exists for <span className="font-medium text-black/60 dark:text-white/60">{email}</span>, we've sent a password reset link.
          </p>
          <p className="text-xs text-black/20 dark:text-white/20 mb-6">
            The link will expire in 1 hour. Check your spam folder if you don't see it.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full gap-2" data-testid="button-back-to-login">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
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
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-[22px] font-semibold text-black/90 dark:text-white/90 mb-1.5 tracking-tight">
          Forgot your password?
        </h2>
        <p className="text-[13px] text-black/30 dark:text-white/30">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-black/35 dark:text-white/35">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
            autoComplete="email"
            autoFocus
            className="bg-black/[0.03] dark:bg-white/[0.03] border-black/[0.07] dark:border-white/[0.07] focus:border-black/[0.15] dark:focus:border-white/[0.15] text-white placeholder:text-black/15 dark:text-white/15 h-11"
            data-testid="input-forgot-email"
          />
          {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
        </div>

        <Button
          type="submit"
          className="w-full font-medium mt-1 h-11"
          disabled={forgotMutation.isPending}
          data-testid="button-forgot-submit"
        >
          {forgotMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Reset Link
          {!forgotMutation.isPending && <ArrowRight className="ml-2 w-4 h-4" />}
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
