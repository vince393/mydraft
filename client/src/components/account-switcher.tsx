import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Plus, Loader2, User, X, Crown, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LinkedAccount } from "@shared/schema";

interface AccountSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LinkedAccountsResponse {
  linkedAccounts: LinkedAccount[];
  currentUser: {
    id: string;
    email: string;
    displayName: string | null;
    plan: string | null;
  } | null;
}

export function AccountSwitcher({ open, onOpenChange }: AccountSwitcherProps) {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<LinkedAccountsResponse>({
    queryKey: ["/api/auth/linked-accounts"],
    enabled: open,
  });

  const switchAccountMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await apiRequest("POST", "/api/auth/switch-account", { targetUserId });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/linked-accounts"] });
      toast({
        title: "Account switched",
        description: `Now signed in as ${data.user.email}`,
      });
      onOpenChange(false);
      
      if (!data.user.onboardingCompleted) {
        setLocation("/onboarding");
      } else {
        setLocation("/inbox");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Switch failed",
        description: error.message || "Could not switch accounts",
        variant: "destructive",
      });
    },
  });

  const linkAccountMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/link-account", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/linked-accounts"] });
      toast({
        title: "Account linked",
        description: "You can now switch between accounts instantly.",
      });
      setShowAddAccount(false);
      setEmail("");
      setPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to link account",
        description: error.message || "Could not link account",
        variant: "destructive",
      });
    },
  });

  const removeAccountMutation = useMutation({
    mutationFn: async (linkedUserId: string) => {
      const response = await apiRequest("DELETE", `/api/auth/linked-accounts/${linkedUserId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/linked-accounts"] });
      toast({
        title: "Account removed",
        description: "Account has been unlinked.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove",
        description: error.message || "Could not remove account",
        variant: "destructive",
      });
    },
  });

  const handleLinkAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    linkAccountMutation.mutate({ email, password });
  };

  const getInitials = (email: string, displayName?: string | null) => {
    if (displayName) {
      return displayName.slice(0, 2).toUpperCase();
    }
    return email.split("@")[0].slice(0, 2).toUpperCase();
  };

  const getPlanBadge = (plan: string | null | undefined) => {
    if (!plan || plan === "free") return null;
    if (plan === "pro") {
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Crown className="w-3 h-3" />
          Pro
        </Badge>
      );
    }
    if (plan === "premium" || plan === "business") {
      return (
        <Badge variant="secondary" className="gap-1 text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
          <Sparkles className="w-3 h-3" />
          Business
        </Badge>
      );
    }
    return null;
  };

  const currentUser = data?.currentUser;
  const linkedAccounts = data?.linkedAccounts || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Account</DialogTitle>
          <DialogDescription>
            Switch between your linked accounts without signing in again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {currentUser && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current Account</p>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(currentUser.email, currentUser.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {currentUser.displayName || currentUser.email.split("@")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                    </div>
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                </div>
              )}

              {linkedAccounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Other Accounts</p>
                  <div className="space-y-1">
                    {linkedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="group flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer transition-all"
                        onClick={() => switchAccountMutation.mutate(account.linkedUserId)}
                        data-testid={`account-switch-${account.linkedUserId}`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {getInitials(account.linkedEmail, account.linkedDisplayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {account.linkedDisplayName || account.linkedEmail.split("@")[0]}
                            </p>
                            {getPlanBadge(account.linkedPlan)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{account.linkedEmail}</p>
                        </div>
                        {switchAccountMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAccountMutation.mutate(account.linkedUserId);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            data-testid={`account-remove-${account.linkedUserId}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {showAddAccount ? (
                <form onSubmit={handleLinkAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="link-email">Email</Label>
                    <Input
                      id="link-email"
                      type="email"
                      placeholder="other@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-link-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link-password">Password</Label>
                    <Input
                      id="link-password"
                      type="password"
                      placeholder="Account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-link-password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAddAccount(false);
                        setEmail("");
                        setPassword("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={linkAccountMutation.isPending || !email || !password}
                      data-testid="button-link-account-submit"
                    >
                      {linkAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Link Account
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowAddAccount(true)}
                  data-testid="button-add-account"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Account
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
