import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Building2 } from "lucide-react";

export default function ConnectEmailPage() {
  const [, setLocation] = useLocation();

  const { data: nylasStatus, isLoading: statusLoading } = useQuery<{ connected: boolean; email?: string }>({
    queryKey: ["/api/nylas/status"],
    retry: false,
  });

  const { data: authUrlData, isLoading: authLoading } = useQuery<{ url: string; message?: string }>({
    queryKey: ["/api/nylas/auth-url"],
    retry: false,
  });

  const isConnected = nylasStatus?.connected ?? false;

  const handleConnect = () => {
    if (authUrlData?.url) {
      window.location.href = authUrlData.url;
    }
  };

  const handleContinue = () => {
    setLocation("/");
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              {isConnected ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Mail className="w-6 h-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl">
              {isConnected ? "Email Connected!" : "Connect Your Email"}
            </CardTitle>
            <CardDescription>
              {isConnected
                ? `Your email account is connected and ready to use.`
                : "Connect your email to start managing your inbox with AI-powered features."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    Connected as <span className="font-medium text-foreground">{nylasStatus?.email || "your account"}</span>
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleContinue}
                  data-testid="button-continue-to-inbox"
                >
                  Continue to Inbox
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 gap-3"
                    onClick={handleConnect}
                    disabled={authLoading || !authUrlData?.url}
                    data-testid="button-connect-google"
                  >
                    {authLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <SiGoogle className="w-5 h-5" />
                    )}
                    Connect with Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 gap-3"
                    onClick={handleConnect}
                    disabled={authLoading || !authUrlData?.url}
                    data-testid="button-connect-microsoft"
                  >
                    {authLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                    Connect with Microsoft
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleContinue}
                  data-testid="button-skip-connection"
                >
                  Skip for now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          We use secure OAuth to connect to your email. We never store your email password.
        </p>
      </div>
    </div>
  );
}
