import { formatDistanceToNowStrict } from "date-fns";
import { Star, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { Email } from "@shared/schema";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: number | null;
  onSelectEmail: (email: Email) => void;
  isLoading?: boolean;
}

function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-xl animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-muted/50" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-28 bg-muted/50 rounded-full" />
                <div className="h-3 w-14 bg-muted/50 rounded-full" />
              </div>
              <div className="h-4 w-48 bg-muted/50 rounded-full" />
              <div className="h-3 w-full bg-muted/50 rounded-full" />
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
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/80 to-muted/30 flex items-center justify-center mb-6">
        <svg className="w-9 h-9 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-medium text-xl mb-2 tracking-tight">No emails yet</h3>
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input 
            type="search"
            placeholder="Search emails..." 
            className="pl-10 bg-muted/30 border-0 h-10 rounded-xl focus:bg-muted/50 transition-colors"
            data-testid="input-search"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="space-y-0.5 p-3">
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
                group relative p-4 rounded-xl cursor-pointer
                transition-all duration-200 ease-out
                ${isSelected 
                  ? "bg-primary/10 ring-1 ring-primary/30" 
                  : "hover:bg-muted/50"
                }
              `}
              data-testid={`email-item-${email.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-11 h-11 ring-2 ring-border/30">
                    <AvatarFallback 
                      style={{ backgroundColor: email.avatarColor }}
                      className="text-white text-sm font-medium"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!email.isRead && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm truncate ${!email.isRead ? "font-semibold" : "font-medium text-foreground/90"}`}>
                      {email.sender}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNowStrict(new Date(email.receivedAt))}
                    </span>
                  </div>
                  
                  <h4 className={`text-sm truncate mb-1.5 ${!email.isRead ? "font-medium" : "text-foreground/80"}`}>
                    {email.subject}
                  </h4>
                  
                  <p className="text-xs text-muted-foreground/80 line-clamp-1">
                    {email.preview}
                  </p>
                </div>

                <button 
                  className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${email.isStarred 
                      ? "opacity-100 text-yellow-400" 
                      : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400"
                    }
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
    </div>
  );
}
