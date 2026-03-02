import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiGoogle } from "react-icons/si";
import { Mail } from "lucide-react";
import { CheckCircle, LogOut, Loader2 } from "lucide-react";

interface EmailStatus {
  connected: boolean;
  email?: string;
  provider?: string;
}

export function ConnectionBanner() {
  const { data: status, isLoading } = useQuery<EmailStatus>({
    queryKey: ["/api/email/status"],
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/email/auth-url?provider=${provider}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Could not start connection");
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/email/disconnect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/emails", "fresh"], exact: true });
    },
  });

  if (isLoading) {
    return null;
  }

  if (status?.connected) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Connected to {status.email}</span>
          {status.provider && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted capitalize">
              {status.provider}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="h-7 text-xs"
          data-testid="button-disconnect"
        >
          {disconnectMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <LogOut className="h-3 w-3 mr-1" />
          )}
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Card className="m-4 p-4 bg-muted/30 border-dashed">
      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="font-medium">Connect Your Email</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Connect your Google or Microsoft account to view and manage your real emails.
        </p>
        <div className="flex gap-3 mt-2">
          <Button
            onClick={() => connectMutation.mutate("google")}
            disabled={connectMutation.isPending}
            className="gap-2"
            data-testid="button-connect-google"
          >
            {connectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SiGoogle className="h-4 w-4" />
            )}
            Connect Google
          </Button>
          <Button
            variant="outline"
            onClick={() => connectMutation.mutate("microsoft")}
            disabled={connectMutation.isPending}
            className="gap-2"
            data-testid="button-connect-microsoft"
          >
            {connectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Connect Microsoft
          </Button>
        </div>
      </div>
    </Card>
  );
}
