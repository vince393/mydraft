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
  ChevronUp,
  Sparkles,
  X,
  Clock,
  Calendar,
  ChevronDown,
  Languages,
  Loader2,
  StickyNote,
  FileText,
  Circle,
  ArrowRight,
  Paperclip,
  Download,
  Image as ImageIcon,
  File
} from "lucide-react";
import { EmailNotePanel } from "./email-note";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/avatar";
import { formatEmailBody } from "@/lib/email-formatter";
import type { Email, Draft } from "@shared/schema";

interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

interface ExtendedEmail extends Email {
  nylasId?: string;
  to?: string[];
  cc?: string[];
  attachments?: EmailAttachment[];
}

interface EmailDetailProps {
  email: Email | null;
  threadEmails?: ExtendedEmail[];
  generatedDraft?: Draft | null;
  onClearDraft?: () => void;
  onDraftUpdate?: (draft: Draft) => void;
  isLoading?: boolean;
  onArchive?: () => void;
  onTrash?: () => void;
  onStar?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onAiDraft?: () => void;
  hasPro?: boolean;
  onUpgradeNeeded?: () => void;
}

function EmailDetailEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 -mt-16">
      <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="font-medium text-lg mb-1.5 tracking-tight">Select an email</h3>
      <p className="text-sm text-muted-foreground/60 max-w-[260px] leading-relaxed">
        Choose an email from the list to view its contents
      </p>
    </div>
  );
}

