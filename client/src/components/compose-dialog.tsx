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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, X, ChevronDown, ChevronUp, Undo2, Sparkles, Clock, Calendar as CalendarIcon, Mail, User, Users, Forward, Wand2, ArrowUpRight, ArrowDownRight, FileText, Lock } from "lucide-react";
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
  const isPro = userPlan === "pro" || userPlan === "premium" || userPlan === "business";
  const canScheduleSend = isPro;
  
  // Check if this is a reply mode (used for original email context)
  const isReplyMode = mode === "reply" || mode === "replyAll";
  
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

  // AI Reply mutation - for reply/replyAll modes (5/day limit for free)
  const aiReplyMutation = useMutation({
    mutationFn: async () => {
      setPreviousBody(body);
      setIsGenerating(true);
      setBody("Generating reply...");
      
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
      
      if (userPlan === "free") {
        refetchAiUsage();
      }
      
      if (data.body) {
        const originalQuote = previousBody.includes("---------- Original message ----------") 
          ? previousBody.substring(previousBody.indexOf("---------- Original message ----------") - 2)
          : "";
        setBody(data.body + originalQuote);
        
        // Set the AI-generated subject in the subject field
        if (data.subject) {
          setSubject(data.subject);
        }
        
        if (data.usage && data.usage.remaining >= 0) {
          toast({
            title: "Reply generated",
            description: `${data.usage.remaining} AI replies remaining today`,
          });
        }
      } else {
        setBody(previousBody);
      }
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setBody(previousBody);
      refetchAiUsage();
      toast({
        title: "Failed to generate reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // AI Polish mutation - for improving existing text
  const aiPolishMutation = useMutation({
    mutationFn: async (polishType: "polish" | "longer" | "shorter" | "concise") => {
      // Extract user's written content (before the original message quote)
      const userContent = body.includes("---------- Original message ----------")
        ? body.substring(0, body.indexOf("---------- Original message ----------") - 2).trim()
        : body.includes("---------- Forwarded message ----------")
        ? body.substring(0, body.indexOf("---------- Forwarded message ----------") - 2).trim()
        : body.trim();
      
      if (!userContent) {
        throw new Error("Please write some content first");
      }
      
      setPreviousBody(body);
      setIsGenerating(true);
      
      const response = await apiRequest("POST", "/api/drafts/polish", {
        content: userContent,
        polishType,
        subject,
      });
      return response.json();
    },
    onSuccess: (data: { content?: string }) => {
      setIsGenerating(false);
      
      if (data.content) {
        // Preserve original quote if present
        const originalQuote = previousBody.includes("---------- Original message ----------") 
          ? previousBody.substring(previousBody.indexOf("---------- Original message ----------") - 2)
          : previousBody.includes("---------- Forwarded message ----------")
          ? previousBody.substring(previousBody.indexOf("---------- Forwarded message ----------") - 2)
          : "";
        setBody(data.content + originalQuote);
        
        toast({
          title: "Text polished",
          description: "Your message has been improved",
        });
      } else {
        setBody(previousBody);
      }
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setBody(previousBody);
      toast({
        title: "Failed to polish",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const getModeIcon = () => {
    switch (mode) {
      case "reply": return <Mail className="w-4 h-4" />;
      case "replyAll": return <Users className="w-4 h-4" />;
      case "forward": return <Forward className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getDialogTitle = () => {
    switch (mode) {
      case "reply": return "Reply";
      case "replyAll": return "Reply All";
      case "forward": return "Forward";
      default: return "New Message";
    }
  };

  // Check if there's user content to polish
  const hasUserContent = () => {
    const userContent = body.includes("---------- Original message ----------")
      ? body.substring(0, body.indexOf("---------- Original message ----------") - 2).trim()
      : body.includes("---------- Forwarded message ----------")
      ? body.substring(0, body.indexOf("---------- Forwarded message ----------") - 2).trim()
      : body.trim();
    return userContent.length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-auto sm:max-w-[680px] max-h-[90vh] sm:max-h-[85vh] p-0 overflow-hidden flex flex-col gap-0 bg-background/95 backdrop-blur-xl border-border/50">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-border/50 bg-muted/30">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
              {getModeIcon()}
            </div>
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>
        
        {/* Form Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Recipients Section */}
          <div className="px-6 py-4 space-y-3 border-b border-border/30">
            {/* To Field */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/50 text-muted-foreground">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 relative">
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients"
                  className="border-0 bg-transparent px-0 h-9 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-compose-to"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 rounded-md"
              >
                {showCcBcc ? "Hide" : "Cc/Bcc"}
                {showCcBcc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </div>
            
            {/* Cc/Bcc Fields */}
            <div className={`space-y-3 overflow-hidden transition-all duration-200 ${showCcBcc ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex items-center gap-3 pl-11">
                <span className="text-xs text-muted-foreground w-6">Cc</span>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Carbon copy recipients"
                  className="border-0 bg-transparent px-0 h-8 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-compose-cc"
                />
              </div>
              <div className="flex items-center gap-3 pl-11">
                <span className="text-xs text-muted-foreground w-6">Bcc</span>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Blind carbon copy"
                  className="border-0 bg-transparent px-0 h-8 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-compose-bcc"
                />
              </div>
            </div>
            
            {/* Subject Field */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/50 text-muted-foreground">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 border-0 bg-transparent px-0 h-9 text-base font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                data-testid="input-compose-subject"
              />
            </div>
          </div>
          
          {/* Message Body */}
          <div className="flex-1 min-h-0 px-6 py-4">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="h-full min-h-[220px] resize-none border-0 bg-transparent px-0 text-base leading-relaxed placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="textarea-compose-body"
            />
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground h-9"
                data-testid="button-compose-cancel"
              >
                <X className="w-4 h-4 mr-1.5" />
                Discard
              </Button>
              
              {/* AI Draft Button - for all modes (5/day limit for free users) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiReplyMutation.mutate()}
                disabled={isGenerating || sendMutation.isPending || aiLimitReached}
                className="h-9 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-primary transition-all duration-200"
                data-testid="button-ai-draft"
                title={aiLimitReached ? "Daily limit reached. Upgrade to Pro for unlimited AI drafts." : "Generate an AI-powered draft"}
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {isGenerating ? "Writing..." : userPlan === "free" ? `AI Draft (${aiRemaining}/5)` : "AI Draft"}
                </span>
              </Button>
              
              {/* AI Polish Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isGenerating || sendMutation.isPending || !hasUserContent()}
                    className="h-9 gap-2"
                    data-testid="button-ai-polish"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Polish</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => aiPolishMutation.mutate("polish")}
                    disabled={isGenerating}
                    data-testid="button-polish-improve"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Improve Writing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (isPro) {
                        aiPolishMutation.mutate("longer");
                      } else {
                        toast({
                          title: "Pro feature",
                          description: "Upgrade to Pro to make your text longer",
                        });
                      }
                    }}
                    disabled={isGenerating}
                    className="flex items-center justify-between"
                    data-testid="button-polish-longer"
                  >
                    <div className="flex items-center">
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Make Longer
                    </div>
                    {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (isPro) {
                        aiPolishMutation.mutate("shorter");
                      } else {
                        toast({
                          title: "Pro feature",
                          description: "Upgrade to Pro to make your text shorter",
                        });
                      }
                    }}
                    disabled={isGenerating}
                    className="flex items-center justify-between"
                    data-testid="button-polish-shorter"
                  >
                    <div className="flex items-center">
                      <ArrowDownRight className="w-4 h-4 mr-2" />
                      Make Shorter
                    </div>
                    {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (isPro) {
                        aiPolishMutation.mutate("concise");
                      } else {
                        toast({
                          title: "Pro feature",
                          description: "Upgrade to Pro for concise rewrites",
                        });
                      }
                    }}
                    disabled={isGenerating}
                    className="flex items-center justify-between"
                    data-testid="button-polish-concise"
                  >
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      More Concise
                    </div>
                    {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Schedule Send - Pro/Business only */}
              {canScheduleSend && (
                <Popover open={showSchedulePicker} onOpenChange={setShowSchedulePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendMutation.isPending || !to.trim() || isGenerating}
                      className="h-9"
                      data-testid="button-schedule-send"
                    >
                      <Clock className="w-4 h-4 mr-1.5" />
                      Schedule
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Select date</span>
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Select time</span>
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
              
              {/* Send Button */}
              <Button
                onClick={() => sendMutation.mutate({})}
                disabled={sendMutation.isPending || !to.trim() || isGenerating}
                className="h-9 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200"
                data-testid="button-compose-send"
              >
                {sendMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="font-medium">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
