import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { AIDraftDialog } from "@/components/ai-draft-dialog";
import { ComposeDialog } from "@/components/compose-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, Mail, Crown } from "lucide-react";
import { SiGmail } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { NotificationBell } from "@/components/notification-bell";
import type { Email, Draft } from "@shared/schema";

interface EmailWithNylasId extends Email {
  nylasId?: string;
  to?: string[];
  cc?: string[];
}

interface InboxProps {
  activeFolder: string;
  showComposeDialog: boolean;
  setShowComposeDialog: (show: boolean) => void;
  composeMode: "new" | "reply" | "replyAll" | "forward";
  setComposeMode: (mode: "new" | "reply" | "replyAll" | "forward") => void;
}

function getEmailId(email: EmailWithNylasId): string | number {
  return email.nylasId || email.id;
}

export default function Inbox({ activeFolder, showComposeDialog, setShowComposeDialog, composeMode, setComposeMode }: InboxProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | number | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasPro } = usePlan();

  // Fetch current user info including connected email
  const { data: userData } = useQuery<{ user: { 
    email: string; 
    connectedEmail: string | null;
    connectedProvider: string | null;
    plan: string | null;
  } | null }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });
  
  const currentUserEmail = userData?.user?.connectedEmail || userData?.user?.email || "";
  const userEmail = userData?.user?.email || "";
  const userName = userEmail.split("@")[0] || "User";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const userPlan = userData?.user?.plan || "free";
  const connectedProvider = userData?.user?.connectedProvider;

  const getProviderIcon = () => {
    if (!connectedProvider) return null;
    const provider = connectedProvider.toLowerCase();
    if (provider === "google" || provider === "gmail") {
      return <SiGmail className="w-4 h-4 text-red-500" />;
    }
    if (provider === "microsoft" || provider === "outlook") {
      return <Mail className="w-4 h-4 text-blue-500" />;
    }
    return <Mail className="w-4 h-4 text-muted-foreground" />;
  };

  const getPlanBadge = () => {
    switch (userPlan) {
      case "business":
        return <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-[10px] px-1.5 py-0">Business</Badge>;
      case "pro":
        return <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 text-[10px] px-1.5 py-0">Pro</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>;
    }
  };

  // Fetch full email details when an email is selected
  const { data: selectedEmail, isLoading: isLoadingEmail } = useQuery<EmailWithNylasId>({
    queryKey: ["/api/emails", selectedEmailId],
    queryFn: async () => {
      if (!selectedEmailId) return null;
      const response = await fetch(`/api/emails/${selectedEmailId}`);
      if (!response.ok) throw new Error("Failed to fetch email");
      return response.json();
    },
    enabled: !!selectedEmailId,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const { data: emails = [], isLoading: isLoadingEmails, isFetching } = useQuery<EmailWithNylasId[]>({
    queryKey: ["/api/emails", activeFolder],
    queryFn: async () => {
      const response = await fetch(`/api/emails?folder=${activeFolder}`);
      if (!response.ok) throw new Error("Failed to fetch emails");
      return response.json();
    },
    enabled: !!userData?.user,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setSelectedEmailId(null);
    setGeneratedDraft(null);
  }, [activeFolder]);

  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: string | number) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/response-time", activeFolder] });
    },
  });


  const toggleStarMutation = useMutation({
    mutationFn: async (emailId: string | number) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/star`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
  });

  const moveEmailMutation = useMutation({
    mutationFn: async ({ emailId, folder }: { emailId: string | number; folder: string }) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/folder`, { folder });
      return response.json();
    },
    onSuccess: () => {
      setSelectedEmailId(null);
      setGeneratedDraft(null);
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/response-time", activeFolder] });
    },
  });

  const handleSelectEmail = (email: EmailWithNylasId) => {
    const emailId = getEmailId(email);
    setSelectedEmailId(emailId);
    setGeneratedDraft(null);
    if (!email.isRead) {
      markAsReadMutation.mutate(emailId);
    }
  };

  const handleAiReply = () => {
    if (selectedEmail) {
      if (!hasPro) {
        setShowUpgradeModal(true);
      } else {
        setShowAiDialog(true);
      }
    }
  };

  const handleDraftAccepted = (draft: Draft) => {
    setGeneratedDraft(draft);
    queryClient.invalidateQueries({ queryKey: ["/api/drafts", selectedEmail?.id] });
  };

  const handleTrashEmail = () => {
    if (selectedEmail) {
      moveEmailMutation.mutate({ emailId: getEmailId(selectedEmail), folder: "trash" });
    }
  };

  const handleArchiveEmail = () => {
    if (selectedEmail) {
      moveEmailMutation.mutate({ emailId: getEmailId(selectedEmail), folder: "archived" });
    }
  };

  const handleTrashMultipleEmails = async (emailIds: (string | number)[]) => {
    for (const id of emailIds) {
      await moveEmailMutation.mutateAsync({ emailId: id, folder: "trash" });
    }
  };

  const handleArchiveMultipleEmails = async (emailIds: (string | number)[]) => {
    for (const id of emailIds) {
      await moveEmailMutation.mutateAsync({ emailId: id, folder: "archived" });
    }
  };

  const handleTrashSingleEmail = (emailId: string | number) => {
    moveEmailMutation.mutate({ emailId, folder: "trash" });
  };

  const handleArchiveSingleEmail = (emailId: string | number) => {
    moveEmailMutation.mutate({ emailId, folder: "archived" });
  };

  const handleStarEmail = () => {
    if (selectedEmail) {
      toggleStarMutation.mutate(getEmailId(selectedEmail));
    }
  };

  // Check if email detail is fully loaded (has to/cc arrays from server)
  const isEmailDetailReady = selectedEmail && !isLoadingEmail && Array.isArray(selectedEmail.to);

  const handleReply = () => {
    if (isEmailDetailReady) {
      setComposeMode("reply");
      setShowComposeDialog(true);
    }
  };

  const handleReplyAll = () => {
    if (isEmailDetailReady) {
      setComposeMode("replyAll");
      setShowComposeDialog(true);
    }
  };

  const handleForward = () => {
    if (isEmailDetailReady) {
      setComposeMode("forward");
      setShowComposeDialog(true);
    }
  };

  // When dialog opens from sidebar (without reply/forward context), reset to new mode
  useEffect(() => {
    if (showComposeDialog && composeMode !== "new" && !selectedEmail) {
      setComposeMode("new");
    }
  }, [showComposeDialog, composeMode, selectedEmail]);

  // Memoize compose email to prevent unnecessary re-renders and reinitializations
  const composeEmail = useMemo(() => {
    if (!selectedEmail || composeMode === "new") return undefined;
    return {
      id: String(getEmailId(selectedEmail)),
      subject: selectedEmail.subject,
      from: selectedEmail.sender,
      fromEmail: selectedEmail.senderEmail,
      to: selectedEmail.to || [],
      cc: selectedEmail.cc || [],
      body: selectedEmail.body,
      date: new Date(selectedEmail.receivedAt),
    };
  }, [selectedEmail, composeMode]);

  return (
    <div className="flex h-screen">
      <div className="w-[360px] min-w-[360px] max-w-[360px] border-r border-border/50 flex-shrink-0 flex flex-col overflow-hidden">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmail?.id ?? null}
          onSelectEmail={handleSelectEmail}
          onAiReply={handleAiReply}
          onTrashEmail={handleTrashEmail}
          onArchiveEmail={handleArchiveEmail}
          onTrashMultipleEmails={handleTrashMultipleEmails}
          onArchiveMultipleEmails={handleArchiveMultipleEmails}
          onToggleStar={(emailId) => toggleStarMutation.mutate(emailId)}
          onTrashSingleEmail={handleTrashSingleEmail}
          onArchiveSingleEmail={handleArchiveSingleEmail}
          isAiLoading={false}
          isMoving={moveEmailMutation.isPending}
          isLoading={isLoadingEmails}
          activeFolder={activeFolder}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-end gap-2 h-14 px-6 border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:opacity-80 transition-opacity outline-none" data-testid="button-profile">
                <Avatar className="w-9 h-9 ring-2 ring-border/30">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-3 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-border/30">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  </div>
                </div>
                {currentUserEmail && (
                  <div className="flex items-center gap-2 mt-3 px-2 py-1.5 rounded-md bg-muted/50">
                    {getProviderIcon()}
                    <span className="text-xs text-muted-foreground truncate flex-1">{currentUserEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {getPlanBadge()}
                </div>
              </div>
              <DropdownMenuItem 
                className="gap-2 mt-1" 
                data-testid="menu-profile"
                onClick={() => setLocation("/profile")}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2" 
                data-testid="menu-settings"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 text-destructive" 
                data-testid="menu-logout"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 overflow-auto">
          <EmailDetail 
            email={selectedEmail ?? null} 
            generatedDraft={generatedDraft} 
            onClearDraft={() => setGeneratedDraft(null)}
            onDraftUpdate={(draft) => setGeneratedDraft(draft)}
            isLoading={isLoadingEmail}
            onArchive={handleArchiveEmail}
            onTrash={handleTrashEmail}
            onStar={handleStarEmail}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
          />
        </div>
      </div>

      <AIDraftDialog
        email={selectedEmail ?? null}
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        onDraftAccepted={handleDraftAccepted}
      />

      <ComposeDialog
        open={showComposeDialog}
        onOpenChange={setShowComposeDialog}
        mode={composeMode}
        originalEmail={composeEmail}
        currentUserEmail={currentUserEmail}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        requiredPlan="pro"
        feature="AI Draft Generator"
      />
    </div>
  );
}