export function EmailDetail({ email, threadEmails = [], generatedDraft, onClearDraft, onDraftUpdate, isLoading, onArchive, onTrash, onStar, onReply, onReplyAll, onForward, onAiDraft, hasPro, onUpgradeNeeded }: EmailDetailProps) {
  const [draftContent, setDraftContent] = useState("");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [showFormatted, setShowFormatted] = useState(true);
  const [formattedBody, setFormattedBody] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<{ code: string; name: string; isEnglish: boolean } | null>(null);
  const [translatedContent, setTranslatedContent] = useState<{ subject: string; body: string } | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [expandedThreadEmails, setExpandedThreadEmails] = useState<Set<string | number>>(new Set());
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [displayedSummary, setDisplayedSummary] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const emailId = email ? ((email as any).nylasId || email.id) : null;
  
  const summaryMutation = useMutation({
    mutationFn: async ({ id, subject, body }: { id: string | number; subject: string; body: string }) => {
      const res = await apiRequest("POST", `/api/emails/${id}/summary`, { subject, body });
      return res.json();
    },
  });

  // Reset summary state when email changes
  useEffect(() => {
    summaryMutation.reset();
    setShowSummary(false);
    setDisplayedSummary("");
    setIsTyping(false);
  }, [emailId]);

  const summaryData = summaryMutation.data as { summary: string; keyPoints: string[]; actionItems: string[] } | undefined;
  const isSummaryLoading = summaryMutation.isPending;

  // Typewriter effect for summary
  useEffect(() => {
    if (summaryData?.summary && showSummary) {
      const fullText = summaryData.summary;
      if (displayedSummary === fullText) return; // Already typed
      
      setIsTyping(true);
      setDisplayedSummary("");
      
      let index = 0;
      const speed = 8; // ms per character (fast but visible)
      
      const typeInterval = setInterval(() => {
        if (index < fullText.length) {
          setDisplayedSummary(fullText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, speed);
      
      return () => clearInterval(typeInterval);
    }
  }, [summaryData?.summary, showSummary]);

  const handleSummarize = () => {
    if (!hasPro) {
      onUpgradeNeeded?.();
      return;
    }
    if (emailId && email?.body && !summaryMutation.data) {
      summaryMutation.mutate({ id: emailId, subject: email.subject, body: email.body });
    }
    setShowSummary(true);
  };

  const handleAiDraftClick = () => {
    if (!hasPro) {
      onUpgradeNeeded?.();
      return;
    }
    onAiDraft?.();
  };
  
  // Get the selected email's ID and date for comparison
  const selectedEmailId = email ? ((email as any).nylasId || email.id) : null;
  const selectedEmailDate = email ? new Date(email.receivedAt).getTime() : 0;
  
  // Sort thread emails by date (oldest first for thread display)
  const sortedThreadEmails = [...threadEmails].sort((a, b) => 
    new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
  );
  
  // Get emails older than the selected email
  const olderEmails = sortedThreadEmails.filter(e => {
    const emailId = (e as any).nylasId || e.id;
    const emailDate = new Date(e.receivedAt).getTime();
    return emailId !== selectedEmailId && emailDate < selectedEmailDate;
  });
  
  // Get emails newer than the selected email (for showing "more messages in thread")
  const newerEmails = sortedThreadEmails.filter(e => {
    const emailId = (e as any).nylasId || e.id;
    const emailDate = new Date(e.receivedAt).getTime();
    return emailId !== selectedEmailId && emailDate > selectedEmailDate;
  });
  
  const hasThread = threadEmails.length > 1;
  const hasNewerMessages = newerEmails.length > 0;
  
  const toggleThreadEmail = (emailId: string | number) => {
    setExpandedThreadEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const showDraft = !!generatedDraft;

  useEffect(() => {
    if (generatedDraft) {
      setDraftContent(generatedDraft.content);
    }
  }, [generatedDraft]);

  useEffect(() => {
    setFormattedBody(null);
    setDetectedLanguage(null);
    setTranslatedContent(null);
    setShowTranslated(false);
  }, [email?.id]);

  // Instant client-side formatting (no API call needed)
  useEffect(() => {
    if (email && showFormatted && !formattedBody) {
      // Format instantly on client side
      const formatted = formatEmailBody(email.body);
      setFormattedBody(formatted);
    }
  }, [email?.id, showFormatted, formattedBody]);

  const detectLanguageMutation = useMutation({
    mutationFn: async ({ emailId, subject, body }: { emailId: string | number; subject: string; body: string }) => {
      const response = await apiRequest("POST", `/api/emails/${emailId}/detect-language`, { subject, body });
      return response.json();
    },
    onSuccess: (data) => {
      setDetectedLanguage({
        code: data.languageCode,
        name: data.languageName,
        isEnglish: data.isEnglish
      });
    },
    onError: () => {
      setDetectedLanguage({ code: "en", name: "English", isEnglish: true });
    },
  });

  const translateMutation = useMutation({
    mutationFn: async ({ emailId, subject, body, sourceLanguage }: { emailId: string | number; subject: string; body: string; sourceLanguage: string }) => {
      const response = await apiRequest("POST", `/api/emails/${emailId}/translate`, { subject, body, sourceLanguage });
      return response.json();
    },
    onSuccess: (data) => {
      setTranslatedContent({
        subject: data.translatedSubject,
        body: data.translatedBody
      });
      setShowTranslated(true);
    },
    onError: () => {
      toast({
        title: "Translation failed",
        description: "Could not translate this email. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (email && !detectedLanguage && !detectLanguageMutation.isPending) {
      const emailId = (email as any).nylasId || email.id;
      detectLanguageMutation.mutate({ emailId, subject: email.subject, body: email.body });
    }
  }, [email?.id, detectedLanguage]);

  const handleTranslate = () => {
    if (!email || !detectedLanguage) return;
    const emailId = (email as any).nylasId || email.id;
    translateMutation.mutate({ 
      emailId, 
      subject: email.subject, 
      body: email.body, 
      sourceLanguage: detectedLanguage.name 
    });
  };

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
      onDraftUpdate?.(data.draft);
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
    onSuccess: (data) => {
      toast({
        title: "Schedule Cancelled",
        description: "Your email is back to draft status.",
      });
      onDraftUpdate?.(data.draft);
    },
    onError: () => {
      toast({
        title: "Failed to cancel",
        description: "Could not cancel the scheduled email. Please try again.",
        variant: "destructive",
      });
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
    setRefineInput("");
    onClearDraft?.();
  };

  const handleRefine = async (instruction?: string) => {
    const refineText = instruction || refineInput.trim();
    if (!refineText || !draftContent.trim()) return;
    setIsRefining(true);
    try {
      const response = await apiRequest("POST", "/api/ai/refine", {
        text: draftContent,
        instruction: refineText,
        originalEmail: email ? {
          sender: email.sender,
          senderEmail: (email as any).senderEmail || email.sender,
          subject: email.subject,
          preview: (email as any).preview || "",
        } : undefined,
      });
      const data = await response.json();
      setDraftContent(data.refined || data.refinedText);
      setRefineInput("");
      toast({
        title: "Draft refined",
        description: "Your draft has been updated based on your instructions.",
      });
    } catch {
      toast({
        title: "Refinement failed",
        description: "Could not refine the draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateImage = async () => {
    if (!hasPro) {
      onUpgradeNeeded?.();
      return;
    }
    if (!draftContent.trim()) {
      toast({
        title: "No content",
        description: "Write some content first to generate a related image.",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingImage(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-image", {
        context: draftContent,
        emailSubject: email?.subject || "",
      });
      const data = await response.json();
      if (data.imageUrl) {
        // Append image markdown to draft
        setDraftContent(prev => prev + `\n\n![Generated Image](${data.imageUrl})`);
        toast({
          title: "Image generated",
          description: "Image has been added to your draft.",
        });
      }
    } catch {
      toast({
        title: "Image generation failed",
        description: "Could not generate an image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (!email && !isLoading) {
    return <EmailDetailEmpty />;
  }

  if (isLoading || !email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground mt-4">Loading email...</p>
      </div>
    );
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
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/20">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <h1 className="text-[15px] sm:text-base font-medium truncate pr-2 sm:pr-4 tracking-tight" data-testid="email-subject">
            {showTranslated && translatedContent?.subject ? translatedContent.subject : email.subject}
          </h1>
        </div>
        <div className="flex items-center gap-0 flex-shrink-0">
          <Button 
            size="icon" 
            variant="ghost" 
            data-testid="button-archive"
            onClick={onArchive}
          >
            <Archive className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            data-testid="button-trash"
            onClick={onTrash}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            data-testid="button-star"
            onClick={onStar}
          >
            <Star className={`w-4 h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          <Button size="icon" variant="ghost" data-testid="button-more">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* AI Action Bar - buttons transform into expanded panels */}
      <div className="border-b border-border/20 bg-muted/20">
        <div className="flex flex-col">
          {/* Draft Reply button - moves to top when summary is open */}
          <div className={`flex items-center gap-2 px-4 sm:px-6 transition-all duration-300 ${
            showSummary && (summaryData?.summary || isSummaryLoading) ? 'py-2 order-first' : 'py-0 h-0 overflow-hidden opacity-0'
          }`}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAiDraftClick}
              data-testid="button-ai-draft-top"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Draft Reply
              {!hasPro && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 font-medium ml-0.5">
                  Pro
                </span>
              )}
            </Button>
          </div>

          {/* Summary section - button transforms into header */}
          <div className={`transition-all duration-300 ease-out ${
            showSummary && (summaryData?.summary || isSummaryLoading) 
              ? 'bg-foreground/5' 
              : ''
          }`}>
            {/* Header row - either button or expanded title */}
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2">
              {showSummary && (summaryData?.summary || isSummaryLoading) ? (
                /* Expanded state - title with close button */
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-foreground/70" />
                    <span className="text-xs font-medium text-foreground/80">Summarize</span>
                    {(isTyping || isSummaryLoading) && (
                      <span className="flex items-center gap-0.5 ml-1">
                        <span className="w-1 h-1 rounded-full bg-foreground/40 animate-pulse" />
                        <span className="w-1 h-1 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: '0.15s' }} />
                        <span className="w-1 h-1 rounded-full bg-foreground/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-foreground/10"
                    onClick={() => setShowSummary(false)}
                    data-testid="button-hide-summary"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                /* Collapsed state - normal buttons */
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleSummarize}
                    disabled={isSummaryLoading}
                    data-testid="button-summarize"
                  >
                    {isSummaryLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    Summarize
                    {!hasPro && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 font-medium ml-0.5">
                        Pro
                      </span>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleAiDraftClick}
                    data-testid="button-ai-draft"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Draft Reply
                    {!hasPro && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 font-medium ml-0.5">
                        Pro
                      </span>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Summary content - expands below the header */}
            <div 
              className={`overflow-hidden transition-all duration-300 ease-out ${
                showSummary && (summaryData?.summary || isSummaryLoading) 
                  ? 'max-h-[500px] opacity-100 pb-3' 
                  : 'max-h-0 opacity-0'
              }`}
              data-testid="ai-summary-section"
            >
              <div className="px-4 sm:px-6">
                {isSummaryLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing email...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-foreground/85 leading-relaxed" data-testid="summary-text">
                      {displayedSummary || summaryData?.summary}
                      {isTyping && <span className="inline-block w-0.5 h-3 bg-foreground/50 ml-0.5 animate-pulse" />}
                    </p>
                    {!isTyping && summaryData?.keyPoints && summaryData.keyPoints.length > 0 && (
                      <div className="pt-1">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">Key Points</p>
                        <ul className="space-y-0.5">
                          {summaryData.keyPoints.map((point, i) => (
                            <li 
                              key={i} 
                              className="text-xs text-foreground/75 flex items-start gap-1.5 animate-in fade-in slide-in-from-left-1"
                              style={{ animationDelay: `${i * 50}ms`, animationDuration: '200ms' }}
                            >
                              <Circle className="w-1 h-1 text-foreground/40 mt-1.5 fill-foreground/40 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!isTyping && summaryData?.actionItems && summaryData.actionItems.length > 0 && (
                      <div className="pt-1">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">Action Items</p>
                        <ul className="space-y-0.5">
                          {summaryData.actionItems.map((item, i) => (
                            <li 
                              key={i} 
                              className="text-xs text-foreground/75 flex items-start gap-1.5 animate-in fade-in slide-in-from-left-1"
                              style={{ animationDelay: `${100 + i * 50}ms`, animationDuration: '200ms' }}
                            >
                              <ArrowRight className="w-2.5 h-2.5 text-foreground/40 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
          {/* Thread indicator - Gmail-style with first message preview and expandable rest */}
          {hasThread && olderEmails.length > 0 && (() => {
            // Separator between thread and current email
            const ThreadSeparator = () => (
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Latest Reply</span>
                <div className="flex-1 h-px bg-gradient-to-r from-border via-border to-transparent" />
              </div>
            );
            const firstOlderEmail = olderEmails[0];
            const remainingEmails = olderEmails.slice(1);
            const firstInitials = firstOlderEmail.sender
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            
            return (
              <div className="mb-4 space-y-2">
                {/* First older message - always shown as preview */}
                <div 
                  className="border border-border/40 rounded-lg p-4 bg-muted/10"
                  data-testid={`thread-email-${firstOlderEmail.nylasId || firstOlderEmail.id}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-8 h-8 ring-1 ring-border/30">
                      <AvatarImage 
                        src={getAvatarUrl(firstOlderEmail.senderEmail, firstOlderEmail.sender)} 
                        alt={firstOlderEmail.sender}
                      />
                      <AvatarFallback 
                        style={{ backgroundColor: firstOlderEmail.avatarColor }}
                        className="text-white font-medium text-xs"
                      >
                        {firstInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{firstOlderEmail.sender}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatSmartDate(new Date(firstOlderEmail.receivedAt))}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{firstOlderEmail.senderEmail}</p>
                    </div>
                  </div>
                  <div className="text-sm text-foreground/80 leading-relaxed">
                    {(firstOlderEmail.body || firstOlderEmail.preview || "").includes('<') ? (
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: firstOlderEmail.body || firstOlderEmail.preview || "" }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{firstOlderEmail.body || firstOlderEmail.preview || ""}</p>
                    )}
                  </div>
                </div>

                {/* Remaining messages - expandable */}
                {remainingEmails.length > 0 && (
                  <>
                    {!expandedThreadEmails.has('all') ? (
                      <button
                        onClick={() => toggleThreadEmail('all')}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-dashed border-border/50 transition-colors"
                        data-testid="button-expand-thread"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span>{remainingEmails.length} more {remainingEmails.length === 1 ? "message" : "messages"}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleThreadEmail('all')}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-dashed border-border/50 transition-colors"
                          data-testid="button-collapse-thread"
                        >
                          <ChevronUp className="w-4 h-4" />
                          <span>Hide messages</span>
                        </button>
                        <div className="space-y-2">
                          {remainingEmails.map((threadEmail) => {
                            const threadEmailId = threadEmail.nylasId || threadEmail.id;
                            const threadInitials = threadEmail.sender
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);
                            
                            return (
                              <div 
                                key={threadEmailId}
                                className="border border-border/40 rounded-lg p-4 bg-muted/10"
                                data-testid={`thread-email-${threadEmailId}`}
                              >
                                <div className="flex items-start gap-3 mb-3">
                                  <Avatar className="w-8 h-8 ring-1 ring-border/30">
                                    <AvatarImage 
                                      src={getAvatarUrl(threadEmail.senderEmail, threadEmail.sender)} 
                                      alt={threadEmail.sender}
                                    />
                                    <AvatarFallback 
                                      style={{ backgroundColor: threadEmail.avatarColor }}
                                      className="text-white font-medium text-xs"
                                    >
                                      {threadInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{threadEmail.sender}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatSmartDate(new Date(threadEmail.receivedAt))}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{threadEmail.senderEmail}</p>
                                  </div>
                                </div>
                                <div className="text-sm text-foreground/80 leading-relaxed">
                                  {(threadEmail.body || threadEmail.preview || "").includes('<') ? (
                                    <div 
                                      className="prose prose-sm dark:prose-invert max-w-none"
                                      dangerouslySetInnerHTML={{ __html: threadEmail.body || threadEmail.preview || "" }}
                                    />
                                  ) : (
                                    <p className="whitespace-pre-wrap">{threadEmail.body || threadEmail.preview || ""}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
                <ThreadSeparator />
              </div>
            );
          })()}
          
          {/* Current/Latest email */}
          <div className="flex items-start gap-3 mb-5">
            <Avatar className="w-10 h-10 ring-2 ring-border/30">
              <AvatarImage 
                src={getAvatarUrl(email.senderEmail, email.sender)} 
                alt={email.sender}
              />
              <AvatarFallback 
                style={{ backgroundColor: email.avatarColor }}
                className="text-white font-medium text-sm"
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
              <p className="text-xs text-muted-foreground" data-testid="email-sender-address">
                {email.senderEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setShowFormatted(true)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                showFormatted 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid="button-formatted-view"
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              AI Formatted
            </button>
            <button
              onClick={() => setShowFormatted(false)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                !showFormatted 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              data-testid="button-original-view"
            >
              Original
            </button>
            
            {detectedLanguage && !detectedLanguage.isEnglish && (
              <>
                {translatedContent ? (
                  <button
                    onClick={() => setShowTranslated(!showTranslated)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                      showTranslated 
                        ? "bg-blue-500 text-white" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    data-testid="button-toggle-translation"
                  >
                    <Languages className="w-3 h-3" />
                    {showTranslated ? "Show Original" : "Show Translation"}
                  </button>
                ) : (
                  <button
                    onClick={handleTranslate}
                    disabled={translateMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded-full transition-colors bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center gap-1"
                    data-testid="button-translate"
                  >
                    {translateMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="w-3 h-3" />
                        Translate from {detectedLanguage.name}
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          <div 
            className="mb-8"
            data-testid="email-body"
          >
            {showTranslated && translatedContent ? (
              <>
                <div className="text-xs text-blue-500 mb-2 flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  Translated from {detectedLanguage?.name || "original language"}
                </div>
                {translatedContent.body.includes('<') ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-[15px] [&_a]:text-blue-500 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: translatedContent.body }} 
                  />
                ) : (
                  translatedContent.body.split("\n").map((paragraph, i) => (
                    paragraph.trim() ? (
                      <p key={i} className="text-foreground/90 leading-relaxed text-[15px] mb-4">
                        {paragraph}
                      </p>
                    ) : null
                  ))
                )}
              </>
            ) : showFormatted && formattedBody ? (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-[15px] [&_a]:text-blue-500 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: formattedBody }} 
              />
            ) : (
              <>
                {email.body.includes('<') ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-[15px]"
                    dangerouslySetInnerHTML={{ __html: email.body }} 
                  />
                ) : (
                  email.body.split("\n").map((paragraph, i) => (
                    paragraph.trim() ? (
                      <p key={i} className="text-foreground/90 leading-relaxed text-[15px] mb-4">
                        {paragraph}
                      </p>
                    ) : null
                  ))
                )}
              </>
            )}
          </div>

          {/* Attachments Section */}
          {(email as ExtendedEmail).attachments && (email as ExtendedEmail).attachments!.length > 0 && (
            <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/50" data-testid="attachments-section">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Attachments ({(email as ExtendedEmail).attachments!.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(email as ExtendedEmail).attachments!.map((attachment) => {
                  const isImage = attachment.contentType.startsWith('image/');
                  const isPdf = attachment.contentType === 'application/pdf';
                  const messageId = (email as any).nylasId || email.id;
                  const downloadUrl = `/api/emails/${messageId}/attachments/${attachment.id}`;
                  
                  const formatSize = (bytes: number) => {
                    if (bytes < 1024) return `${bytes} B`;
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                  };
                  
                  return (
                    <a
                      key={attachment.id}
                      href={downloadUrl}
                      download={attachment.filename}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border/30"
                      data-testid={`attachment-${attachment.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        {isImage ? (
                          <ImageIcon className="w-5 h-5 text-blue-500" />
                        ) : isPdf ? (
                          <FileText className="w-5 h-5 text-red-500" />
                        ) : (
                          <File className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(attachment.size)}</p>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky Note for this email */}
          <div className="mb-6">
            <EmailNotePanel messageId={String((email as any).nylasId || email.id)} />
          </div>

          {/* Show indicator for newer messages in thread */}
          {hasNewerMessages && (
            <div className="mt-4 mb-6 p-3 bg-muted/30 rounded-lg border border-border/40" data-testid="newer-messages-indicator">
              <p className="text-sm text-muted-foreground">
                {newerEmails.length} newer {newerEmails.length === 1 ? "message" : "messages"} in this conversation
              </p>
            </div>
          )}

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
              {generatedDraft.status !== "scheduled" && draftContent.trim() && (
                <div className="mt-3 space-y-2">
                  {/* Quick action buttons */}
                  <div className="flex flex-wrap gap-1.5" data-testid="quick-actions">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefine("Make this response shorter and more concise")}
                      disabled={isRefining}
                      className="h-7 px-2.5 text-xs"
                      data-testid="button-shorter"
                    >
                      Shorter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefine("Make this response longer with more detail")}
                      disabled={isRefining}
                      className="h-7 px-2.5 text-xs"
                      data-testid="button-longer"
                    >
                      Longer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefine("Make this more formal and professional")}
                      disabled={isRefining}
                      className="h-7 px-2.5 text-xs"
                      data-testid="button-formal"
                    >
                      More Formal
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefine("Make this more casual and friendly")}
                      disabled={isRefining}
                      className="h-7 px-2.5 text-xs"
                      data-testid="button-casual"
                    >
                      More Casual
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateImage}
                      disabled={isRefining || isGeneratingImage}
                      className="h-7 px-2.5 text-xs gap-1"
                      data-testid="button-generate-image"
                    >
                      {isGeneratingImage ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                      Add Image
                    </Button>
                  </div>
                  {/* Custom refine input */}
                  <div className="flex items-center gap-2 p-2 bg-background/30 rounded-lg border border-border/20" data-testid="refine-bar">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    <Input
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      placeholder="Or type custom instructions..."
                      className="flex-1 h-8 border-0 bg-transparent focus-visible:ring-0 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleRefine();
                        }
                      }}
                      disabled={isRefining}
                      data-testid="input-refine"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleRefine()}
                      disabled={!refineInput.trim() || isRefining}
                      className="h-7 px-3 text-xs"
                      data-testid="button-refine"
                    >
                      {isRefining ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Refine"
                      )}
                    </Button>
                  </div>
                </div>
              )}
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
            <Button 
              className="gap-2 px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0" 
              data-testid="button-reply"
              onClick={onReply}
            >
              <Reply className="w-4 h-4" />
              Reply
            </Button>
            <Button variant="outline" className="gap-2" data-testid="button-reply-all" onClick={onReplyAll}>
              <ReplyAll className="w-4 h-4" />
              Reply All
            </Button>
            <Button variant="outline" className="gap-2" data-testid="button-forward" onClick={onForward}>
              <Forward className="w-4 h-4" />
              Forward
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
