import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { AIDraftDialog } from "@/components/ai-draft-dialog";
import { ComposeDialog } from "@/components/compose-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, PenSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Email, Draft } from "@shared/schema";

interface EmailWithNylasId extends Email {
  nylasId?: string;
  to?: string[];
  cc?: string[];
}

interface InboxProps {
  activeFolder: string;
}

function getEmailId(email: EmailWithNylasId): string | number {
  return email.nylasId || email.id;
}

export default function Inbox({ activeFolder }: InboxProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | number | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [composeMode, setComposeMode] = useState<"new" | "reply" | "replyAll" | "forward">("new");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch current user info including connected email
  const { data: userData } = useQuery<{ user: { email: string; connectedEmail: string | null } | null }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });
  
  const currentUserEmail = userData?.user?.connectedEmail || userData?.user?.email || "";

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

  const { data: emails = [], isLoading: isLoadingEmails } = useQuery<EmailWithNylasId[]>({
    queryKey: ["/api/emails", activeFolder],
    queryFn: async () => {
      const response = await fetch(`/api/emails?folder=${activeFolder}`);
      if (!response.ok) throw new Error("Failed to fetch emails");
      return response.json();
    },
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
      setShowAiDialog(true);
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

  const handleCompose = () => {
    setComposeMode("new");
    setShowComposeDialog(true);
  };

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
      <div className="w-[320px] border-r border-border/50 flex-shrink-0 flex flex-col">
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
          isAiLoading={false}
          isMoving={moveEmailMutation.isPending}
          isLoading={isLoadingEmails}
          activeFolder={activeFolder}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between h-14 px-6 border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
          <Button 
            onClick={handleCompose} 
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0"
            data-testid="button-compose"
          >
            <PenSquare className="w-4 h-4" />
            Compose
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:opacity-80 transition-opacity outline-none" data-testid="button-profile">
                <Avatar className="w-9 h-9 ring-2 ring-border/30">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-medium">
                    JD
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 border-b border-border/30">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">john@mailflow.com</p>
              </div>
              <DropdownMenuItem className="gap-2 mt-1" data-testid="menu-profile">
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
    </div>
  );
}
