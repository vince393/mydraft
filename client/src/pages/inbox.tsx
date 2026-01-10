import { useState } from "react";
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
    <div className="flex h-screen">
      <div className="w-[400px] border-r border-border/50 flex-shrink-0 flex flex-col">
        <EmailList
          emails={emails}
          selectedEmailId={selectedEmail?.id ?? null}
          onSelectEmail={handleSelectEmail}
          isLoading={isLoadingEmails}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-end h-16 px-6 border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none" data-testid="button-profile">
                <div className="text-right">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">john@mailflow.com</p>
                </div>
                <Avatar className="w-9 h-9 ring-2 ring-border/30">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-medium">
                    JD
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-2" data-testid="menu-profile">
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
          <EmailDetail email={selectedEmail} />
        </div>
      </div>
    </div>
  );
}
