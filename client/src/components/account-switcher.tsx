import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Plus, Loader2, X, Crown, Sparkles, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getDeviceAccounts, removeDeviceAccount, type DeviceAccount } from "@/lib/device-accounts";

interface AccountSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuthResponse {
  user: { id: string; email: string; plan?: string; onboardingCompleted?: boolean } | null;
}

export function AccountSwitcher({ open, onOpenChange }: AccountSwitcherProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deviceAccounts, setDeviceAccounts] = useState<DeviceAccount[]>([]);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const currentUserId = authData?.user?.id;

  useEffect(() => {
    if (open) {
      setDeviceAccounts(getDeviceAccounts());
    }
  }, [open]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
  });

  const handleSwitchAccount = async (account: DeviceAccount) => {
    setSwitchingTo(account.userId);
    try {
      await logoutMutation.mutateAsync();
      queryClient.clear();
      onOpenChange(false);
      setLocation(`/login?switch=${encodeURIComponent(account.email)}`);
    } catch {
      toast({
        title: "Switch failed",
        description: "Could not sign out of current account.",
        variant: "destructive",
      });
      setSwitchingTo(null);
    }
  };

  const handleAddAccount = async () => {
    try {
      await logoutMutation.mutateAsync();
      queryClient.clear();
      onOpenChange(false);
      setLocation("/login");
    } catch {
      toast({
        title: "Could not sign out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAccount = (userId: string) => {
    removeDeviceAccount(userId);
    setDeviceAccounts(getDeviceAccounts());
    toast({ title: "Account removed from this device" });
  };

  const getInitials = (email: string, displayName?: string | null) => {
    if (displayName) return displayName.slice(0, 2).toUpperCase();
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

  const currentAccount = deviceAccounts.find((a) => a.userId === currentUserId);
  const otherAccounts = deviceAccounts.filter((a) => a.userId !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Account</DialogTitle>
          <DialogDescription>
            Accounts you've signed into on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentAccount && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current Account</p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(currentAccount.email, currentAccount.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {currentAccount.displayName || currentAccount.email.split("@")[0]}
                    </p>
                    {getPlanBadge(currentAccount.plan)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{currentAccount.email}</p>
                </div>
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
              </div>
            </div>
          )}

          {otherAccounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Other Accounts on This Device</p>
              <div className="space-y-1">
                {otherAccounts.map((account) => (
                  <div
                    key={account.userId}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                    onClick={() => handleSwitchAccount(account)}
                    data-testid={`account-switch-${account.userId}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {getInitials(account.email, account.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {account.displayName || account.email.split("@")[0]}
                        </p>
                        {getPlanBadge(account.plan)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                    </div>
                    {switchingTo === account.userId ? (
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAccount(account.userId);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                        data-testid={`account-remove-${account.userId}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground/60 text-center py-2">
              No other accounts on this device yet. Sign into another account to see it here.
            </p>
          )}

          <Separator />

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleAddAccount}
            disabled={logoutMutation.isPending}
            data-testid="button-add-account"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Sign into Another Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
