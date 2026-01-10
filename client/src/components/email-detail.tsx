import { useState, useEffect } from "react";
import { format, isToday, isYesterday, addHours, addDays, setHours, setMinutes, startOfTomorrow } from "date-fns";
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
  X,
  Clock,
  Calendar,
  ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email, Draft } from "@shared/schema";

interface EmailDetailProps {
  email: Email | null;
  generatedDraft?: Draft | null;
  onClearDraft?: () => void;
}

function EmailDetailEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 -mt-24">
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
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const { toast } = useToast();

  const showDraft = !!generatedDraft;

  useEffect(() => {
    if (generatedDraft) {
      setDraftContent(generatedDraft.content);
    }
  }, [generatedDraft]);

  const scheduleMutation = useMutation({
    mutationFn: async ({ draftId, scheduledAt }: { draftId: number; scheduledAt: Date }) => {
      const response = await apiRequest("POST", `/api/drafts/${draftId}/schedule`, { scheduledAt: scheduledAt.toISOString() });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Email Scheduled",
        description: `Your reply will be sent ${format(new Date(data.draft.scheduledAt), "MMM d 'at' h:mm a")}`,
      });
      setShowSchedulePicker(false);
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
    },
    onError: () => {
      toast({
        title: "Failed to schedule",
        description: "Could not schedule your email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: async (draftId: number) => {
      const response = await apiRequest("POST", `/api/drafts/${draftId}/cancel-schedule`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule Cancelled",
        description: "Your email is back to draft status.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
    },
  });

  const handleScheduleQuickOption = (scheduledAt: Date) => {
    if (generatedDraft) {
      scheduleMutation.mutate({ draftId: generatedDraft.id, scheduledAt });
    }
  };

  const handleScheduleCustom = () => {
    if (!customDate || !customTime || !generatedDraft) return;
    const [hours, minutes] = customTime.split(":").map(Number);
    const scheduledAt = setMinutes(setHours(new Date(customDate), hours), minutes);
    if (scheduledAt <= new Date()) {
      toast({
        title: "Invalid time",
        description: "Please select a future date and time.",
        variant: "destructive",
      });
      return;
    }
    scheduleMutation.mutate({ draftId: generatedDraft.id, scheduledAt });
  };

  const handleCloseDraft = () => {
    setDraftContent("");
    setShowSchedulePicker(false);
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

  const formatSmartDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMM d");
    }
  };

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
        <div className="pl-6 pr-8 pt-4 pb-8">
          <div className="flex items-start gap-3 mb-5">
            <Avatar className="w-8 h-8 ring-1 ring-border/40">
              <AvatarFallback 
                style={{ backgroundColor: email.avatarColor }}
                className="text-white font-medium text-xs"
              >
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-sm tracking-tight" data-testid="email-sender">
                  {email.sender}
                </h2>
                <span className="text-xs text-muted-foreground" data-testid="email-date">
                  {formatSmartDate(new Date(email.receivedAt))}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground" data-testid="email-sender-address">
                {email.senderEmail}
              </p>
            </div>
          </div>

          <div 
            className="mb-8"
            data-testid="email-body"
          >
            {email.body.split("\n").map((paragraph, i) => (
              paragraph.trim() ? (
                <p key={i} className="text-foreground/90 leading-relaxed text-[15px] mb-4">
                  {paragraph}
                </p>
              ) : null
            ))}
          </div>

          {showDraft && (
            <div className="mb-8 p-5 bg-muted/30 rounded-xl border border-border/40" data-testid="ai-draft-container">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {generatedDraft.status === "scheduled" ? "Scheduled Reply" : "AI Generated Reply"}
                  </span>
                  {generatedDraft.status === "scheduled" && generatedDraft.scheduledAt && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(new Date(generatedDraft.scheduledAt), "MMM d 'at' h:mm a")}
                    </span>
                  )}
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
                disabled={generatedDraft.status === "scheduled"}
                data-testid="textarea-draft"
              />
              <div className="flex items-center gap-2 mt-4">
                {generatedDraft.status === "scheduled" ? (
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    onClick={() => cancelScheduleMutation.mutate(generatedDraft.id)}
                    disabled={cancelScheduleMutation.isPending}
                    data-testid="button-cancel-schedule"
                  >
                    <X className="w-4 h-4" />
                    Cancel Schedule
                  </Button>
                ) : (
                  <>
                    <Button variant="default" className="gap-2" data-testid="button-send-draft">
                      Send Reply
                    </Button>
                    <Popover open={showSchedulePicker} onOpenChange={setShowSchedulePicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2" data-testid="button-send-later">
                          <Clock className="w-4 h-4" />
                          Send Later
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <div className="p-3 border-b border-border/50">
                          <p className="text-sm font-medium mb-2">Schedule Send</p>
                          <div className="space-y-1">
                            <button
                              onClick={() => handleScheduleQuickOption(addHours(new Date(), 1))}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
                              data-testid="schedule-1-hour"
                            >
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              In 1 hour
                            </button>
                            <button
                              onClick={() => handleScheduleQuickOption(addHours(new Date(), 4))}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
                              data-testid="schedule-4-hours"
                            >
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              In 4 hours
                            </button>
                            <button
                              onClick={() => handleScheduleQuickOption(setHours(setMinutes(startOfTomorrow(), 0), 8))}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
                              data-testid="schedule-tomorrow-morning"
                            >
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              Tomorrow morning (8:00 AM)
                            </button>
                            <button
                              onClick={() => handleScheduleQuickOption(addDays(setHours(setMinutes(new Date(), 0), 9), 1))}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
                              data-testid="schedule-tomorrow-9am"
                            >
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              Tomorrow 9:00 AM
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium mb-2">Custom Date & Time</p>
                          <div className="flex gap-2 mb-2">
                            <Input
                              type="date"
                              value={customDate}
                              onChange={(e) => setCustomDate(e.target.value)}
                              min={format(new Date(), "yyyy-MM-dd")}
                              className="flex-1"
                              data-testid="input-schedule-date"
                            />
                            <Input
                              type="time"
                              value={customTime}
                              onChange={(e) => setCustomTime(e.target.value)}
                              className="w-28"
                              data-testid="input-schedule-time"
                            />
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full gap-2"
                            onClick={handleScheduleCustom}
                            disabled={!customDate || !customTime || scheduleMutation.isPending}
                            data-testid="button-schedule-custom"
                          >
                            <Clock className="w-4 h-4" />
                            Schedule
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-6 border-t border-border/50">
            <Button className="gap-2 px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0" data-testid="button-reply">
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
