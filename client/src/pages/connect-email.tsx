import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, ArrowRight, CheckCircle, Building2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function ConnectEmailPage() {
  const [, setLocation] = useLocation();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [showImapForm, setShowImapForm] = useState(false);
  const [imapEmail, setImapEmail] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [imapError, setImapError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "email_in_use") {
      setOauthError("This email is already connected to another MyDraft account. Each email can only be linked to one account.");
    } else if (err === "auth_failed") {
      setOauthError("We couldn't connect that account. Please try again.");
    }
    if (err) {
      params.delete("error");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }
  }, []);

  const { data: emailStatus, isLoading: statusLoading } = useQuery<{ connected: boolean; email?: string; provider?: string }>({
    queryKey: ["/api/email/status"],
    retry: false,
  });

  const isConnected = emailStatus?.connected ?? false;

  useEffect(() => {
    if (isConnected && !statusLoading) {
      setLocation("/inbox");
    }
  }, [isConnected, statusLoading, setLocation]);

  useEffect(() => {
    if (!imapEmail || !imapEmail.includes("@")) {
      setDetectedProvider(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/email/detect-provider?email=${encodeURIComponent(imapEmail)}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.detected) {
          setDetectedProvider(data.name);
          setImapHost(data.imapHost);
          setImapPort(String(data.imapPort));
          setSmtpHost(data.smtpHost);
          setSmtpPort(String(data.smtpPort));
        } else {
          setDetectedProvider(null);
          if (!showAdvanced) setShowAdvanced(true);
        }
      } catch {
        setDetectedProvider(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [imapEmail]);

  const connectImapMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string | number> = { email: imapEmail, password: imapPassword };
      if (showAdvanced || !detectedProvider) {
        if (imapHost) body.imapHost = imapHost;
        if (imapPort) body.imapPort = parseInt(imapPort, 10);
        if (smtpHost) body.smtpHost = smtpHost;
        if (smtpPort) body.smtpPort = parseInt(smtpPort, 10);
      }
      const res = await apiRequest("POST", "/api/email/connect-imap", body);
      return res.json();
    },
    onSuccess: () => {
      setLocation("/inbox");
    },
    onError: (error: Error) => {
      setImapError(error.message || "Failed to connect. Check your credentials and try again.");
    },
  });

  const handleConnect = async (provider: 'google' | 'microsoft') => {
    setConnectingProvider(provider);
    try {
      const response = await fetch(`/api/email/auth-url?provider=${provider}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No auth URL returned:", data);
        setConnectingProvider(null);
      }
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      setConnectingProvider(null);
    }
  };

  const handleImapConnect = () => {
    setImapError(null);
    connectImapMutation.mutate();
  };

  const handleContinue = () => {
    setLocation("/inbox");
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg">
        <Card className="overflow-hidden">
          <CardHeader className="text-center p-4 sm:p-6">
            <div className="mx-auto mb-3 sm:mb-4 w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              {isConnected ? (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
              ) : (
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-lg sm:text-xl">
              {isConnected ? "Email Connected!" : "Connect Your Email"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isConnected
                ? `Your email account is connected and ready to use.`
                : "Connect your email to start managing your inbox with AI-powered features."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            {isConnected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    Connected as <span className="font-medium text-foreground">{emailStatus?.email || "your account"}</span>
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
              <div className="space-y-3">
                {oauthError && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-xs" data-testid="text-oauth-error">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{oauthError}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full h-12 gap-3"
                  onClick={() => handleConnect('google')}
                  disabled={connectingProvider !== null || connectImapMutation.isPending}
                  data-testid="button-connect-google"
                >
                  {connectingProvider === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <SiGoogle className="w-5 h-5" />
                  )}
                  Connect with Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 gap-3"
                  onClick={() => handleConnect('microsoft')}
                  disabled={connectingProvider !== null || connectImapMutation.isPending}
                  data-testid="button-connect-microsoft"
                >
                  {connectingProvider === 'microsoft' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                  Connect with Microsoft
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                {!showImapForm ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 gap-3"
                    onClick={() => setShowImapForm(true)}
                    disabled={connectingProvider !== null}
                    data-testid="button-show-imap"
                  >
                    <Mail className="w-5 h-5" />
                    Other Email (Yahoo, iCloud, AOL, etc.)
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-2">
                      <Label htmlFor="imap-email" className="text-sm">Email Address</Label>
                      <Input
                        id="imap-email"
                        type="email"
                        placeholder="you@yahoo.com"
                        value={imapEmail}
                        onChange={(e) => setImapEmail(e.target.value)}
                        disabled={connectImapMutation.isPending}
                        data-testid="input-imap-email"
                      />
                      {detectedProvider && (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {detectedProvider} detected — settings auto-filled
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imap-password" className="text-sm">Password or App Password</Label>
                      <Input
                        id="imap-password"
                        type="password"
                        placeholder="Enter your password"
                        value={imapPassword}
                        onChange={(e) => setImapPassword(e.target.value)}
                        disabled={connectImapMutation.isPending}
                        data-testid="input-imap-password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Some providers require an app-specific password. Check your provider's settings.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      data-testid="button-toggle-advanced"
                    >
                      {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Advanced Settings
                    </button>

                    {showAdvanced && (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">IMAP Server</Label>
                            <Input
                              placeholder="imap.example.com"
                              value={imapHost}
                              onChange={(e) => setImapHost(e.target.value)}
                              disabled={connectImapMutation.isPending}
                              data-testid="input-imap-host"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Port</Label>
                            <Input
                              placeholder="993"
                              value={imapPort}
                              onChange={(e) => setImapPort(e.target.value)}
                              disabled={connectImapMutation.isPending}
                              data-testid="input-imap-port"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">SMTP Server</Label>
                            <Input
                              placeholder="smtp.example.com"
                              value={smtpHost}
                              onChange={(e) => setSmtpHost(e.target.value)}
                              disabled={connectImapMutation.isPending}
                              data-testid="input-smtp-host"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Port</Label>
                            <Input
                              placeholder="465"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                              disabled={connectImapMutation.isPending}
                              data-testid="input-smtp-port"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {imapError && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-xs">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{imapError}</span>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleImapConnect}
                      disabled={!imapEmail || !imapPassword || connectImapMutation.isPending}
                      data-testid="button-connect-imap"
                    >
                      {connectImapMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing connection...
                        </>
                      ) : (
                        "Connect Email"
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => {
                        setShowImapForm(false);
                        setImapError(null);
                      }}
                      disabled={connectImapMutation.isPending}
                      data-testid="button-cancel-imap"
                    >
                      Back to options
                    </Button>
                  </div>
                )}

                {!showImapForm && (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={() => setLocation("/inbox")}
                      disabled={connectingProvider !== null}
                      data-testid="button-skip-connect"
                    >
                      Skip for now
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          We use secure OAuth for Google and Microsoft. For other providers, we use encrypted IMAP/SMTP connections.
        </p>
      </div>
    </div>
  );
}
