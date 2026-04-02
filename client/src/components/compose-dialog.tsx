import { useState, useEffect, useRef, useCallback, ChangeEvent } from "react";
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
import { Send, X, ChevronDown, ChevronUp, Undo2, Sparkles, Clock, Calendar as CalendarIcon, Mail, User, Users, Forward, Wand2, ArrowUpRight, ArrowDownRight, FileText, Lock, MessageSquare, Settings2, Image, FileImage, Loader2, Paperclip, File, PenLine, SpellCheck, Check, AlertCircle } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { EmailAutocomplete } from "@/components/email-autocomplete";
import { useScreenSize } from "@/hooks/use-screen-size";

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
    emailSignature?: string | null;
    signatureEnabled?: boolean;
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
  const screen = useScreenSize();
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
  
  // Grammar check state
  const [grammarSuggestions, setGrammarSuggestions] = useState<{
    suggestions: { type: string; original: string; replacement: string; explanation: string }[];
    overallScore: number;
    correctedText: string;
  } | null>(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  
  // AI Image generation state
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [attachedImages, setAttachedImages] = useState<{data: string, name: string}[]>([]);
  
  // File attachments state
  const [fileAttachments, setFileAttachments] = useState<{name: string, size: number, type: string, data: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user plan for feature gating
  const { data: userData } = useQuery<UserData>({
    queryKey: ["/api/auth/me"],
  });
  const userPlan = userData?.user?.plan || "free";
  const isPro = userPlan === "pro" || userPlan === "premium" || userPlan === "business";
  const canScheduleSend = isPro;
  
  const userSignature = userData?.user?.emailSignature || "";
  const signatureEnabled = userData?.user?.signatureEnabled || false;
  const hasSignature = signatureEnabled && userSignature.trim().length > 0;
  const [signatureSuggestionDismissed, setSignatureSuggestionDismissed] = useState(false);
  
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

  const signatureBlock = hasSignature ? `\n\n--\n${userSignature}` : "";
  const signatureHtmlBlock = hasSignature ? `<br><br><div style="color:#666;">--<br>${userSignature.replace(/\n/g, '<br>')}</div>` : "";
  const bodyContainsSignature = hasSignature && (body.includes(`--\n${userSignature.trim()}`) || body.includes(`--<br>${userSignature.trim().replace(/\n/g, '<br>')}`));

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
        setBody(hasSignature ? signatureHtmlBlock : "");
        setShowCcBcc(false);
        setSignatureSuggestionDismissed(false);
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
    setSignatureSuggestionDismissed(false);
    
    // Reset showCcBcc based on mode
    setShowCcBcc(mode === "replyAll");
    setBcc("");
    
    if (mode === "reply") {
      setTo(originalEmail.fromEmail);
      setCc("");
      setSubject(originalEmail.subject.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      const sigHtml = hasSignature ? `<br><br><div style="color:#666;">--<br>${userSignature.replace(/\n/g, '<br>')}</div>` : "";
      const quotedHtml = `<br><br><blockquote data-quote="original" style="border-left:2px solid #ccc;padding-left:12px;margin:0;color:#555;"><div style="font-size:12px;color:#777;margin-bottom:8px;">On ${date}, ${originalEmail.from} &lt;${originalEmail.fromEmail}&gt; wrote:</div>${originalEmail.body}</blockquote>`;
      setBody(sigHtml + quotedHtml);
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
      const sigHtml = hasSignature ? `<br><br><div style="color:#666;">--<br>${userSignature.replace(/\n/g, '<br>')}</div>` : "";
      const quotedHtml = `<br><br><blockquote data-quote="original" style="border-left:2px solid #ccc;padding-left:12px;margin:0;color:#555;"><div style="font-size:12px;color:#777;margin-bottom:8px;">On ${date}, ${originalEmail.from} &lt;${originalEmail.fromEmail}&gt; wrote:</div>${originalEmail.body}</blockquote>`;
      setBody(sigHtml + quotedHtml);
    } else if (mode === "forward") {
      setTo("");
      setCc("");
      setSubject(originalEmail.subject.startsWith("Fwd:") ? originalEmail.subject : `Fwd: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      const sigHtml = hasSignature ? `<br><br><div style="color:#666;">--<br>${userSignature.replace(/\n/g, '<br>')}</div>` : "";
      const quotedHtml = `<br><br><blockquote data-quote="original" style="border-left:2px solid #ccc;padding-left:12px;margin:0;color:#555;"><div style="font-size:12px;color:#777;margin-bottom:8px;">---------- Forwarded message ----------<br>From: ${originalEmail.from} &lt;${originalEmail.fromEmail}&gt;<br>Date: ${date}<br>Subject: ${originalEmail.subject}</div>${originalEmail.body}</blockquote>`;
      setBody(sigHtml + quotedHtml);
    }
  }, [open, mode, originalEmail, currentUserEmail, hasSignature, signatureBlock]);

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
        queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
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
      
      // Combine file attachments and AI-generated images
      const allAttachments: {filename: string, content: string, contentType: string}[] = [];
      
      // Add user-selected file attachments
      fileAttachments.forEach(file => {
        allAttachments.push({
          filename: file.name,
          content: file.data,
          contentType: file.type,
        });
      });
      
      // Add AI-generated images
      attachedImages.forEach(img => {
        allAttachments.push({
          filename: img.name,
          content: img.data.split(',')[1], // Remove data:image/png;base64, prefix
          contentType: 'image/png',
        });
      });
      
      if (allAttachments.length > 0) {
        payload.attachments = allAttachments;
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
        queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
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
    setSignatureSuggestionDismissed(false);
    setShowAiOptions(false);
    setAiTone("professional");
    setAiInstructions("");
    setFileAttachments([]);
    setAttachedImages([]);
    setGeneratedImages([]);
    setGrammarSuggestions(null);
    setDismissedSuggestions(new Set());
    setIsCheckingGrammar(false);
    initializedRef.current = false;
    lastEmailIdRef.current = undefined;
  };

  // File attachment handlers
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const maxFileSize = 25 * 1024 * 1024; // 25MB max per file
    const maxTotalSize = 50 * 1024 * 1024; // 50MB total
    
    // Blocked file types for security
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.dll', '.vbs', '.js', '.jar', '.msi', '.ps1', '.sh'];
    
    // Calculate current total and new files total
    const currentTotalSize = fileAttachments.reduce((sum, f) => sum + f.size, 0);
    const newFilesArray = Array.from(files);
    const newFilesTotalSize = newFilesArray.reduce((sum, f) => sum + f.size, 0);
    
    // Check if batch would exceed total limit
    if (currentTotalSize + newFilesTotalSize > maxTotalSize) {
      toast({
        title: "Total size exceeded",
        description: "Maximum total attachment size is 50MB",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }
    
    // Track running total for individual files
    let runningTotal = currentTotalSize;
    
    newFilesArray.forEach(file => {
      // Check file extension
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (blockedExtensions.includes(ext)) {
        toast({
          title: "File type not allowed",
          description: `${file.name} - this file type is blocked for security`,
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 25MB limit`,
          variant: "destructive",
        });
        return;
      }
      
      if (runningTotal + file.size > maxTotalSize) {
        toast({
          title: "Total size exceeded",
          description: `Cannot add ${file.name} - would exceed 50MB total`,
          variant: "destructive",
        });
        return;
      }
      
      runningTotal += file.size;
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFileAttachments(prev => [...prev, {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: base64.split(',')[1] // Remove data URL prefix
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input to allow re-selecting same file
    e.target.value = '';
  };
  
  const removeFileAttachment = (index: number) => {
    setFileAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const stripHtmlTags = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const getUserContent = () => {
    const quoteIdx = body.indexOf('data-quote="original"');
    if (quoteIdx !== -1) {
      const tagStart = body.lastIndexOf("<blockquote", quoteIdx);
      if (tagStart > 0) {
        return body.substring(0, tagStart).replace(/<br\s*\/?>\s*$/gi, "").trim();
      }
    }
    if (body.includes("---------- Original message ----------")) {
      return body.substring(0, body.indexOf("---------- Original message ----------") - 2).trim();
    }
    if (body.includes("---------- Forwarded message ----------")) {
      return body.substring(0, body.indexOf("---------- Forwarded message ----------") - 2).trim();
    }
    return body.trim();
  };

  const hasUserContent = () => {
    const content = getUserContent();
    return stripHtmlTags(content).trim().length > 0;
  };

  // AI Reply mutation - for all modes (5/day limit for free)
  const aiReplyMutation = useMutation({
    mutationFn: async () => {
      const userContent = getUserContent();
      const plainUserContent = stripHtmlTags(userContent).trim();
      setPreviousBody(body);
      setIsGenerating(true);
      setBody(plainUserContent ? "Improving draft..." : "Generating draft...");
      
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
        existingBody: plainUserContent || undefined,
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
        const draftHtml = data.body.replace(/\n/g, '<br>');
        const quoteMarker = previousBody.indexOf("border-left:2px solid #ccc");
        let originalQuote = "";
        if (quoteMarker !== -1) {
          const divStart = previousBody.lastIndexOf("<div", quoteMarker);
          if (divStart > 0) {
            originalQuote = previousBody.substring(divStart);
          }
        } else if (previousBody.includes("---------- Original message ----------")) {
          originalQuote = previousBody.substring(previousBody.indexOf("---------- Original message ----------") - 2);
        } else if (previousBody.includes("---------- Forwarded message ----------")) {
          originalQuote = previousBody.substring(previousBody.indexOf("---------- Forwarded message ----------") - 2);
        }
        setBody(draftHtml + (originalQuote ? "<br><br>" + originalQuote : ""));
        
        // Set the AI-generated subject in the subject field
        if (data.subject) {
          setSubject(data.subject);
        }
        
        const hadExistingContent = stripHtmlTags(getUserContent()).trim().length > 0;
        if (data.usage && data.usage.remaining >= 0) {
          toast({
            title: hadExistingContent ? "Draft improved" : "Draft generated",
            description: `${data.usage.remaining} AI uses remaining today`,
          });
        } else {
          toast({
            title: hadExistingContent ? "Draft improved" : "Draft generated",
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

  const getOriginalQuote = (fromBody: string) => {
    const quoteIdx = fromBody.indexOf('data-quote="original"');
    if (quoteIdx !== -1) {
      const tagStart = fromBody.lastIndexOf("<blockquote", quoteIdx);
      if (tagStart > 0) return "<br><br>" + fromBody.substring(tagStart);
    }
    if (fromBody.includes("---------- Original message ----------")) {
      return fromBody.substring(fromBody.indexOf("---------- Original message ----------") - 2);
    }
    if (fromBody.includes("---------- Forwarded message ----------")) {
      return fromBody.substring(fromBody.indexOf("---------- Forwarded message ----------") - 2);
    }
    return "";
  };

  const aiPolishMutation = useMutation({
    mutationFn: async (polishType: "polish" | "longer" | "shorter" | "concise") => {
      const userContent = getUserContent();
      const plainContent = stripHtmlTags(userContent);
      
      if (!plainContent.trim()) {
        throw new Error("Please write some content first");
      }
      
      setPreviousBody(body);
      setIsGenerating(true);
      
      const response = await apiRequest("POST", "/api/drafts/polish", {
        content: plainContent,
        polishType,
        subject,
      });
      return response.json();
    },
    onSuccess: (data: { content?: string }) => {
      setIsGenerating(false);
      
      if (data.content) {
        const polishedHtml = data.content.replace(/\n/g, '<br>');
        const originalQuote = getOriginalQuote(previousBody);
        setBody(polishedHtml + originalQuote);
        
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

  const aiRefineMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const userContent = getUserContent();
      const plainContent = stripHtmlTags(userContent);
      
      if (!plainContent.trim()) {
        throw new Error("Please write or generate some content first");
      }
      
      setIsRefining(true);
      setPreviousBody(body);
      
      const response = await apiRequest("POST", "/api/ai/refine", {
        text: plainContent,
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
        const refinedHtml = data.refined.replace(/\n/g, '<br>');
        const originalQuote = getOriginalQuote(previousBody);
        setBody(refinedHtml + originalQuote);
        
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

  const grammarCheckMutation = useMutation({
    mutationFn: async () => {
      const userContent = getUserContent();
      const plainContent = stripHtmlTags(userContent);
      if (!plainContent || plainContent.trim().length < 5) {
        throw new Error("Write at least a few words before checking");
      }
      setIsCheckingGrammar(true);
      const response = await apiRequest("POST", "/api/ai/grammar-check", {
        text: plainContent,
      });
      return response.json();
    },
    onSuccess: (data: { suggestions: { type: string; original: string; replacement: string; explanation: string }[]; overallScore: number; correctedText: string }) => {
      setIsCheckingGrammar(false);
      setDismissedSuggestions(new Set());
      if (!data.suggestions || data.suggestions.length === 0) {
        setGrammarSuggestions(null);
        toast({ title: "Looking good", description: "No grammar or style issues found." });
      } else {
        setGrammarSuggestions(data);
        toast({
          title: `${data.suggestions.length} suggestion${data.suggestions.length !== 1 ? "s" : ""} found`,
          description: `Writing score: ${data.overallScore}/10`,
        });
      }
    },
    onError: (error: Error) => {
      setIsCheckingGrammar(false);
      toast({ title: "Grammar check failed", description: error.message, variant: "destructive" });
    },
  });

  const applySuggestion = (index: number) => {
    if (!grammarSuggestions) return;
    const suggestion = grammarSuggestions.suggestions[index];
    if (!suggestion) return;
    let newBody = body.replace(suggestion.original, suggestion.replacement);
    if (newBody === body) {
      const escaped = suggestion.original
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const escapedReplacement = suggestion.replacement
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      newBody = body.replace(escaped, escapedReplacement);
    }
    setBody(newBody);
    setDismissedSuggestions((prev) => new Set([...prev, index]));
  };

  const applyAllSuggestions = () => {
    if (!grammarSuggestions?.correctedText) return;
    const correctedHtml = grammarSuggestions.correctedText.replace(/\n/g, '<br>');
    const originalQuote = getOriginalQuote(body);
    setBody(correctedHtml + originalQuote);
    setGrammarSuggestions(null);
    setDismissedSuggestions(new Set());
    toast({ title: "All suggestions applied", description: "Your draft has been updated." });
  };

  const dismissGrammarCheck = () => {
    setGrammarSuggestions(null);
    setDismissedSuggestions(new Set());
  };

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
    const iconSize = screen.isMobile ? "w-5 h-5" : "w-4 h-4";
    switch (mode) {
      case "reply": return <Mail className={iconSize} />;
      case "replyAll": return <Users className={iconSize} />;
      case "forward": return <Forward className={iconSize} />;
      default: return <Mail className={iconSize} />;
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${screen.isMobile ? 'w-full h-[100dvh] max-w-full max-h-full rounded-none !left-0 !top-0 !translate-x-0 !translate-y-0 mobile-slide-up' : 'max-w-[640px] max-h-[85vh] rounded-2xl'} flex flex-col p-0 gap-0 overflow-hidden border-black/10 dark:border-white/10 backdrop-blur-2xl`} style={{ background: screen.isMobile ? "rgba(var(--background-rgb, 10,10,12), 1)" : "rgba(var(--background-rgb, 10,10,12), 0.95)" }}>
        {/* Header */}
        <DialogHeader className={`flex-shrink-0 ${screen.isMobile ? 'px-5 py-4' : 'px-5 py-3.5'} border-b border-black/[0.06] dark:border-white/[0.06]`}>
          <DialogTitle className={`flex items-center ${screen.isMobile ? 'gap-3 text-base' : 'gap-2.5 text-sm'} font-medium`}>
            <div className={`${screen.isMobile ? 'w-9 h-9' : 'w-7 h-7'} rounded-lg flex items-center justify-center border border-primary/20`} style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(147,51,234,0.1))" }}>
              <div className="text-primary">{getModeIcon()}</div>
            </div>
            <span className="text-foreground/90">{getDialogTitle()}</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Form Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Recipients Section */}
          <div className="px-5 py-3 space-y-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
            {/* To Field */}
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-foreground/30 font-medium w-6 text-right">To</span>
              <div className="flex-1 relative">
                <EmailAutocomplete
                  value={to}
                  onChange={setTo}
                  placeholder="Recipients"
                  className="border-0 bg-transparent px-0 h-8 text-sm placeholder:text-foreground/25 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-compose-to"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                {showCcBcc ? "Hide" : "Cc/Bcc"}
                {showCcBcc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            
            {/* Cc/Bcc Fields */}
            <div className={`space-y-2 overflow-hidden transition-all duration-200 ${showCcBcc ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-foreground/30 font-medium w-6 text-right">Cc</span>
                <EmailAutocomplete
                  value={cc}
                  onChange={setCc}
                  placeholder="Carbon copy"
                  className="border-0 bg-transparent px-0 h-8 text-sm placeholder:text-foreground/25 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-compose-cc"
                />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-foreground/30 font-medium w-6 text-right">Bcc</span>
                <EmailAutocomplete
                  value={bcc}
                  onChange={setBcc}
                  placeholder="Blind copy"
                  className="border-0 bg-transparent px-0 h-8 text-sm placeholder:text-foreground/25 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-compose-bcc"
                />
              </div>
            </div>
            
            {/* Subject Field */}
            <div className="flex items-center gap-2.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[11px] text-foreground/30 font-medium w-6 text-right">Sub</span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 border-0 bg-transparent px-0 h-8 text-sm font-medium placeholder:text-foreground/25 focus-visible:ring-0 focus-visible:ring-offset-0"
                data-testid="input-compose-subject"
              />
            </div>
          </div>
          
          {/* Message Body */}
          <div className="flex-1 min-h-0 flex flex-col">
            <RichTextEditor
              value={body}
              onChange={(html) => {
                setBody(html);
                if (grammarSuggestions) {
                  setGrammarSuggestions(null);
                  setDismissedSuggestions(new Set());
                }
              }}
              placeholder="Write your message..."
              data-testid="textarea-compose-body"
            />

            {hasSignature && !bodyContainsSignature && !signatureSuggestionDismissed && stripHtmlTags(body).trim().length > 0 && (
              <div
                className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                }}
                data-testid="banner-signature-suggestion"
              >
                <PenLine className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-foreground/60 flex-1">Add your email signature?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-indigo-400"
                  onClick={() => {
                    const quoteMarker = body.indexOf("border-left:2px solid #ccc");
                    if (quoteMarker !== -1) {
                      const divStart = body.lastIndexOf("<div", quoteMarker);
                      if (divStart > 0) {
                        setBody(body.slice(0, divStart) + signatureHtmlBlock + body.slice(divStart));
                      } else {
                        setBody(body + signatureHtmlBlock);
                      }
                    } else {
                      setBody(prev => prev + signatureHtmlBlock);
                    }
                    setSignatureSuggestionDismissed(true);
                  }}
                  data-testid="button-add-signature"
                >
                  Add
                </Button>
                <button
                  onClick={() => setSignatureSuggestionDismissed(true)}
                  className="text-foreground/20 hover:text-foreground/40 transition-colors cursor-pointer"
                  data-testid="button-dismiss-signature"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Attached Images Preview */}
            {attachedImages.length > 0 && (
              <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <FileImage className="w-3.5 h-3.5 text-foreground/30" />
                  <span className="text-[11px] text-foreground/30">AI Images ({attachedImages.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={img.data} 
                        alt={img.name}
                        className="w-14 h-14 object-cover rounded-lg border border-black/10 dark:border-white/10"
                      />
                      <button
                        onClick={() => removeAttachedImage(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        data-testid={`button-remove-image-${idx}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="text-[9px] text-foreground/25 truncate block w-14 text-center mt-0.5">{img.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Grammar & Style Suggestions */}
            {grammarSuggestions && grammarSuggestions.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SpellCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-foreground/70">
                      {grammarSuggestions.suggestions.filter((_, i) => !dismissedSuggestions.has(i)).length} suggestion{grammarSuggestions.suggestions.filter((_, i) => !dismissedSuggestions.has(i)).length !== 1 ? "s" : ""}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-400">
                      Score: {grammarSuggestions.overallScore}/10
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {grammarSuggestions.suggestions.filter((_, i) => !dismissedSuggestions.has(i)).length > 1 && (
                      <button
                        type="button"
                        onClick={applyAllSuggestions}
                        className="text-[10px] text-primary hover:text-primary/80 px-2 py-0.5 rounded-full hover:bg-primary/5 transition-colors cursor-pointer"
                        data-testid="button-apply-all-suggestions"
                      >
                        Apply All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={dismissGrammarCheck}
                      className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-foreground/30 hover:text-foreground/50 transition-colors cursor-pointer"
                      data-testid="button-dismiss-grammar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {grammarSuggestions.suggestions.map((s, i) => {
                    if (dismissedSuggestions.has(i)) return null;
                    const typeColors: Record<string, string> = {
                      grammar: "text-red-400 border-red-500/20 bg-red-500/5",
                      spelling: "text-red-400 border-red-500/20 bg-red-500/5",
                      style: "text-blue-400 border-blue-500/20 bg-blue-500/5",
                      tone: "text-purple-400 border-purple-500/20 bg-purple-500/5",
                      clarity: "text-amber-400 border-amber-500/20 bg-amber-500/5",
                    };
                    const color = typeColors[s.type] || typeColors.style;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2 rounded-lg border border-black/[0.04] dark:border-white/[0.04]"
                        style={{ background: "rgba(var(--overlay-rgb), 0.02)" }}
                        data-testid={`grammar-suggestion-${i}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0 rounded border ${color}`}>
                              {s.type}
                            </span>
                            <span className="text-[10px] text-foreground/40 truncate">{s.explanation}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-red-400/70 line-through">{s.original}</span>
                            <span className="text-foreground/30 mx-1.5">&rarr;</span>
                            <span className="text-green-400/80">{s.replacement}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => applySuggestion(i)}
                            className="p-1 rounded hover:bg-green-500/10 text-green-400/60 hover:text-green-400 transition-colors cursor-pointer"
                            title="Apply this suggestion"
                            data-testid={`button-apply-suggestion-${i}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDismissedSuggestions((prev) => new Set([...prev, i]))}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-foreground/20 hover:text-foreground/40 transition-colors cursor-pointer"
                            title="Dismiss"
                            data-testid={`button-dismiss-suggestion-${i}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* AI Refine Bar - only show when there's content */}
            {hasUserContent() && (
              <form onSubmit={handleRefineSubmit} className="mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 flex-1 rounded-full ${screen.isMobile ? 'px-3.5 py-2' : 'px-3 py-1.5'} border border-black/[0.06] dark:border-white/[0.06]`} style={{ background: "rgba(var(--overlay-rgb), 0.02)" }}>
                    <Sparkles className={`${screen.isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-primary/60 flex-shrink-0`} />
                    <Input
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      placeholder="Ask AI to refine..."
                      className={`flex-1 border-0 bg-transparent px-0 ${screen.isMobile ? 'h-8 text-[13px]' : 'h-7 text-xs'} placeholder:text-foreground/20 focus-visible:ring-0 focus-visible:ring-offset-0`}
                      disabled={isRefining || isGenerating}
                      data-testid="input-ai-refine"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!refineInput.trim() || isRefining || isGenerating}
                    className={`${screen.isMobile ? 'w-10 h-10' : 'w-8 h-8'} rounded-full flex items-center justify-center border border-primary/20 text-primary disabled:opacity-30 transition-all cursor-pointer`}
                    style={{ background: "rgba(59,130,246,0.08)" }}
                    data-testid="button-ai-refine"
                  >
                    {isRefining ? (
                      <div className={`${screen.isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} border-2 border-primary border-t-transparent rounded-full animate-spin`} />
                    ) : (
                      <Send className={`${screen.isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        
        {/* Attachments Preview */}
        {(fileAttachments.length > 0 || attachedImages.length > 0) && (
          <div className={`flex-shrink-0 ${screen.isMobile ? 'px-4 py-2.5' : 'px-5 py-2'} border-t border-black/[0.04] dark:border-white/[0.04]`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Paperclip className={`${screen.isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-foreground/25`} />
              <span className={`${screen.isMobile ? 'text-xs' : 'text-[10px]'} font-medium text-foreground/30`}>
                {fileAttachments.length + attachedImages.length} file{fileAttachments.length + attachedImages.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={`flex flex-wrap ${screen.isMobile ? 'gap-2' : 'gap-1.5'}`}>
              {fileAttachments.map((file, idx) => {
                const isImage = file.type.startsWith('image/');
                return (
                  <div
                    key={`file-${idx}`}
                    className={`flex items-center ${screen.isMobile ? 'gap-2 px-3 py-2 text-xs' : 'gap-1.5 px-2 py-1 text-[11px]'} rounded-full border border-black/[0.08] dark:border-white/[0.08] group`}
                    style={{ background: "rgba(var(--overlay-rgb), 0.03)" }}
                    data-testid={`attachment-file-${idx}`}
                  >
                    {isImage ? (
                      <Image className={`${screen.isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-blue-400/60`} />
                    ) : (
                      <File className={`${screen.isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-foreground/30`} />
                    )}
                    <span className="max-w-[100px] truncate text-foreground/60">{file.name}</span>
                    <span className="text-foreground/20">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFileAttachment(idx)}
                      className={`${screen.isMobile ? 'p-1' : 'p-0.5'} rounded-full hover:bg-red-500/20 text-foreground/20 hover:text-red-400 transition-colors cursor-pointer`}
                      data-testid={`button-remove-file-${idx}`}
                    >
                      <X className={`${screen.isMobile ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                    </button>
                  </div>
                );
              })}
              {attachedImages.map((img, idx) => (
                <div
                  key={`ai-img-${idx}`}
                  className={`flex items-center ${screen.isMobile ? 'gap-2 px-3 py-2 text-xs' : 'gap-1.5 px-2 py-1 text-[11px]'} rounded-full border border-primary/15`}
                  style={{ background: "rgba(59,130,246,0.05)" }}
                  data-testid={`attachment-ai-image-${idx}`}
                >
                  <Sparkles className={`${screen.isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-primary/50`} />
                  <span className="max-w-[100px] truncate text-foreground/60">{img.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                    className={`${screen.isMobile ? 'p-1' : 'p-0.5'} rounded-full hover:bg-red-500/20 text-foreground/20 hover:text-red-400 transition-colors cursor-pointer`}
                    data-testid={`button-remove-ai-image-${idx}`}
                  >
                    <X className={`${screen.isMobile ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className={`flex-shrink-0 ${screen.isMobile ? 'px-4 py-3.5 safe-area-bottom' : 'px-5 py-2.5'} border-t border-black/[0.04] dark:border-white/[0.04]`}>
          <div className="flex items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
              data-testid="input-file-attachment"
            />
            
            <div className={`flex items-center ${screen.isMobile ? 'gap-1.5' : 'gap-1'}`}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendMutation.isPending}
                className={`${screen.isMobile ? 'w-11 h-11' : 'w-8 h-8'} rounded-full flex items-center justify-center text-foreground/40 hover:text-foreground/60 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30`}
                data-testid="button-attach-file"
                title="Attach files"
              >
                <Paperclip className={`${screen.isMobile ? 'w-[22px] h-[22px]' : 'w-4 h-4'}`} />
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isGenerating || sendMutation.isPending}
                    className={`${screen.isMobile ? 'h-11 px-4 text-sm' : 'h-8 px-3 text-xs'} rounded-full flex items-center gap-1.5 text-primary/70 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 font-medium`}
                    data-testid="button-ai-menu"
                    title="AI features"
                  >
                    {isGenerating ? (
                      <div className={`${screen.isMobile ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'} border-2 border-primary border-t-transparent rounded-full animate-spin`} />
                    ) : (
                      <Sparkles className={`${screen.isMobile ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'}`} />
                    )}
                    <span>{isGenerating ? "Writing..." : userPlan === "free" ? `AI (${aiRemaining}/5)` : "AI"}</span>
                    <ChevronDown className={`${screen.isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'} opacity-50`} />
                  </button>
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
                    onClick={() => grammarCheckMutation.mutate()}
                    disabled={isGenerating || sendMutation.isPending || !hasUserContent() || isCheckingGrammar}
                    data-testid="button-grammar-check"
                  >
                    <SpellCheck className="w-4 h-4 mr-2" />
                    {isCheckingGrammar ? "Checking..." : "Check Grammar & Style"}
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
            <div className={`flex items-center ${screen.isMobile ? 'gap-2' : 'gap-1.5'}`}>
              {/* Schedule Send - Pro/Business only */}
              {canScheduleSend && (
                <Popover open={showSchedulePicker} onOpenChange={setShowSchedulePicker}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={sendMutation.isPending || !to.trim() || isGenerating}
                      className={`${screen.isMobile ? 'h-11 px-4 text-sm' : 'h-8 px-3 text-xs'} rounded-full flex items-center gap-1.5 font-medium text-foreground/40 hover:text-foreground/60 border border-black/[0.08] dark:border-white/[0.08] hover:border-black/15 dark:hover:border-white/15 transition-all cursor-pointer disabled:opacity-30`}
                      style={{ background: "rgba(var(--overlay-rgb), 0.03)" }}
                      data-testid="button-schedule-send"
                    >
                      <Clock className={`${screen.isMobile ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'}`} />
                      Schedule
                    </button>
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
              <button
                type="button"
                onClick={() => sendMutation.mutate({})}
                disabled={sendMutation.isPending || !to.trim() || isGenerating}
                className={`${screen.isMobile ? 'h-11 px-5 text-sm' : 'h-8 px-4 text-xs'} rounded-full flex items-center gap-1.5 font-medium text-white border border-primary/30 transition-all cursor-pointer disabled:opacity-30`}
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(147,51,234,0.3))" }}
                data-testid="button-compose-send"
              >
                {sendMutation.isPending ? (
                  <div className={`${screen.isMobile ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'} border-2 border-white border-t-transparent rounded-full animate-spin`} />
                ) : (
                  <Send className={`${screen.isMobile ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'}`} />
                )}
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
