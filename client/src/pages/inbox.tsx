import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { useToast } from "@/hooks/use-toast";
import type { Email, Draft } from "@shared/schema";

export default function Inbox() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const { toast } = useToast();

  const { data: emails = [], isLoading: isLoadingEmails } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const { data: draft, isLoading: isLoadingDraft } = useQuery<Draft | null>({
    queryKey: ["/api/drafts", selectedEmail?.id],
    queryFn: async () => {
      if (!selectedEmail) return null;
      const response = await fetch(`/api/drafts/${selectedEmail.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedEmail,
  });

  const generateDraftMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("POST", "/api/drafts/generate", { emailId });
      return response.json();
    },
    onSuccess: () => {
      if (selectedEmail) {
        queryClient.invalidateQueries({ queryKey: ["/api/drafts", selectedEmail.id] });
      }
      toast({
        title: "Draft generated",
        description: "AI has created a reply draft for your review.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Could not generate AI draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async ({ draftId, content }: { draftId: number; content: string }) => {
      const response = await apiRequest("PATCH", `/api/drafts/${draftId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      if (selectedEmail) {
        queryClient.invalidateQueries({ queryKey: ["/api/drafts", selectedEmail.id] });
      }
      toast({
        title: "Draft updated",
        description: "Your changes have been saved.",
      });
    },
  });

  const sendDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest("POST", `/api/drafts/${draftId}/send`, {});
      return response.json();
    },
    onSuccess: () => {
      if (selectedEmail) {
        queryClient.invalidateQueries({ queryKey: ["/api/drafts", selectedEmail.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      }
      toast({
        title: "Reply sent",
        description: "Your reply has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Send failed",
        description: "Could not send the reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
  });

  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      markAsReadMutation.mutate(email.id);
    }
  };

  const handleGenerateDraft = () => {
    if (selectedEmail) {
      generateDraftMutation.mutate(selectedEmail.id);
    }
  };

  const handleUpdateDraft = (content: string) => {
    if (draft) {
      updateDraftMutation.mutate({ draftId: draft.id, content });
    }
  };

  const handleSendDraft = () => {
    if (draft) {
      sendDraftMutation.mutate(draft.id);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-[380px] border-r border-border flex-shrink-0">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmail?.id ?? null}
          onSelectEmail={handleSelectEmail}
          isLoading={isLoadingEmails}
        />
      </div>
      <div className="flex-1 min-w-0">
        <EmailDetail
          email={selectedEmail}
          draft={draft ?? null}
          onGenerateDraft={handleGenerateDraft}
          onUpdateDraft={handleUpdateDraft}
          onSendDraft={handleSendDraft}
          isGenerating={generateDraftMutation.isPending}
          isSending={sendDraftMutation.isPending}
        />
      </div>
    </div>
  );
}
