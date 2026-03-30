import { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, RefreshCw, Loader2, ChevronLeft, ChevronRight, 
  ChevronDown, ChevronUp, Send, AlertCircle, Wand2, X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email } from "@shared/schema";
import { useScreenSize } from "@/hooks/use-screen-size";

interface EmailWithNylasId extends Email {
  nylasId?: string;
  threadCount?: number;
}

interface EmailResponse {
  emailId: string | number;
  email: EmailWithNylasId;
  subject: string;
  content: string;
  isLoading: boolean;
  error: string | null;
  sent: boolean;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "concise", label: "Concise" },
] as const;

type ToneType = typeof TONE_OPTIONS[number]["value"];

interface MultiEmailResponseModalProps {
  emails: EmailWithNylasId[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

function getEmailId(email: EmailWithNylasId): string | number {
  return email.nylasId || email.id;
}

export function MultiEmailResponseModal({ 
  emails, 
  open, 
  onOpenChange,
  onComplete 
}: MultiEmailResponseModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string | number, EmailResponse>>(new Map());
  const [selectedTone, setSelectedTone] = useState<ToneType>("professional");
  const [isOriginalExpanded, setIsOriginalExpanded] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const { toast } = useToast();
  const screen = useScreenSize();

  const currentEmail = emails[currentIndex];
  const currentEmailId = currentEmail ? getEmailId(currentEmail) : null;
  const currentResponse = currentEmailId ? responses.get(currentEmailId) : null;

  const generateMutation = useMutation({
    mutationFn: async ({ email, tone }: { email: EmailWithNylasId; tone: string }) => {
      const response = await apiRequest("POST", "/api/drafts/generate", { 
        emailContent: {
          sender: email.sender,
          senderEmail: email.senderEmail,
          subject: email.subject,
          body: email.body || email.preview || "",
          preview: email.preview,
        },
        tone 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return response.json();
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      const response = await apiRequest("POST", "/api/emails/send", { to, subject, body });
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
    },
  });

  const refineMutation = useMutation({
    mutationFn: async ({ text, instruction, email }: { text: string; instruction: string; email: EmailWithNylasId }) => {
      const response = await apiRequest("POST", "/api/ai/refine", {
        text,
        instruction,
        originalEmail: {
          sender: email.sender,
          senderEmail: email.senderEmail,
          subject: email.subject,
          body: email.body || email.preview || "",
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return response.json();
    },
  });

  const handleRefine = async () => {
    if (!currentEmail || !currentResponse || !refineInstruction.trim()) return;
    
    setIsRefining(true);
    try {
      const result = await refineMutation.mutateAsync({
        text: currentResponse.content,
        instruction: refineInstruction,
        email: currentEmail,
      });
      
      updateCurrentResponse('content', result.refined);
      setRefineInstruction("");
      toast({
        title: "Response refined",
        description: "The AI has updated your response based on your instructions.",
      });
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'error' in error 
        ? String((error as { error: string }).error) 
        : "Failed to refine response";
      toast({
        title: "Refinement failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };

  const generateForEmail = useCallback(async (email: EmailWithNylasId, tone: ToneType) => {
    const emailId = getEmailId(email);
    
    setResponses(prev => {
      const newMap = new Map(prev);
      newMap.set(emailId, {
        emailId,
        email,
        subject: `Re: ${email.subject}`,
        content: "",
        isLoading: true,
        error: null,
        sent: false,
      });
      return newMap;
    });

    try {
      const draft = await generateMutation.mutateAsync({ email, tone });
      setResponses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(emailId);
        if (existing) {
          newMap.set(emailId, {
            ...existing,
            content: draft.content,
            isLoading: false,
            error: null,
          });
        }
        return newMap;
      });
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'error' in error 
        ? String((error as { error: string }).error) 
        : "Failed to generate response";
      setResponses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(emailId);
        if (existing) {
          newMap.set(emailId, {
            ...existing,
            isLoading: false,
            error: errorMessage,
          });
        }
        return newMap;
      });
    }
  }, [generateMutation]);

  useEffect(() => {
    if (open && emails.length > 0) {
      setCurrentIndex(0);
      setResponses(new Map());
      setIsOriginalExpanded(false);
      
      emails.forEach(email => {
        generateForEmail(email, selectedTone);
      });
    }
  }, [open, emails.length]);

  const handleRegenerateAll = () => {
    emails.forEach(email => {
      generateForEmail(email, selectedTone);
    });
  };

  const handleRegenerateCurrent = () => {
    if (currentEmail) {
      generateForEmail(currentEmail, selectedTone);
    }
  };

  const handleToneChange = (tone: ToneType) => {
    setSelectedTone(tone);
    emails.forEach(email => {
      generateForEmail(email, tone);
    });
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setIsOriginalExpanded(false);
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(emails.length - 1, prev + 1));
    setIsOriginalExpanded(false);
  };

  const updateCurrentResponse = (field: 'subject' | 'content', value: string) => {
    if (!currentEmailId) return;
    setResponses(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(currentEmailId);
      if (existing) {
        newMap.set(currentEmailId, { ...existing, [field]: value });
      }
      return newMap;
    });
  };

  const handleSendCurrent = async () => {
    if (!currentResponse || !currentEmail) return;
    
    try {
      await sendEmailMutation.mutateAsync({
        to: currentEmail.senderEmail,
        subject: currentResponse.subject,
        body: currentResponse.content,
      });
      
      setResponses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(currentEmailId!);
        if (existing) {
          newMap.set(currentEmailId!, { ...existing, sent: true });
        }
        return newMap;
      });
      
      toast({
        title: "Email sent",
        description: `Reply sent to ${currentEmail.sender}`,
      });

      if (currentIndex < emails.length - 1) {
        handleNext();
      }
    } catch {
      toast({
        title: "Failed to send",
        description: "Could not send the email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendAll = async () => {
    const unsent = Array.from(responses.values()).filter(r => !r.sent && !r.isLoading && !r.error);
    
    if (unsent.length === 0) {
      toast({
        title: "Nothing to send",
        description: "All emails have already been sent or have errors.",
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const response of unsent) {
      try {
        await sendEmailMutation.mutateAsync({
          to: response.email.senderEmail,
          subject: response.subject,
          body: response.content,
        });
        
        setResponses(prev => {
          const newMap = new Map(prev);
          newMap.set(response.emailId, { ...response, sent: true });
          return newMap;
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast({
      title: "Bulk send complete",
      description: `${successCount} sent${failCount > 0 ? `, ${failCount} failed` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    if (failCount === 0) {
      onComplete();
      onOpenChange(false);
    }
  };

  const sentCount = Array.from(responses.values()).filter(r => r.sent).length;
  const loadingCount = Array.from(responses.values()).filter(r => r.isLoading).length;
  const readyCount = Array.from(responses.values()).filter(r => !r.sent && !r.isLoading && !r.error).length;

  if (!currentEmail) return null;

  const glassStyle = {
    background: "linear-gradient(145deg, rgba(var(--overlay-rgb), 0.06), rgba(var(--overlay-rgb), 0.02))",
    boxShadow: "inset 0 1px 0 0 rgba(var(--overlay-rgb), 0.1), 0 4px 24px rgba(0,0,0,0.12)"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className={`${screen.isMobile ? 'w-full h-[100dvh] max-w-full max-h-full rounded-none !left-0 !top-0 !translate-x-0 !translate-y-0 mobile-slide-up' : 'max-w-3xl max-h-[90vh] rounded-2xl'} flex flex-col p-0 gap-0 border-black/15 dark:border-white/15 dark:border-white/10 backdrop-blur-3xl bg-background/80 overflow-hidden`}>
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/20 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(147,51,234,0.15))" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground/90">AI Batch Response</h2>
              <p className="text-xs text-foreground/40 mt-0.5">{emails.length} emails selected</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-foreground/50 hover:text-foreground/80 transition-all cursor-pointer"
              data-testid="button-close-batch"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation + Status pills */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
                data-testid="button-previous-email"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-medium text-foreground/50 tabular-nums px-1">
                {currentIndex + 1} / {emails.length}
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === emails.length - 1}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-foreground/60 hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
                data-testid="button-next-email"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              {sentCount > 0 && (
                <span 
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400 backdrop-blur-sm"
                  style={{ background: "rgba(16,185,129,0.1)" }}
                >
                  {sentCount} sent
                </span>
              )}
              {loadingCount > 0 && (
                <span 
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-blue-500/20 text-blue-400 backdrop-blur-sm"
                  style={{ background: "rgba(59,130,246,0.1)" }}
                >
                  {loadingCount} generating
                </span>
              )}
              {readyCount > 0 && (
                <span 
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-black/10 dark:border-white/10 text-foreground/50 backdrop-blur-sm"
                  style={{ background: "rgba(var(--overlay-rgb), 0.05)" }}
                >
                  {readyCount} ready
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-4">
              {/* Original email toggle */}
              <button
                onClick={() => setIsOriginalExpanded(!isOriginalExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 backdrop-blur-sm text-left transition-all hover:border-black/15 dark:hover:border-white/15"
                style={{ background: "rgba(var(--overlay-rgb), 0.03)" }}
                data-testid="button-toggle-original"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                    <span>From: {currentEmail.sender}</span>
                    {currentResponse?.sent && (
                      <span 
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/20 text-emerald-400"
                        style={{ background: "rgba(16,185,129,0.1)" }}
                      >
                        Sent
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-foreground/40 truncate mt-0.5">
                    {currentEmail.subject}
                  </div>
                </div>
                {isOriginalExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-foreground/40 flex-shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-foreground/40 flex-shrink-0 ml-2" />
                )}
              </button>

              {isOriginalExpanded && (
                <div 
                  className="px-4 py-3 rounded-xl border border-black/8 dark:border-white/8"
                  style={{ background: "rgba(var(--overlay-rgb), 0.02)" }}
                >
                  <div className="text-xs text-foreground/50 whitespace-pre-wrap leading-relaxed">
                    {currentEmail.body || currentEmail.preview}
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider">Subject</label>
                <Input
                  value={currentResponse?.subject || `Re: ${currentEmail.subject}`}
                  onChange={(e) => updateCurrentResponse('subject', e.target.value)}
                  disabled={currentResponse?.sent || currentResponse?.isLoading}
                  className="bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 rounded-xl text-sm focus:border-black/20 dark:focus:border-white/20 focus:bg-black/[0.05] dark:focus:bg-white/[0.05] transition-colors h-10"
                  data-testid="input-response-subject"
                />
              </div>

              {/* Response */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider">Response</label>
                  <button
                    onClick={handleRegenerateCurrent}
                    disabled={currentResponse?.isLoading || currentResponse?.sent}
                    className="h-6 px-2.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground/50 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground/70 transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1"
                    data-testid="button-regenerate-current"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Regenerate
                  </button>
                </div>
                
                {currentResponse?.isLoading ? (
                  <div 
                    className="flex items-center justify-center h-40 rounded-xl border border-black/8 dark:border-white/8"
                    style={{ background: "rgba(var(--overlay-rgb), 0.02)" }}
                  >
                    <div className="flex items-center gap-2.5 text-foreground/40">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Generating response...</span>
                    </div>
                  </div>
                ) : currentResponse?.error ? (
                  <div 
                    className="flex flex-col items-center justify-center h-40 rounded-xl border border-red-500/20"
                    style={{ background: "rgba(239,68,68,0.05)" }}
                  >
                    <AlertCircle className="w-6 h-6 text-red-400/60 mb-2" />
                    <p className="text-xs text-red-400/80">{currentResponse.error}</p>
                    <button
                      onClick={handleRegenerateCurrent}
                      className="mt-3 h-7 px-3 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground/60 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                      data-testid="button-retry-generate"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <Textarea
                    value={currentResponse?.content || ""}
                    onChange={(e) => updateCurrentResponse('content', e.target.value)}
                    disabled={currentResponse?.sent}
                    placeholder="AI-generated response will appear here..."
                    className="min-h-[180px] bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 rounded-xl resize-none text-sm focus:border-black/20 dark:focus:border-white/20 focus:bg-black/[0.05] dark:focus:bg-white/[0.05] transition-colors"
                    data-testid="textarea-response-content"
                  />
                )}
                
                {/* Refine bar */}
                {currentResponse?.content && !currentResponse?.isLoading && !currentResponse?.sent && (
                  <div 
                    className="flex items-center gap-2 px-3 py-2 rounded-full border border-black/10 dark:border-white/10 backdrop-blur-sm mt-2"
                    style={{ background: "rgba(var(--overlay-rgb), 0.03)" }}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                    <Input
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder="Tell AI how to adjust..."
                      className="flex-1 h-7 border-0 bg-transparent focus-visible:ring-0 text-xs placeholder:text-foreground/30"
                      disabled={isRefining}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && refineInstruction.trim()) {
                          e.preventDefault();
                          handleRefine();
                        }
                      }}
                      data-testid="input-refine-instruction"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={!refineInstruction.trim() || isRefining}
                      className="h-7 px-3 rounded-full text-[11px] font-medium backdrop-blur-sm bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 transition-all disabled:opacity-40 cursor-pointer"
                      data-testid="button-refine"
                    >
                      {isRefining ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Refine"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-black/10 dark:border-white/10 px-5 py-4 space-y-3">
            {/* Tone selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider">Tone</span>
              <div className="flex flex-wrap gap-1.5">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => handleToneChange(tone.value)}
                    disabled={loadingCount > 0}
                    className={`
                      h-7 px-3 rounded-full text-[11px] font-medium transition-all cursor-pointer
                      ${selectedTone === tone.value
                        ? "border border-primary/25 text-white"
                        : "bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground/50 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground/70"
                      }
                      ${loadingCount > 0 ? "opacity-40 cursor-not-allowed" : ""}
                    `}
                    style={selectedTone === tone.value ? { 
                      background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,51,234,0.3))" 
                    } : undefined}
                    data-testid={`button-tone-${tone.value}`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRegenerateAll}
                disabled={loadingCount > 0}
                className="h-9 px-4 rounded-full text-xs font-medium backdrop-blur-sm bg-black/5 dark:bg-white/5 border border-black/12 dark:border-white/12 text-foreground/60 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground/80 hover:border-black/20 dark:hover:border-white/20 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
                data-testid="button-regenerate-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCount > 0 ? "animate-spin" : ""}`} />
                Regenerate All
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSendCurrent}
                disabled={
                  !currentResponse || 
                  currentResponse.isLoading || 
                  currentResponse.sent || 
                  !!currentResponse.error ||
                  sendEmailMutation.isPending
                }
                className="h-9 px-4 rounded-full text-xs font-medium backdrop-blur-sm bg-black/5 dark:bg-white/5 border border-black/12 dark:border-white/12 text-foreground/60 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground/80 hover:border-black/20 dark:hover:border-white/20 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
                data-testid="button-send-current"
              >
                {sendEmailMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send This
              </button>
              <button
                onClick={handleSendAll}
                disabled={readyCount === 0 || sendEmailMutation.isPending}
                className="h-9 px-5 rounded-full text-xs font-medium border border-primary/25 text-white transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,51,234,0.3))" }}
                data-testid="button-send-all"
              >
                {sendEmailMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send All ({readyCount})
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
