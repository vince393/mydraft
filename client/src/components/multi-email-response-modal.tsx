import { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, RefreshCw, Loader2, ChevronLeft, ChevronRight, 
  ChevronDown, ChevronUp, Send, AlertCircle, Wand2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email } from "@shared/schema";

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
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            AI Batch Response
          </DialogTitle>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{currentIndex + 1}</span>
              <span>/</span>
              <span>{emails.length}</span>
              <span className="ml-2">emails</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="h-8 w-8"
                data-testid="button-previous-email"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNext}
                disabled={currentIndex === emails.length - 1}
                className="h-8 w-8"
                data-testid="button-next-email"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs">
              {sentCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                  {sentCount} sent
                </span>
              )}
              {loadingCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                  {loadingCount} generating
                </span>
              )}
              {readyCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {readyCount} ready
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4">
              <button
                onClick={() => setIsOriginalExpanded(!isOriginalExpanded)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
                data-testid="button-toggle-original"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>From: {currentEmail.sender}</span>
                    {currentResponse?.sent && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                        Sent
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {currentEmail.subject}
                  </div>
                </div>
                {isOriginalExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {isOriginalExpanded && (
                <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {currentEmail.body || currentEmail.preview}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <Input
                    value={currentResponse?.subject || `Re: ${currentEmail.subject}`}
                    onChange={(e) => updateCurrentResponse('subject', e.target.value)}
                    disabled={currentResponse?.sent || currentResponse?.isLoading}
                    className="bg-white/[0.03]"
                    data-testid="input-response-subject"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Response</label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRegenerateCurrent}
                      disabled={currentResponse?.isLoading || currentResponse?.sent}
                      className="h-7 text-xs gap-1"
                      data-testid="button-regenerate-current"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </Button>
                  </div>
                  
                  {currentResponse?.isLoading ? (
                    <div className="flex items-center justify-center h-40 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating response...</span>
                      </div>
                    </div>
                  ) : currentResponse?.error ? (
                    <div className="flex flex-col items-center justify-center h-40 bg-red-500/10 rounded-lg border border-red-500/30">
                      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                      <p className="text-sm text-red-400">{currentResponse.error}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerateCurrent}
                        className="mt-3"
                        data-testid="button-retry-generate"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <Textarea
                      value={currentResponse?.content || ""}
                      onChange={(e) => updateCurrentResponse('content', e.target.value)}
                      disabled={currentResponse?.sent}
                      placeholder="AI-generated response will appear here..."
                      className="min-h-[200px] bg-white/[0.03] resize-none"
                      data-testid="textarea-response-content"
                    />
                  )}
                  
                  {currentResponse?.content && !currentResponse?.isLoading && !currentResponse?.sent && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 relative">
                        <Input
                          value={refineInstruction}
                          onChange={(e) => setRefineInstruction(e.target.value)}
                          placeholder="Ask AI to change something... e.g. 'Make it shorter' or 'Add a thank you'"
                          className="pr-20 bg-white/[0.03]"
                          disabled={isRefining}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && refineInstruction.trim()) {
                              e.preventDefault();
                              handleRefine();
                            }
                          }}
                          data-testid="input-refine-instruction"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleRefine}
                        disabled={!refineInstruction.trim() || isRefining}
                        className="gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                        data-testid="button-refine"
                      >
                        {isRefining ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        Refine
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t px-6 py-4 space-y-3 bg-background">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Tone:</label>
              <div className="flex flex-wrap gap-1.5">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => handleToneChange(tone.value)}
                    disabled={loadingCount > 0}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${selectedTone === tone.value
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      }
                      ${loadingCount > 0 ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    data-testid={`button-tone-${tone.value}`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerateAll}
                disabled={loadingCount > 0}
                className="gap-2"
                data-testid="button-regenerate-all"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCount > 0 ? "animate-spin" : ""}`} />
                Regenerate All
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={handleSendCurrent}
                disabled={
                  !currentResponse || 
                  currentResponse.isLoading || 
                  currentResponse.sent || 
                  !!currentResponse.error ||
                  sendEmailMutation.isPending
                }
                className="gap-2"
                data-testid="button-send-current"
              >
                {sendEmailMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send This
              </Button>
              <Button
                onClick={handleSendAll}
                disabled={readyCount === 0 || sendEmailMutation.isPending}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                data-testid="button-send-all"
              >
                {sendEmailMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send All ({readyCount})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
