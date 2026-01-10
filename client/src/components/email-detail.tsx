import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  MoreHorizontal, 
  Star, 
  Archive, 
  Trash2,
  ChevronLeft,
  Sparkles,
  X
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Email, Draft } from "@shared/schema";

interface EmailDetailProps {
  email: Email | null;
  generatedDraft?: Draft | null;
  onClearDraft?: () => void;
}

function EmailDetailEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8">
        <svg className="w-10 h-10 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="font-medium text-2xl mb-3 tracking-tight">Select an email</h3>
      <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
        Choose an email from the list to view its contents
      </p>
    </div>
  );
}

export function EmailDetail({ email, generatedDraft, onClearDraft }: EmailDetailProps) {
  const [draftContent, setDraftContent] = useState("");

  const showDraft = !!generatedDraft;

  useEffect(() => {
    if (generatedDraft) {
      setDraftContent(generatedDraft.content);
    }
  }, [generatedDraft]);

  const handleCloseDraft = () => {
    setDraftContent("");
    onClearDraft?.();
  };

  if (!email) {
    return <EmailDetailEmpty />;
  }

  const initials = email.sender
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" className="lg:hidden" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-medium truncate pr-4 tracking-tight" data-testid="email-subject">
            {email.subject}
          </h1>
        </div>
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-archive">
            <Archive className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-trash">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-star">
            <Star className={`w-4 h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-more">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-8 max-w-3xl mx-auto">
          <div className="flex items-start gap-4 mb-8">
            <Avatar className="w-12 h-12 ring-2 ring-border/50">
              <AvatarFallback 
                style={{ backgroundColor: email.avatarColor }}
                className="text-white font-medium text-sm"
              >
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-base tracking-tight" data-testid="email-sender">
                    {email.sender}
                  </h2>
                  <p className="text-sm text-muted-foreground" data-testid="email-sender-address">
                    {email.senderEmail}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground whitespace-nowrap" data-testid="email-date">
                  {format(new Date(email.receivedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="space-y-4 mb-10"
            data-testid="email-body"
          >
            {email.body.split("\n").map((paragraph, i) => (
              <p key={i} className="text-foreground/90 leading-7 text-[15px]">
                {paragraph}
              </p>
            ))}
          </div>

          {showDraft && (
            <div className="mb-8 p-5 bg-muted/30 rounded-xl border border-border/40" data-testid="ai-draft-container">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AI Generated Reply</span>
                </div>
                <Button size="icon" variant="ghost" onClick={handleCloseDraft} data-testid="button-close-draft">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="min-h-[150px] bg-background/50 border-border/30 rounded-lg resize-none"
                placeholder="AI generated reply will appear here..."
                data-testid="textarea-draft"
              />
              <div className="flex items-center gap-2 mt-4">
                <Button variant="default" className="gap-2" data-testid="button-send-draft">
                  Send Reply
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-6 border-t border-border/50">
            <Button className="gap-2 px-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0" data-testid="button-reply">
              <Reply className="w-4 h-4" />
              Reply
            </Button>
            <Button variant="outline" className="gap-2" data-testid="button-reply-all">
              <ReplyAll className="w-4 h-4" />
              Reply All
            </Button>
            <Button variant="outline" className="gap-2" data-testid="button-forward">
              <Forward className="w-4 h-4" />
              Forward
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
