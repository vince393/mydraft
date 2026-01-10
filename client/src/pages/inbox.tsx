import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User } from "lucide-react";
import type { Email, Draft } from "@shared/schema";

interface InboxProps {
  activeFolder: string;
}

export default function Inbox({ activeFolder }: InboxProps) {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);

  const { data: emails = [], isLoading: isLoadingEmails } = useQuery<Email[]>({
    queryKey: ["/api/emails", activeFolder],
    queryFn: async () => {
      const response = await fetch(`/api/emails?folder=${activeFolder}`);
      if (!response.ok) throw new Error("Failed to fetch emails");
      return response.json();
    },
  });

  useEffect(() => {
    setSelectedEmail(null);
    setGeneratedDraft(null);
  }, [activeFolder]);

  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
  });

  const generateDraftMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("POST", "/api/drafts/generate", { emailId });
      return response.json();
    },
    onSuccess: (draft: Draft) => {
      setGeneratedDraft(draft);
      queryClient.invalidateQueries({ queryKey: ["/api/drafts", selectedEmail?.id] });
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/star`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
  });

  const moveEmailMutation = useMutation({
    mutationFn: async ({ emailId, folder }: { emailId: number; folder: string }) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/folder`, { folder });
      return response.json();
    },
    onSuccess: () => {
      setSelectedEmail(null);
      setGeneratedDraft(null);
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
  });

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    setGeneratedDraft(null);
    if (!email.isRead) {
      markAsReadMutation.mutate(email.id);
    }
  };

  const handleAiReply = () => {
    if (selectedEmail) {
      generateDraftMutation.mutate(selectedEmail.id);
    }
  };

  const handleTrashEmail = () => {
    if (selectedEmail) {
      moveEmailMutation.mutate({ emailId: selectedEmail.id, folder: "trash" });
    }
  };

  const handleArchiveEmail = () => {
    if (selectedEmail) {
      moveEmailMutation.mutate({ emailId: selectedEmail.id, folder: "archived" });
    }
  };

  const handleTrashMultipleEmails = async (emailIds: number[]) => {
    for (const id of emailIds) {
      await moveEmailMutation.mutateAsync({ emailId: id, folder: "trash" });
    }
  };

  const handleArchiveMultipleEmails = async (emailIds: number[]) => {
    for (const id of emailIds) {
      await moveEmailMutation.mutateAsync({ emailId: id, folder: "archived" });
    }
  };

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
          isAiLoading={generateDraftMutation.isPending}
          isMoving={moveEmailMutation.isPending}
          isLoading={isLoadingEmails}
          activeFolder={activeFolder}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-end h-14 px-6 border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
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
              <DropdownMenuItem className="gap-2" data-testid="menu-settings">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive" data-testid="menu-logout">
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 overflow-auto">
          <EmailDetail email={selectedEmail} generatedDraft={generatedDraft} onClearDraft={() => setGeneratedDraft(null)} />
        </div>
      </div>
    </div>
  );
}
