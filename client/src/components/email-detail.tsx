import { format } from "date-fns";
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  MoreHorizontal, 
  Star, 
  Archive, 
  Trash2,
  Search,
  Flag
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AIDraftReply } from "./ai-draft-reply";
import type { Email, Draft } from "@shared/schema";

interface EmailDetailProps {
  email: Email | null;
  draft: Draft | null;
  onGenerateDraft: () => void;
  onUpdateDraft: (content: string) => void;
  onSendDraft: () => void;
  isGenerating?: boolean;
  isSending?: boolean;
}

function EmailDetailEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="font-medium text-xl mb-2">Select an email</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Choose an email from the list to view its contents and generate an AI-powered reply
      </p>
    </div>
  );
}

export function EmailDetail({ 
  email, 
  draft, 
  onGenerateDraft, 
  onUpdateDraft, 
  onSendDraft,
  isGenerating,
  isSending 
}: EmailDetailProps) {
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
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold truncate pr-4" data-testid="email-subject">
          {email.subject}
        </h1>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-archive">
                <Archive className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-trash">
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-star">
                <Star className={`w-4 h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Star</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-flag">
                <Flag className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Flag</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-more">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>More</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarFallback 
                style={{ backgroundColor: email.avatarColor }}
                className="text-white font-medium"
              >
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-base" data-testid="email-sender">
                    {email.sender}
                  </h2>
                  <p className="text-sm text-muted-foreground" data-testid="email-sender-address">
                    {email.senderEmail}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground" data-testid="email-date">
                    {format(new Date(email.receivedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <Search className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div 
            className="prose prose-invert prose-sm max-w-none mb-8"
            data-testid="email-body"
          >
            {email.body.split("\n").map((paragraph, i) => (
              <p key={i} className="text-foreground leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-8">
            <Button variant="default" className="gap-2" data-testid="button-reply">
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

          <Separator className="mb-8" />

          <AIDraftReply
            draft={draft}
            onGenerate={onGenerateDraft}
            onUpdate={onUpdateDraft}
            onSend={onSendDraft}
            isGenerating={isGenerating}
            isSending={isSending}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
