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
import { Send, X, ChevronDown, ChevronUp, Undo2, Sparkles, Clock, Calendar as CalendarIcon, Mail, User, Users, Forward, Wand2, ArrowUpRight, ArrowDownRight, FileText, Lock, MessageSquare, Settings2, Image, FileImage, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    aiPreferences?: {
      replyTone?: string;
    };
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
  
  // AI Draft options
  const [showAiOptions, setShowAiOptions] = useState(false);
  const [aiTone, setAiTone] = useState<string>("professional");
  const [aiInstructions, setAiInstructions] = useState("");
  
  // AI Refine bar state
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  
  // AI Image generation state
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [attachedImages, setAttachedImages] = useState<{data: string, name: string}[]>([]);
  
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
  
  // Initialize AI tone from user preferences
  const userPreferredTone = userData?.user?.aiPreferences?.replyTone;
  useEffect(() => {
    if (userPreferredTone) {
      setAiTone(userPreferredTone);
    }
  }, [userPreferredTone]);
  
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
      
      // Include AI-generated images as base64 attachments
      if (attachedImages.length > 0) {
        payload.attachments = attachedImages.map(img => ({
          filename: img.name,
          content: img.data.split(',')[1], // Remove data:image/png;base64, prefix
          contentType: 'image/png',
        }));
      }
      
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
    setShowAiOptions(false);
    setAiTone("professional");
    setAiInstructions("");
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

  // Extract user content (exclude original quote)
  const getUserContent = () => {
    if (body.includes("---------- Original message ----------")) {
      return body.substring(0, body.indexOf("---------- Original message ----------") - 2).trim();
    }
    if (body.includes("---------- Forwarded message ----------")) {
      return body.substring(0, body.indexOf("---------- Forwarded message ----------") - 2).trim();
    }
    return body.trim();
  };

  // AI Reply mutation - for all modes (5/day limit for free)
  const aiReplyMutation = useMutation({
    mutationFn: async () => {
      const userContent = getUserContent();
      setPreviousBody(body);
      setIsGenerating(true);
      setBody(userContent ? "Improving draft..." : "Generating draft...");
      
      const response = await apiRequest("POST", "/api/drafts/quick-generate", {
        mode,
        originalEmail: originalEmail ? {
          from: originalEmail.from,
          fromEmail: originalEmail.fromEmail,
          subject: originalEmail.subject,
          body: originalEmail.body,
        } : undefined,
        instructions: aiInstructions.trim() || undefined,
        tone: aiTone,
        existingBody: userContent || undefined,
      });
      return response.json();
    },
    onSuccess: (data: { subject?: string; body?: string; usage?: { used: number; limit: number; remaining: number } }) => {
      setIsGenerating(false);
      setShowAiOptions(false);
      setAiInstructions("");
      
      if (userPlan === "free") {
        refetchAiUsage();
      }
      
      if (data.body) {
        const originalQuote = previousBody.includes("---------- Original message ----------") 
          ? previousBody.substring(previousBody.indexOf("---------- Original message ----------") - 2)
          : previousBody.includes("---------- Forwarded message ----------")
          ? previousBody.substring(previousBody.indexOf("---------- Forwarded message ----------") - 2)
          : "";
        setBody(data.body + originalQuote);
        
        // Set the AI-generated subject in the subject field
        if (data.subject) {
          setSubject(data.subject);
        }
        
        const hasUserContent = getUserContent();
        if (data.usage && data.usage.remaining >= 0) {
          toast({
            title: hasUserContent ? "Draft improved" : "Draft generated",
            description: `${data.usage.remaining} AI uses remaining today`,
          });
        } else {
          toast({
            title: hasUserContent ? "Draft improved" : "Draft generated",
            description: "Your AI-powered draft is ready",
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
        title: "Failed to generate",
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

  // AI Refine mutation - for modifying draft based on user instructions
  const aiRefineMutation = useMutation({
    mutationFn: async (instruction: string) => {
      // Extract user's written content (before the original message quote)
      const userContent = body.includes("---------- Original message ----------")
        ? body.substring(0, body.indexOf("---------- Original message ----------") - 2).trim()
        : body.includes("---------- Forwarded message ----------")
        ? body.substring(0, body.indexOf("---------- Forwarded message ----------") - 2).trim()
        : body.trim();
      
      if (!userContent) {
        throw new Error("Please write or generate some content first");
      }
      
      setIsRefining(true);
      setPreviousBody(body);
      
      const response = await apiRequest("POST", "/api/ai/refine", {
        text: userContent,
        instruction,
        originalEmail: originalEmail ? {
          sender: originalEmail.from,
          senderEmail: originalEmail.fromEmail,
          subject: originalEmail.subject,
          body: originalEmail.body,
        } : undefined,
      });
      return response.json();
    },
    onSuccess: (data: { refined?: string }) => {
      setIsRefining(false);
      setRefineInput("");
      
      if (data.refined) {
        // Preserve original quote if present
        const originalQuote = previousBody.includes("---------- Original message ----------") 
          ? previousBody.substring(previousBody.indexOf("---------- Original message ----------") - 2)
          : previousBody.includes("---------- Forwarded message ----------")
          ? previousBody.substring(previousBody.indexOf("---------- Forwarded message ----------") - 2)
          : "";
        setBody(data.refined + originalQuote);
        
        toast({
          title: "Draft updated",
          description: "Your message has been modified as requested",
        });
      } else {
        setBody(previousBody);
      }
    },
    onError: (error: Error) => {
      setIsRefining(false);
      setBody(previousBody);
      toast({
        title: "Failed to refine",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // AI Image generation handler
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Enter a description",
        description: "Describe the image you want to create",
        variant: "destructive",
      });
      return;
    }
    
    if (!isPro) {
      toast({
        title: "Pro feature",
        description: "AI image generation requires Pro plan or higher",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingImage(true);
    
    try {
      const response = await apiRequest("POST", "/api/generate-image", {
        prompt: imagePrompt,
        size: "512x512",
      });
      
      const data = await response.json();
      
      if (data.b64_json) {
        // Add the base64 image to the list
        setGeneratedImages(prev => [...prev, `data:image/png;base64,${data.b64_json}`]);
        setImagePrompt("");
        toast({
          title: "Image generated",
          description: "Click on the image to insert it into your email",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to generate image",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  // Insert image into email body
  const insertImageToBody = (imageUrl: string) => {
    const imageName = `ai-image-${attachedImages.length + 1}.png`;
    
    // Add to attached images for sending
    setAttachedImages(prev => [...prev, { data: imageUrl, name: imageName }]);
    
    // Add a reference in the body
    setBody(prev => prev + `\n[Attached: ${imageName}]\n`);
    
    toast({
      title: "Image attached",
      description: `${imageName} will be sent with your email`,
    });
    setShowImageGenerator(false);
  };
  
  // Remove attached image
  const removeAttachedImage = (index: number) => {
    const imageName = attachedImages[index]?.name;
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
    // Remove reference from body
    if (imageName) {
      setBody(prev => prev.replace(`\n[Attached: ${imageName}]\n`, ''));
    }
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refineInput.trim() && !isRefining && hasUserContent()) {
      aiRefineMutation.mutate(refineInput.trim());
    }
  };

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
      <DialogContent className="max-w-[640px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
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
          <div className="flex-1 min-h-0 px-6 py-4 flex flex-col">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="flex-1 min-h-[180px] resize-none border-0 bg-transparent px-0 text-base leading-relaxed placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="textarea-compose-body"
            />
            
            {/* Attached Images Preview */}
            {attachedImages.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <FileImage className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">AI Generated Attachments ({attachedImages.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={img.data} 
                        alt={img.name}
                        className="w-16 h-16 object-cover rounded-md border border-border"
                      />
                      <button
                        onClick={() => removeAttachedImage(idx)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-remove-image-${idx}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-muted-foreground truncate block w-16 text-center">{img.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* AI Refine Bar - only show when there's content */}
            {hasUserContent() && (
              <form onSubmit={handleRefineSubmit} className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 bg-muted/30 rounded-lg px-3 py-2 border border-border/40">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    <Input
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      placeholder="Ask AI to change something... (e.g., make it shorter, add a thank you)"
                      className="flex-1 border-0 bg-transparent px-0 h-7 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={isRefining || isGenerating}
                      data-testid="input-ai-refine"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={!refineInput.trim() || isRefining || isGenerating}
                    className="h-9 px-3 border-primary/30 bg-primary/5 text-primary"
                    data-testid="button-ai-refine"
                  >
                    {isRefining ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
        
        {/* Footer Actions - Minimalist */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-border/50">
          <div className="flex items-center justify-between gap-3">
            {/* Left - Discard + AI Menu */}
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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isGenerating || sendMutation.isPending}
                    className="h-9 gap-2 text-primary"
                    data-testid="button-ai-menu"
                    title="AI features"
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isGenerating ? "Writing..." : userPlan === "free" ? `AI (${aiRemaining}/5)` : "AI"}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={() => aiReplyMutation.mutate()}
                    disabled={isGenerating || sendMutation.isPending || aiLimitReached}
                    data-testid="button-ai-draft"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {getUserContent() ? "Improve Draft" : "Generate Draft"}
                    {aiLimitReached && <span className="text-xs text-destructive ml-auto">Limit</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => aiPolishMutation.mutate("polish")}
                    disabled={isGenerating || sendMutation.isPending || !hasUserContent()}
                    data-testid="button-polish-improve"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Polish Writing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => isPro ? aiPolishMutation.mutate("shorter") : toast({ title: "Pro feature", description: "Upgrade to Pro for this feature" })}
                    disabled={isGenerating || sendMutation.isPending || !hasUserContent()}
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
                    onClick={() => isPro ? aiPolishMutation.mutate("longer") : toast({ title: "Pro feature", description: "Upgrade to Pro for this feature" })}
                    disabled={isGenerating || sendMutation.isPending || !hasUserContent()}
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
                    onClick={() => isPro ? aiPolishMutation.mutate("concise") : toast({ title: "Pro feature", description: "Upgrade to Pro for this feature" })}
                    disabled={isGenerating || sendMutation.isPending || !hasUserContent()}
                    className="flex items-center justify-between"
                    data-testid="button-polish-concise"
                  >
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      More Concise
                    </div>
                    {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowAiOptions(true)}
                    data-testid="button-ai-options"
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Tone & Instructions
                  </DropdownMenuItem>
                  {isPro && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowImageGenerator(true)}
                        disabled={isGenerating || sendMutation.isPending || isGeneratingImage}
                        data-testid="button-ai-create"
                      >
                        <FileImage className="w-4 h-4 mr-2" />
                        Generate Image
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* AI Options Popover (triggered from menu) */}
            <Popover open={showAiOptions} onOpenChange={setShowAiOptions}>
              <PopoverTrigger asChild>
                <span className="hidden" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-4" data-testid="popover-ai-options">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Draft Options
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Tone</label>
                    <Select value={aiTone} onValueChange={setAiTone}>
                      <SelectTrigger className="w-full" data-testid="select-ai-tone">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Instructions (optional)</label>
                    <Textarea
                      value={aiInstructions}
                      onChange={(e) => setAiInstructions(e.target.value)}
                      placeholder="e.g., Add a call to action, mention the deadline..."
                      className="min-h-[70px] text-sm resize-none"
                      data-testid="textarea-ai-instructions"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setShowAiOptions(false);
                      aiReplyMutation.mutate();
                    }}
                    disabled={isGenerating || sendMutation.isPending || aiLimitReached}
                    data-testid="button-generate-draft"
                  >
                    {isGenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {getUserContent() ? "Improve Draft" : "Generate Draft"}
                  </Button>
                  {getUserContent() && (
                    <p className="text-xs text-muted-foreground">
                      AI will read your text and improve it based on tone and instructions.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Image Generator Popover (triggered from menu) - Pro only */}
            {isPro && (
              <Popover open={showImageGenerator} onOpenChange={setShowImageGenerator}>
                <PopoverTrigger asChild>
                  <span className="hidden" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-4" data-testid="popover-ai-create">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Image className="w-4 h-4 text-primary" />
                      Generate AI Image
                    </div>
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe the image... e.g., 'A professional business chart showing growth'"
                      className="min-h-[80px] text-sm resize-none"
                      data-testid="textarea-image-prompt"
                    />
                    <Button
                      className="w-full gap-2"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || !imagePrompt.trim()}
                      data-testid="button-generate-image"
                    >
                      {isGeneratingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Image className="w-4 h-4" />
                      )}
                      {isGeneratingImage ? "Generating..." : "Generate Image"}
                    </Button>
                    {generatedImages.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground">Click to insert:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {generatedImages.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => insertImageToBody(img)}
                              className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                              data-testid={`button-insert-image-${idx}`}
                            >
                              <img src={img} alt={`Generated ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      AI images will be attached to your email when sent.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
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
