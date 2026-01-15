import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, X, ChevronDown, ChevronUp, Undo2, Sparkles, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "new" | "reply" | "replyAll" | "forward";
  originalEmail?: {
    id: string;
    subject: string;
    from: string;
    fromEmail: string;
    to?: string[];
    cc?: string[];
    body: string;
    date: Date;
  };
  currentUserEmail?: string;
}

interface UserData {
  user: {
    plan: string;
  };
}

export function ComposeDialog({ 
  open, 
  onOpenChange, 
  mode = "new",
  originalEmail,
  currentUserEmail = ""
}: ComposeDialogProps) {
  const { toast } = useToast();
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  
  // Schedule send state (Pro/Business only)
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  
  // Get user plan for feature gating
  const { data: userData } = useQuery<UserData>({
    queryKey: ["/api/auth/me"],
  });
  const userPlan = userData?.user?.plan || "free";
  const canScheduleSend = userPlan === "pro" || userPlan === "premium" || userPlan === "business";
  
  // Get AI usage for free plan users
  const { data: aiUsageData, refetch: refetchAiUsage } = useQuery<{
    unlimited: boolean;
    plan: string;
    used?: number;
    limit?: number;
    remaining?: number;
  }>({
    queryKey: ["/api/ai-usage"],
    enabled: open && userPlan === "free",
  });
  
  const aiRemaining = aiUsageData?.remaining ?? 5;
  const aiLimitReached = userPlan === "free" && aiRemaining <= 0;
  
  // Track if form has been initialized to prevent overwriting user edits
  const initializedRef = useRef(false);
  const lastEmailIdRef = useRef<string | undefined>(undefined);

  // Reset form when dialog opens with new content
  useEffect(() => {
    if (!open) return;
    
    // For new messages, always initialize with empty fields
    if (mode === "new") {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setTo("");
        setCc("");
        setBcc("");
        setSubject("");
        setBody("");
        setShowCcBcc(false);
      }
      return;
    }
    
    // For reply/replyAll/forward, wait until we have valid originalEmail data
    // Skip initialization if originalEmail is undefined or doesn't have the required fields
    if (!originalEmail || !originalEmail.id) return;
    
    // Only initialize if this is a new dialog opening or different email
    const currentEmailId = originalEmail.id;
    const shouldInitialize = !initializedRef.current || lastEmailIdRef.current !== currentEmailId;
    
    if (!shouldInitialize) return;
    
    initializedRef.current = true;
    lastEmailIdRef.current = currentEmailId;
    
    // Reset showCcBcc based on mode
    setShowCcBcc(mode === "replyAll");
    setBcc("");
    
    if (mode === "reply") {
      setTo(originalEmail.fromEmail);
      setCc("");
      setSubject(originalEmail.subject.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      setBody(`\n\n---------- Original message ----------\nFrom: ${originalEmail.from} <${originalEmail.fromEmail}>\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body.replace(/<[^>]*>/g, '')}`);
    } else if (mode === "replyAll") {
      setTo(originalEmail.fromEmail);
      const allRecipients = [...(originalEmail.to || []), ...(originalEmail.cc || [])];
      const normalizedCurrentEmail = currentUserEmail.toLowerCase();
      const uniqueCc = Array.from(new Set(allRecipients)).filter(email => 
        email.toLowerCase() !== originalEmail.fromEmail.toLowerCase() && 
        email.toLowerCase() !== normalizedCurrentEmail
      );
      setCc(uniqueCc.join(", "));
      setSubject(originalEmail.subject.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      setBody(`\n\n---------- Original message ----------\nFrom: ${originalEmail.from} <${originalEmail.fromEmail}>\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body.replace(/<[^>]*>/g, '')}`);
    } else if (mode === "forward") {
      setTo("");
      setCc("");
      setSubject(originalEmail.subject.startsWith("Fwd:") ? originalEmail.subject : `Fwd: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      setBody(`\n\n---------- Forwarded message ----------\nFrom: ${originalEmail.from} <${originalEmail.fromEmail}>\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body.replace(/<[^>]*>/g, '')}`);
    }
  }, [open, mode, originalEmail, currentUserEmail]);

  const cancelMutation = useMutation({
    mutationFn: async (pendingSendId: number) => {
      const response = await apiRequest("POST", `/api/pending-sends/${pendingSendId}/cancel`);
      return response.json();
    },
  });

  const showUndoToast = useCallback((pendingSendId: number, delaySeconds: number, toRecipients: string[]) => {
    let remaining = delaySeconds;
    const recipientText = toRecipients.length > 1 
      ? `${toRecipients[0]} and ${toRecipients.length - 1} other${toRecipients.length > 2 ? 's' : ''}`
      : toRecipients[0];
    
    const { id: toastId, dismiss, update } = toast({
      title: "Sending email...",
      description: (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">To: {recipientText} ({remaining}s)</span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              clearInterval(intervalId);
              dismiss();
              try {
                await cancelMutation.mutateAsync(pendingSendId);
                toast({
                  title: "Email cancelled",
                  description: "Your message was not sent.",
                });
              } catch {
                toast({
                  title: "Could not cancel",
                  description: "The email may have already been sent.",
                  variant: "destructive",
                });
              }
            }}
            data-testid="button-undo-send"
          >
            <Undo2 className="w-3 h-3 mr-1" />
            Undo
          </Button>
        </div>
      ),
      duration: (delaySeconds + 1) * 1000,
    });

    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(intervalId);
        update({
          id: toastId,
          title: "Email sent",
          description: `Your message to ${recipientText} was sent.`,
          duration: 3000,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        return;
      }
      update({
        id: toastId,
        title: "Sending email...",
        description: (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">To: {recipientText} ({remaining}s)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                clearInterval(intervalId);
                dismiss();
                try {
                  await cancelMutation.mutateAsync(pendingSendId);
                  toast({
                    title: "Email cancelled",
                    description: "Your message was not sent.",
                  });
                } catch {
                  toast({
                    title: "Could not cancel",
                    description: "The email may have already been sent.",
                    variant: "destructive",
                  });
                }
              }}
              data-testid="button-undo-send"
            >
              <Undo2 className="w-3 h-3 mr-1" />
              Undo
            </Button>
          </div>
        ),
        duration: (remaining + 1) * 1000,
      });
    }, 1000);
  }, [toast, cancelMutation]);

  const sendMutation = useMutation({
    mutationFn: async (options?: { scheduledFor?: Date }) => {
      const toRecipients = to.split(",").map(e => e.trim()).filter(Boolean);
      if (toRecipients.length === 0) {
        throw new Error("Please enter at least one recipient");
      }
      
      const ccRecipients = cc ? cc.split(",").map(e => e.trim()).filter(Boolean) : [];
      const bccRecipients = bcc ? bcc.split(",").map(e => e.trim()).filter(Boolean) : [];

      const payload: Record<string, unknown> = {
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject,
        body,
        delaySeconds: options?.scheduledFor ? 0 : 5,
      };
      
      // Add scheduled time if provided
      if (options?.scheduledFor) {
        payload.scheduledFor = options.scheduledFor.toISOString();
      }
      
      if ((mode === "reply" || mode === "replyAll") && originalEmail) {
        payload.replyToMessageId = originalEmail.id;
      }

      const response = await apiRequest("POST", "/api/send", payload);
      const data = await response.json();
      return { ...data, toRecipients };
    },
    onSuccess: (data) => {
      onOpenChange(false);
      resetForm();
      
      if (data.isScheduledSend) {
        toast({
          title: "Email scheduled",
          description: `Your message will be sent at the scheduled time.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/pending-sends"] });
      } else if (data.pendingSendId) {
        showUndoToast(data.pendingSendId, data.delaySeconds || 5, data.toRecipients);
      } else {
        toast({
          title: "Email sent",
          description: "Your message has been sent successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    setScheduledDate(undefined);
    setScheduledTime("09:00");
    setShowSchedulePicker(false);
    initializedRef.current = false;
    lastEmailIdRef.current = undefined;
  };
  
  const handleScheduleSend = () => {
    if (!scheduledDate) {
      toast({
        title: "Select a date",
        description: "Please select a date to schedule your email.",
        variant: "destructive",
      });
      return;
    }
    
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    if (scheduledDateTime <= new Date()) {
      toast({
        title: "Invalid time",
        description: "Please select a future date and time.",
        variant: "destructive",
      });
      return;
    }
    
    sendMutation.mutate({ scheduledFor: scheduledDateTime });
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [previousBody, setPreviousBody] = useState("");

  const aiDraftMutation = useMutation({
    mutationFn: async () => {
      setPreviousBody(body);
      setIsGenerating(true);
      setBody("Generating...");
      
      const response = await apiRequest("POST", "/api/drafts/quick-generate", {
        mode,
        originalEmail: originalEmail ? {
          from: originalEmail.from,
          fromEmail: originalEmail.fromEmail,
          subject: originalEmail.subject,
          body: originalEmail.body,
        } : undefined,
      });
      return response.json();
    },
    onSuccess: (data: { subject?: string; body?: string; usage?: { used: number; limit: number; remaining: number } }) => {
      setIsGenerating(false);
      
      // Refetch AI usage for free users
      if (userPlan === "free") {
        refetchAiUsage();
      }
      
      if (data.subject && mode !== "reply" && mode !== "replyAll") {
        setSubject(data.subject);
      } else if (data.subject && (mode === "reply" || mode === "replyAll")) {
        // For replies, keep the Re: prefix but update if AI provides better subject
        if (!subject.startsWith("Re:")) {
          setSubject(data.subject);
        }
      }
      
      if (data.body) {
        // For replies, prepend AI body to the original email quote
        if ((mode === "reply" || mode === "replyAll" || mode === "forward") && originalEmail) {
          const originalQuote = previousBody.includes("---------- Original message ----------") 
            ? previousBody.substring(previousBody.indexOf("---------- Original message ----------") - 2)
            : previousBody.includes("---------- Forwarded message ----------")
            ? previousBody.substring(previousBody.indexOf("---------- Forwarded message ----------") - 2)
            : "";
          setBody(data.body + originalQuote);
        } else {
          setBody(data.body);
        }
        
        // Show remaining for free users
        if (data.usage && data.usage.remaining >= 0) {
          toast({
            title: "Draft generated",
            description: `${data.usage.remaining} AI drafts remaining today`,
          });
        }
      } else {
        setBody(previousBody);
      }
    },
    onError: (error: Error & { limitReached?: boolean }) => {
      setIsGenerating(false);
      setBody(previousBody);
      refetchAiUsage();
      toast({
        title: "Failed to generate draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const getDialogTitle = () => {
    switch (mode) {
      case "reply": return "Reply";
      case "replyAll": return "Reply All";
      case "forward": return "Forward";
      default: return "New Message";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="to" className="w-12 text-right text-muted-foreground text-sm">
                To
              </Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1"
                data-testid="input-compose-to"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-muted-foreground text-xs"
              >
                Cc/Bcc
                {showCcBcc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </div>
            
            {showCcBcc && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cc" className="w-12 text-right text-muted-foreground text-sm">
                    Cc
                  </Label>
                  <Input
                    id="cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1"
                    data-testid="input-compose-cc"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="bcc" className="w-12 text-right text-muted-foreground text-sm">
                    Bcc
                  </Label>
                  <Input
                    id="bcc"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1"
                    data-testid="input-compose-bcc"
                  />
                </div>
              </>
            )}
            
            <div className="flex items-center gap-2">
              <Label htmlFor="subject" className="w-12 text-right text-muted-foreground text-sm">
                Subject
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1"
                data-testid="input-compose-subject"
              />
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="h-full min-h-[200px] resize-none"
              data-testid="textarea-compose-body"
            />
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t flex-shrink-0 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                onClick={handleClose}
                data-testid="button-compose-cancel"
              >
                <X className="w-4 h-4 mr-2" />
                Discard
              </Button>
              <Button
                variant="outline"
                onClick={() => aiDraftMutation.mutate()}
                disabled={isGenerating || sendMutation.isPending || aiLimitReached}
                className="gap-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/30 hover:border-blue-500/50 text-blue-400"
                data-testid="button-ai-draft"
                title={aiLimitReached ? "Daily limit reached. Upgrade to Pro for unlimited AI drafts." : undefined}
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? "Generating..." : userPlan === "free" ? `AI Draft (${aiRemaining}/5)` : "AI Draft"}
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Schedule Send - Pro/Business only */}
              {canScheduleSend && (
                <Popover open={showSchedulePicker} onOpenChange={setShowSchedulePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={sendMutation.isPending || !to.trim() || isGenerating}
                      data-testid="button-schedule-send"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select date</Label>
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select time</Label>
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full"
                          data-testid="input-schedule-time"
                        />
                      </div>
                      {scheduledDate && (
                        <div className="text-sm text-muted-foreground">
                          Send on {format(scheduledDate, "MMM d, yyyy")} at {scheduledTime}
                        </div>
                      )}
                      <Button
                        onClick={handleScheduleSend}
                        disabled={sendMutation.isPending || !scheduledDate}
                        className="w-full"
                        data-testid="button-confirm-schedule"
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Schedule Send
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              <Button
                onClick={() => sendMutation.mutate({})}
                disabled={sendMutation.isPending || !to.trim() || isGenerating}
                data-testid="button-compose-send"
              >
                {sendMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
