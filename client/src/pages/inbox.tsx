import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import type { Email } from "@shared/schema";

export default function Inbox() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const { data: emails = [], isLoading: isLoadingEmails } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
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

  return (
    <div className="flex h-full">
      <div className="w-[400px] border-r border-border/50 flex-shrink-0">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmail?.id ?? null}
          onSelectEmail={handleSelectEmail}
          isLoading={isLoadingEmails}
        />
      </div>
      <div className="flex-1 min-w-0">
        <EmailDetail email={selectedEmail} />
      </div>
    </div>
  );
}
