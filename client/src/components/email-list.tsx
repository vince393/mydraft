import { formatDistanceToNow } from "date-fns";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Email } from "@shared/schema";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: number | null;
  onSelectEmail: (email: Email) => void;
  isLoading?: boolean;
}

function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-lg animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-12 bg-muted rounded" />
              </div>
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-medium text-lg mb-1">No emails yet</h3>
      <p className="text-sm text-muted-foreground">Your inbox is empty</p>
    </div>
  );
}

export function EmailList({ emails, selectedEmailId, onSelectEmail, isLoading }: EmailListProps) {
  if (isLoading) {
    return <EmailListSkeleton />;
  }

  if (emails.length === 0) {
    return <EmailListEmpty />;
  }

  return (
    <ScrollArea className="h-full scrollbar-thin">
      <div className="space-y-0.5 p-2">
        {emails.map((email) => {
          const isSelected = email.id === selectedEmailId;
          const initials = email.sender
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={`
                group relative p-4 rounded-lg cursor-pointer transition-colors duration-150
                ${isSelected 
                  ? "bg-sidebar-accent border-l-2 border-l-primary" 
                  : "hover-elevate border-l-2 border-l-transparent"
                }
              `}
              data-testid={`email-item-${email.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback 
                      style={{ backgroundColor: email.avatarColor }}
                      className="text-white text-sm font-medium"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!email.isRead && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${!email.isRead ? "font-semibold" : "font-medium"}`}>
                      {email.sender}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false })}
                    </span>
                  </div>
                  
                  <h4 className={`text-sm truncate mb-1 ${!email.isRead ? "font-medium" : "text-foreground"}`}>
                    {email.subject}
                  </h4>
                  
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {email.preview}
                  </p>
                </div>

                <button 
                  className={`
                    p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                    ${email.isStarred ? "opacity-100 text-yellow-400" : "text-muted-foreground"}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  data-testid={`star-email-${email.id}`}
                >
                  <Star className={`w-4 h-4 ${email.isStarred ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
