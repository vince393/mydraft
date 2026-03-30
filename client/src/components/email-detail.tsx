import { useState, useEffect, useRef, type ChangeEvent } from "react";
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
  File,
  Send,
  Volume2,
  Square,
  Pause,
  Play
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SmartAvatar } from "@/components/smart-avatar";
import { isHtmlContent, stripHtmlToPlainText } from "@/lib/email-formatter";
import { EmailIframeRenderer } from "@/components/email-iframe-renderer";
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
  currentUserEmail?: string;
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

export function EmailDetail({ email, threadEmails = [], currentUserEmail = "", generatedDraft, onClearDraft, onDraftUpdate, isLoading, onArchive, onTrash, onStar, onReply, onReplyAll, onForward, onAiDraft, hasPro, onUpgradeNeeded }: EmailDetailProps) {
  const [draftContent, setDraftContent] = useState("");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<{ code: string; name: string; isEnglish: boolean } | null>(null);
  const [translatedContent, setTranslatedContent] = useState<{ subject: string; body: string; culturalNotes?: string } | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translationFormality, setTranslationFormality] = useState<"auto" | "formal" | "neutral" | "casual">("auto");
  const [expandedThreadEmails, setExpandedThreadEmails] = useState<Set<string | number>>(new Set());
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [displayedSummary, setDisplayedSummary] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [readAloudState, setReadAloudState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const readAloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const readAloudUrlRef = useRef<string | null>(null);
  const readAloudAbortRef = useRef<AbortController | null>(null);
  const readAloudStoppedRef = useRef(false);
  const { toast } = useToast();

  const emailId = email ? ((email as any).nylasId || email.id) : null;

  const { data: userSettings } = useQuery<{ aiPreferences?: { readAloudVoice?: string; [key: string]: any } }>({
    queryKey: ["/api/settings"],
  });

  const currentVoice = userSettings?.aiPreferences?.readAloudVoice || "nova";

  const changeVoiceMutation = useMutation({
    mutationFn: async (voice: string) => {
      const currentPrefs = userSettings?.aiPreferences || {};
      const response = await apiRequest("PUT", "/api/settings/ai-preferences", {
        aiPreferences: { ...currentPrefs, readAloudVoice: voice },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Voice updated" });
    },
    onError: () => {
      toast({ title: "Failed to update voice", variant: "destructive" });
    },
  });

  const VOICES = [
    { id: "nova", label: "Nova" },
    { id: "alloy", label: "Alloy" },
    { id: "echo", label: "Echo" },
    { id: "fable", label: "Fable" },
    { id: "onyx", label: "Onyx" },
    { id: "shimmer", label: "Shimmer" },
    { id: "ash", label: "Ash" },
    { id: "ballad", label: "Ballad" },
    { id: "coral", label: "Coral" },
    { id: "sage", label: "Sage" },
  ];

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

  const extractReadableText = (body: string): string => {
    if (!body) return "";
    if (!isHtmlContent(body)) return body.trim();

    const temp = document.createElement("div");
    temp.innerHTML = body;

    temp.querySelectorAll("style, script, head, title, meta, link, noscript").forEach((el) => el.remove());

    temp.querySelectorAll("img").forEach((img) => {
      const alt = img.getAttribute("alt");
      if (alt && alt.trim()) {
        const textNode = document.createTextNode(` ${alt.trim()} `);
        img.parentNode?.replaceChild(textNode, img);
      } else {
        img.remove();
      }
    });

    temp.querySelectorAll("br").forEach((br) => {
      br.replaceWith(document.createTextNode("\n"));
    });

    temp.querySelectorAll("p, div, tr, li, h1, h2, h3, h4, h5, h6").forEach((block) => {
      block.prepend(document.createTextNode("\n"));
      block.append(document.createTextNode("\n"));
    });

    const text = (temp.textContent || temp.innerText || "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text;
  };

  const stopReadAloud = () => {
    readAloudStoppedRef.current = true;
    if (readAloudAbortRef.current) {
      readAloudAbortRef.current.abort();
      readAloudAbortRef.current = null;
    }
    if (readAloudAudioRef.current) {
      readAloudAudioRef.current.pause();
      readAloudAudioRef.current.src = "";
      readAloudAudioRef.current = null;
    }
    if (readAloudUrlRef.current) {
      URL.revokeObjectURL(readAloudUrlRef.current);
      readAloudUrlRef.current = null;
    }
    setReadAloudState("idle");
  };

  const togglePauseResume = () => {
    if (readAloudState === "playing" && readAloudAudioRef.current) {
      readAloudAudioRef.current.pause();
      setReadAloudState("paused");
    } else if (readAloudState === "paused" && readAloudAudioRef.current) {
      readAloudAudioRef.current.play();
      setReadAloudState("playing");
    }
  };

  const handleReadAloud = async () => {
    if (readAloudState === "playing" || readAloudState === "paused" || readAloudState === "loading") {
      stopReadAloud();
      return;
    }
    if (!email) return;

    let bodyText = extractReadableText(email.body || "");
    if (!bodyText && email.preview) {
      bodyText = email.preview.trim();
    }
    const subjectText = email.subject?.trim() || "";

    if (!bodyText && !subjectText) {
      toast({ title: "Nothing to read", description: "This email has no readable text content.", variant: "destructive" });
      return;
    }

    const fullText = subjectText ? `${subjectText}. ${bodyText}` : bodyText;
    const voice = currentVoice;

    readAloudStoppedRef.current = false;
    setReadAloudState("loading");
    const abortController = new AbortController();
    readAloudAbortRef.current = abortController;

    try {
      const response = await fetch("/api/voice/tts/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: fullText, emailId, voice }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      readAloudUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      readAloudAudioRef.current = audio;

      audio.onended = () => {
        stopReadAloud();
      };

      audio.onerror = () => {
        if (readAloudStoppedRef.current) return;
        stopReadAloud();
        toast({ title: "Read Aloud failed", description: "Could not play the audio.", variant: "destructive" });
      };

      await audio.play();
      setReadAloudState("playing");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Read aloud error:", err);
      setReadAloudState("idle");
      toast({ title: "Read Aloud failed", description: "Could not generate speech. Please try again.", variant: "destructive" });
    }
  };

  useEffect(() => {
    return () => {
      if (readAloudAbortRef.current) {
        readAloudAbortRef.current.abort();
        readAloudAbortRef.current = null;
      }
      if (readAloudAudioRef.current) {
        readAloudAudioRef.current.pause();
        readAloudAudioRef.current.src = "";
      }
      if (readAloudUrlRef.current) {
        URL.revokeObjectURL(readAloudUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    stopReadAloud();
  }, [emailId]);
  
  // Get the selected email's ID for highlighting
  const selectedEmailId = email ? ((email as any).nylasId || email.id) : null;
  
  const sortedThreadEmails = [...threadEmails].sort((a, b) => 
    new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
  );
  
  const otherThreadEmails = sortedThreadEmails.filter(e => {
    const eid = (e as any).nylasId || e.id;
    return eid !== selectedEmailId;
  });
  
  const hasThread = threadEmails.length > 1;
  
  const isOwnEmail = (senderEmail: string) => {
    if (!currentUserEmail) return false;
    return senderEmail.toLowerCase() === currentUserEmail.toLowerCase();
  };
  
  const toggleThreadEmail = (id: string | number) => {
    setExpandedThreadEmails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSnippet = (body: string) => {
    if (!body) return "";
    if (isHtmlContent(body)) {
      const tmp = document.createElement("div");
      tmp.innerHTML = body;
      tmp.querySelectorAll("style, script, head").forEach(el => el.remove());
      return (tmp.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
    }
    return body.replace(/\s+/g, " ").trim().slice(0, 120);
  };

  const showDraft = !!generatedDraft;

  useEffect(() => {
    if (generatedDraft) {
      setDraftContent(generatedDraft.content);
    }
  }, [generatedDraft]);

  useEffect(() => {
    setDetectedLanguage(null);
    setTranslatedContent(null);
    setShowTranslated(false);
    setExpandedThreadEmails(new Set());
  }, [email?.id]);


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
    mutationFn: async ({ emailId, subject, body, sourceLanguage, formality }: { emailId: string | number; subject: string; body: string; sourceLanguage: string; formality?: string }) => {
      const response = await apiRequest("POST", `/api/emails/${emailId}/translate`, { subject, body, sourceLanguage, formality });
      return response.json();
    },
    onSuccess: (data) => {
      setTranslatedContent({
        subject: data.translatedSubject,
        body: data.translatedBody,
        culturalNotes: data.culturalNotes
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

  const [culturalTips, setCulturalTips] = useState<{ tips: { type: string; text: string }[]; senderRegion: string; senderCulture?: string } | null>(null);
  const [showCulturalTips, setShowCulturalTips] = useState(false);

  const culturalEtiquetteMutation = useMutation({
    mutationFn: async ({ senderEmail, senderName }: { senderEmail: string; senderName: string }) => {
      const response = await apiRequest("POST", "/api/cultural-etiquette", { senderEmail, senderName });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.tips && data.tips.length > 0) {
        setCulturalTips(data);
      }
    },
  });

  useEffect(() => {
    if (email && email.senderEmail) {
      setCulturalTips(null);
      setShowCulturalTips(false);
      culturalEtiquetteMutation.mutate({ senderEmail: email.senderEmail, senderName: email.sender });
    }
  }, [email?.id]);

  const handleTranslate = (formality?: string) => {
    if (!email || !detectedLanguage) return;
    const emailId = (email as any).nylasId || email.id;
    translateMutation.mutate({ 
      emailId, 
      subject: email.subject, 
      body: email.body, 
      sourceLanguage: detectedLanguage.name,
      formality: formality || translationFormality
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
    setDraftAttachments([]);
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
  const [draftAttachments, setDraftAttachments] = useState<{ filename: string; content: string; contentType: string; size: number }[]>([]);
  const draftFileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingDraft, setIsSendingDraft] = useState(false);

  const handleDraftFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 25MB limit.`, variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setDraftAttachments((prev) => [...prev, { filename: file.name, content: base64, contentType: file.type || "application/octet-stream", size: file.size }]);
      };
      reader.readAsDataURL(file);
    });
    if (draftFileInputRef.current) draftFileInputRef.current.value = "";
  };

  const removeDraftAttachment = (index: number) => {
    setDraftAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendDraftReply = async () => {
    if (!email || !draftContent.trim()) return;
    const nylasId = (email as any).nylasId;
    if (!nylasId) {
      toast({ title: "Cannot send reply", description: "This email is not connected to your email provider.", variant: "destructive" });
      return;
    }
    setIsSendingDraft(true);
    try {
      const senderEmail = (email as any).senderEmail || email.sender;
      await apiRequest("POST", "/api/send", {
        to: [senderEmail],
        subject: `Re: ${email.subject.replace(/^Re:\s*/i, "")}`,
        body: draftContent,
        replyToMessageId: String(nylasId),
        immediate: true,
        attachments: draftAttachments.length > 0 ? draftAttachments : undefined,
      });
      if (generatedDraft) {
        await apiRequest("POST", `/api/drafts/${generatedDraft.id}/send`, {});
      }
      toast({ title: "Reply sent", description: "Your reply has been sent successfully." });
      setDraftAttachments([]);
      handleCloseDraft();
      queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
    } catch (err: any) {
      toast({ title: "Send failed", description: err?.message || "Could not send reply. Please try again.", variant: "destructive" });
    } finally {
      setIsSendingDraft(false);
    }
  };

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
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-border/20">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <h1 className="text-[14px] sm:text-base font-medium truncate pr-1 sm:pr-4 tracking-tight" data-testid="email-subject">
            {showTranslated && translatedContent?.subject ? translatedContent.subject : email.subject}
          </h1>
        </div>
        <div className="flex items-center gap-0 flex-shrink-0">
          <Button 
            size="icon" 
            variant="ghost" 
            className="w-10 h-10 sm:w-9 sm:h-9"
            data-testid="button-archive"
            onClick={onArchive}
          >
            <Archive className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="w-10 h-10 sm:w-9 sm:h-9"
            data-testid="button-trash"
            onClick={onTrash}
          >
            <Trash2 className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="w-10 h-10 sm:w-9 sm:h-9"
            data-testid="button-star"
            onClick={onStar}
          >
            <Star className={`w-[18px] h-[18px] sm:w-4 sm:h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          <Button size="icon" variant="ghost" className="w-10 h-10 sm:w-9 sm:h-9" data-testid="button-more">
            <MoreHorizontal className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* AI Action Bar - buttons transform into expanded panels */}
      <div className="border-b border-border/20 bg-muted/20 px-3 sm:px-6 py-2">
        <div className="flex flex-col gap-2">
          {/* Draft Reply button - moves to top when summary is open */}
          <div className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            showSummary && (summaryData?.summary || isSummaryLoading) 
              ? 'opacity-100 max-h-10' 
              : 'opacity-0 max-h-0 overflow-hidden'
          }`}>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-10 sm:h-8 gap-1.5 text-[13px] sm:text-xs px-3"
                onClick={handleAiDraftClick}
                data-testid="button-ai-draft-top"
              >
                <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                Draft Reply
                {!hasPro && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 font-medium ml-0.5">
                    Pro
                  </span>
                )}
              </Button>
              <div className="flex items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 sm:h-8 gap-1.5 text-[13px] sm:text-xs px-3 rounded-r-none"
                  onClick={handleReadAloud}
                  data-testid="button-read-aloud-top"
                >
                  {readAloudState === "loading" ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 animate-spin" />
                  ) : readAloudState === "playing" || readAloudState === "paused" ? (
                    <Square className="w-3.5 h-3.5 sm:w-3 sm:h-3 fill-current" />
                  ) : (
                    <Volume2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  )}
                  {readAloudState === "loading" ? "Loading..." : readAloudState === "playing" || readAloudState === "paused" ? "Stop" : "Read Aloud"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 sm:h-8 px-1.5 rounded-l-none border-l border-border/30"
                      data-testid="button-voice-picker"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Voice</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {VOICES.map((v) => (
                      <DropdownMenuItem
                        key={v.id}
                        onClick={() => changeVoiceMutation.mutate(v.id)}
                        className="text-xs gap-2"
                        data-testid={`voice-pick-${v.id}`}
                      >
                        <span className={currentVoice === v.id ? "text-primary font-medium" : ""}>{v.label}</span>
                        {currentVoice === v.id && <Circle className="w-2 h-2 fill-primary text-primary ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Summary section - button transforms into glossy card */}
          <div 
            className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-2xl origin-top-left ${
              showSummary && (summaryData?.summary || isSummaryLoading) 
                ? 'bg-gradient-to-br from-background/90 via-background/70 to-muted/50 border border-border/40 shadow-xl shadow-black/10 backdrop-blur-md scale-100 opacity-100' 
                : 'scale-95 opacity-100'
            }`}
            style={{
              transformOrigin: 'top left',
            }}
          >
            {/* Header row - either button or expanded title */}
            <div className={`flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              showSummary && (summaryData?.summary || isSummaryLoading) ? 'px-4 py-3' : ''
            }`}>
              {showSummary && (summaryData?.summary || isSummaryLoading) ? (
                /* Expanded state - glossy header */
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 border border-foreground/10 flex items-center justify-center shadow-inner">
                      <FileText className="w-3.5 h-3.5 text-foreground/60" />
                    </div>
                    <span className="text-sm font-medium text-foreground/90">Summary</span>
                    {(isTyping || isSummaryLoading) && (
                      <span className="flex items-center gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 sm:h-7 sm:w-7 p-0 rounded-full hover:bg-foreground/10 transition-all duration-200"
                    onClick={() => setShowSummary(false)}
                    data-testid="button-hide-summary"
                  >
                    <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </Button>
                </div>
              ) : (
                /* Collapsed state - normal buttons */
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 sm:h-8 gap-1.5 text-[13px] sm:text-xs rounded-full px-3"
                    onClick={handleSummarize}
                    disabled={isSummaryLoading}
                    data-testid="button-summarize"
                  >
                    {isSummaryLoading ? (
                      <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
                    className="h-10 sm:h-8 gap-1.5 text-[13px] sm:text-xs rounded-full px-3"
                    onClick={handleAiDraftClick}
                    data-testid="button-ai-draft"
                  >
                    <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    Draft Reply
                    {!hasPro && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 font-medium ml-0.5">
                        Pro
                      </span>
                    )}
                  </Button>
                  <div className="flex items-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 sm:h-8 gap-1.5 text-[13px] sm:text-xs rounded-full rounded-r-none px-3"
                      onClick={handleReadAloud}
                      data-testid="button-read-aloud"
                    >
                      {readAloudState === "loading" ? (
                        <Loader2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 animate-spin" />
                      ) : readAloudState === "playing" || readAloudState === "paused" ? (
                        <Square className="w-3.5 h-3.5 sm:w-3 sm:h-3 fill-current" />
                      ) : (
                        <Volume2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      )}
                      {readAloudState === "loading" ? "Loading..." : readAloudState === "playing" || readAloudState === "paused" ? "Stop" : "Read Aloud"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-10 sm:h-8 px-1.5 rounded-full rounded-l-none border-l border-border/30"
                          data-testid="button-voice-picker-bottom"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Voice</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {VOICES.map((v) => (
                          <DropdownMenuItem
                            key={v.id}
                            onClick={() => changeVoiceMutation.mutate(v.id)}
                            className="text-xs gap-2"
                            data-testid={`voice-pick-bottom-${v.id}`}
                          >
                            <span className={currentVoice === v.id ? "text-primary font-medium" : ""}>{v.label}</span>
                            {currentVoice === v.id && <Circle className="w-2 h-2 fill-primary text-primary ml-auto" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>

            {(readAloudState === "playing" || readAloudState === "paused" || readAloudState === "loading") && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.03] border border-border/30">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={togglePauseResume}
                  data-testid="button-read-aloud-pause"
                >
                  {readAloudState === "loading" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : readAloudState === "playing" ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </Button>
                <div className="flex-1 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-foreground/40" />
                  <span className="text-xs text-foreground/70">
                    {readAloudState === "loading" ? "Generating voice..." : readAloudState === "playing" ? "Reading aloud..." : "Paused"}
                  </span>
                  {readAloudState === "playing" && (
                    <div className="flex items-center gap-0.5">
                      <span className="w-0.5 h-3 bg-foreground/30 rounded-full animate-pulse" />
                      <span className="w-0.5 h-4 bg-foreground/30 rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                      <span className="w-0.5 h-2.5 bg-foreground/30 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                      <span className="w-0.5 h-3.5 bg-foreground/30 rounded-full animate-pulse" style={{ animationDelay: "0.45s" }} />
                    </div>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={stopReadAloud}
                  data-testid="button-read-aloud-stop"
                >
                  <Square className="w-3 h-3 fill-current" />
                </Button>
              </div>
            )}

            {/* Summary content - expands with smooth animation */}
            <div 
              className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                showSummary && (summaryData?.summary || isSummaryLoading) 
                  ? 'max-h-[500px] opacity-100' 
                  : 'max-h-0 opacity-0'
              }`}
              data-testid="ai-summary-section"
            >
              <div className="px-4 pb-4">
                {isSummaryLoading ? (
                  <div className="flex items-center gap-3 text-muted-foreground text-sm py-3">
                    <div className="w-5 h-5 rounded-full border-2 border-foreground/10 border-t-foreground/30 animate-spin" />
                    <span className="text-foreground/60">Analyzing email...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground/85 leading-relaxed" data-testid="summary-text">
                      {displayedSummary || summaryData?.summary}
                      {isTyping && <span className="inline-block w-0.5 h-4 bg-foreground/50 ml-0.5 animate-pulse" />}
                    </p>
                    {!isTyping && summaryData?.keyPoints && summaryData.keyPoints.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Key Points</p>
                        <ul className="space-y-1.5">
                          {summaryData.keyPoints.map((point, i) => (
                            <li 
                              key={i} 
                              className="text-sm text-foreground/75 flex items-start gap-2 animate-in fade-in slide-in-from-left-2"
                              style={{ animationDelay: `${i * 80}ms`, animationDuration: '300ms' }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 mt-2 flex-shrink-0" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!isTyping && summaryData?.actionItems && summaryData.actionItems.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Action Items</p>
                        <ul className="space-y-1.5">
                          {summaryData.actionItems.map((item, i) => (
                            <li 
                              key={i} 
                              className="text-sm text-foreground/75 flex items-start gap-2 animate-in fade-in slide-in-from-left-2"
                              style={{ animationDelay: `${150 + i * 80}ms`, animationDuration: '300ms' }}
                            >
                              <ArrowRight className="w-3 h-3 text-foreground/40 mt-1 flex-shrink-0" />
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
          {/* Conversation thread - Gmail style */}
          {hasThread && otherThreadEmails.length > 0 && (
            <div className="mb-4 space-y-0">
              {otherThreadEmails.map((threadEmail) => {
                const threadEmailId = (threadEmail as any).nylasId || threadEmail.id;
                const isSent = isOwnEmail(threadEmail.senderEmail);
                const isExpanded = expandedThreadEmails.has(threadEmailId);
                const emailContent = threadEmail.body || threadEmail.preview || "";
                const snippet = getSnippet(emailContent);

                return (
                  <div 
                    key={threadEmailId}
                    className="border-b border-border/20 last:border-b-0"
                    data-testid={`thread-email-${threadEmailId}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleThreadEmail(threadEmailId)}
                      className="w-full flex items-center gap-3 py-3 px-1 text-left transition-colors hover:bg-foreground/[0.03] cursor-pointer"
                      data-testid={`thread-toggle-${threadEmailId}`}
                    >
                      <SmartAvatar 
                        email={threadEmail.senderEmail}
                        name={threadEmail.sender}
                        className="w-8 h-8 ring-1 ring-border/30 flex-shrink-0"
                        fallbackClassName="text-white font-medium text-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {isSent ? "You" : threadEmail.sender}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatSmartDate(new Date(threadEmail.receivedAt))}
                          </span>
                        </div>
                        {!isExpanded && snippet && (
                          <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{snippet}</p>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground/40 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="pb-4 px-1 pl-12">
                        <p className="text-xs text-muted-foreground mb-3">{threadEmail.senderEmail}</p>
                        <div className="email-body-container">
                          {isHtmlContent(emailContent) ? (
                            <EmailIframeRenderer html={emailContent} />
                          ) : (
                            <div className="email-content-plain">
                              {emailContent.split("\n").map((p, i) => (
                                p.trim() ? <p key={i}>{p}</p> : <br key={i} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                  Latest
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-border via-border to-transparent" />
              </div>
            </div>
          )}
          
          {/* Current/Latest email */}
          <div className="flex items-start gap-3 mb-5">
            <SmartAvatar 
              email={email.senderEmail}
              name={email.sender}
              className="w-10 h-10 ring-2 ring-border/30"
              fallbackClassName="text-white font-medium text-sm"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-medium text-sm tracking-tight" data-testid="email-sender">
                  {isOwnEmail(email.senderEmail) ? "You" : email.sender}
                </h2>
                {isOwnEmail(email.senderEmail) && (
                  <span className="text-[10px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full">Sent</span>
                )}
                <span className="text-xs text-muted-foreground" data-testid="email-date">
                  {formatSmartDate(new Date(email.receivedAt))}
                </span>
              </div>
              <p className="text-xs text-muted-foreground" data-testid="email-sender-address">
                {email.senderEmail}
              </p>
            </div>
          </div>

          {culturalTips && culturalTips.tips.length > 0 && (
            <div className="mb-4" data-testid="cultural-etiquette-banner">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCulturalTips(!showCulturalTips)}
                className="w-full justify-start text-xs text-violet-700 dark:text-violet-400 border-violet-500/20 gap-2"
                data-testid="button-toggle-cultural-tips"
              >
                <Languages className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left">
                  Cultural context: Sender appears to be from {culturalTips.senderCulture || "a different region"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCulturalTips ? "rotate-180" : ""}`} />
              </Button>
              {showCulturalTips && (
                <div className="mt-2 space-y-2 px-1">
                  {culturalTips.tips.map((tip, i) => (
                    <div key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-violet-500/30 py-1">
                      {tip.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 mb-4 flex-wrap">
            {detectedLanguage && !detectedLanguage.isEnglish && (
              <>
                {translatedContent ? (
                  <Button
                    variant={showTranslated ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setShowTranslated(!showTranslated)}
                    className="text-xs rounded-full toggle-elevate"
                    data-testid="button-toggle-translation"
                  >
                    <Languages className="w-3 h-3" />
                    {showTranslated ? "Show Original" : "Show Translation"}
                  </Button>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={translateMutation.isPending}
                        className="text-xs rounded-full text-blue-500 border-blue-500/30"
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
                            <ChevronDown className="w-3 h-3 ml-0.5" />
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Translation Style</p>
                        {[
                          { value: "auto", label: "Auto (match culture)" },
                          { value: "formal", label: "Formal" },
                          { value: "neutral", label: "Neutral" },
                          { value: "casual", label: "Casual" },
                        ].map((opt) => (
                          <Button
                            key={opt.value}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTranslationFormality(opt.value as any);
                              handleTranslate(opt.value);
                            }}
                            className={`w-full justify-start text-xs toggle-elevate ${
                              translationFormality === opt.value ? "toggle-elevated text-blue-500" : ""
                            }`}
                            data-testid={`button-formality-${opt.value}`}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </>
            )}
          </div>

          {showTranslated && translatedContent?.culturalNotes && (
            <div 
              className="mb-3 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2"
              data-testid="cultural-notes"
            >
              <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{translatedContent.culturalNotes}</span>
            </div>
          )}

          <div 
            className="mb-8 email-body-container"
            data-testid="email-body"
          >
            {showTranslated && translatedContent ? (
              <>
                <div className="text-xs text-blue-500 mb-3 flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  Translated from {detectedLanguage?.name || "original language"}
                </div>
                {isHtmlContent(translatedContent.body) ? (
                  <EmailIframeRenderer html={translatedContent.body} />
                ) : (
                  <div className="email-content-plain">
                    {translatedContent.body.split("\n").map((paragraph, i) => (
                      paragraph.trim() ? (
                        <p key={i}>{paragraph}</p>
                      ) : <br key={i} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {isHtmlContent(email.body) ? (
                  <EmailIframeRenderer html={email.body} />
                ) : (
                  <div className="email-content-plain">
                    {email.body.split("\n").map((paragraph, i) => (
                      paragraph.trim() ? (
                        <p key={i}>{paragraph}</p>
                      ) : <br key={i} />
                    ))}
                  </div>
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

          {showDraft && (
            <div 
              className="mb-8 p-3 sm:p-5 rounded-2xl border border-white/15 dark:border-white/10 backdrop-blur-2xl" 
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.12)"
              }}
              data-testid="ai-draft-container"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/20"
                    style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(147,51,234,0.15))" }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground/90">
                    {generatedDraft.status === "scheduled" ? "Scheduled Reply" : "AI Draft"}
                  </span>
                  {generatedDraft.status === "scheduled" && generatedDraft.scheduledAt && (
                    <span 
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm text-foreground/60"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(new Date(generatedDraft.scheduledAt), "MMM d 'at' h:mm a")}
                    </span>
                  )}
                </div>
                <button 
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 text-foreground/50 hover:text-foreground/80 transition-all cursor-pointer"
                  onClick={handleCloseDraft} 
                  data-testid="button-close-draft"
                >
                  <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
              <Textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="min-h-[100px] sm:min-h-[150px] bg-white/[0.03] border-white/10 rounded-xl resize-none text-[13px] sm:text-sm focus:border-white/20 focus:bg-white/[0.05] transition-colors"
                placeholder="AI generated reply will appear here..."
                disabled={generatedDraft.status === "scheduled"}
                data-testid="textarea-draft"
              />
              <input
                ref={draftFileInputRef}
                type="file"
                multiple
                onChange={handleDraftFileSelect}
                className="hidden"
                accept="*/*"
                data-testid="input-draft-attachment"
              />
              {generatedDraft.status !== "scheduled" && draftContent.trim() && (
                <div className="mt-3 space-y-2.5">
                  {draftAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" data-testid="draft-attachments-list">
                      {draftAttachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full text-[11px] font-medium backdrop-blur-sm border border-white/10 text-foreground/60"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                          data-testid={`draft-attachment-${i}`}
                        >
                          <Paperclip className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{att.filename}</span>
                          <span className="text-foreground/30">({(att.size / 1024).toFixed(0)}KB)</span>
                          <button
                            type="button"
                            onClick={() => removeDraftAttachment(i)}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10 text-foreground/40 hover:text-foreground/70 transition-colors cursor-pointer"
                            data-testid={`button-remove-draft-attachment-${i}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 sm:gap-1.5" data-testid="quick-actions">
                    {[
                      { label: "Shorter", instruction: "Make this response shorter and more concise", testId: "button-shorter" },
                      { label: "Longer", instruction: "Make this response longer with more detail", testId: "button-longer" },
                      { label: "More Formal", instruction: "Make this more formal and professional", testId: "button-formal" },
                      { label: "More Casual", instruction: "Make this more casual and friendly", testId: "button-casual" },
                    ].map((action) => (
                      <button
                        key={action.testId}
                        onClick={() => handleRefine(action.instruction)}
                        disabled={isRefining}
                        className="h-6 sm:h-7 px-2 sm:px-3 rounded-full text-[10px] sm:text-[11px] font-medium backdrop-blur-sm bg-white/5 border border-white/12 text-foreground/60 hover:bg-white/10 hover:text-foreground/80 hover:border-white/20 transition-all disabled:opacity-40 cursor-pointer"
                        data-testid={action.testId}
                      >
                        {action.label}
                      </button>
                    ))}
                    <button
                      onClick={() => draftFileInputRef.current?.click()}
                      className="h-6 sm:h-7 px-2 sm:px-3 rounded-full text-[10px] sm:text-[11px] font-medium backdrop-blur-sm bg-white/5 border border-white/12 text-foreground/60 hover:bg-white/10 hover:text-foreground/80 hover:border-white/20 transition-all cursor-pointer flex items-center gap-1"
                      data-testid="button-draft-attach"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="hidden sm:inline">Attach</span>
                      <span className="sm:hidden">File</span>
                    </button>
                    <button
                      onClick={handleGenerateImage}
                      disabled={isRefining || isGeneratingImage}
                      className="h-6 sm:h-7 px-2 sm:px-3 rounded-full text-[10px] sm:text-[11px] font-medium backdrop-blur-sm bg-white/5 border border-white/12 text-foreground/60 hover:bg-white/10 hover:text-foreground/80 hover:border-white/20 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      data-testid="button-generate-image"
                    >
                      {isGeneratingImage ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">Add Image</span>
                      <span className="sm:hidden">Image</span>
                    </button>
                  </div>
                  <div 
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border border-white/10 backdrop-blur-sm"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                    data-testid="refine-bar"
                  >
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/60 flex-shrink-0" />
                    <Input
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      placeholder="Tell AI how to adjust..."
                      className="flex-1 h-6 sm:h-7 border-0 bg-transparent focus-visible:ring-0 text-[11px] sm:text-xs placeholder:text-foreground/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleRefine();
                        }
                      }}
                      disabled={isRefining}
                      data-testid="input-refine"
                    />
                    <button
                      onClick={() => handleRefine()}
                      disabled={!refineInput.trim() || isRefining}
                      className="h-6 sm:h-7 px-2.5 sm:px-3 rounded-full text-[10px] sm:text-[11px] font-medium backdrop-blur-sm bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
                      data-testid="button-refine"
                    >
                      {isRefining ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Refine"
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {generatedDraft.status === "scheduled" ? (
                  <button 
                    className="h-8 sm:h-9 px-3 sm:px-4 rounded-full text-[11px] sm:text-xs font-medium backdrop-blur-sm bg-white/5 border border-white/12 text-foreground/70 hover:bg-white/10 hover:text-foreground transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 disabled:opacity-40"
                    onClick={() => cancelScheduleMutation.mutate(generatedDraft.id)}
                    disabled={cancelScheduleMutation.isPending}
                    data-testid="button-cancel-schedule"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel Schedule
                  </button>
                ) : (
                  <>
                    <button 
                      className="h-8 sm:h-9 px-3 sm:px-5 rounded-full text-[11px] sm:text-xs font-medium backdrop-blur-sm border border-primary/25 text-white hover:border-primary/40 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,51,234,0.3))" }}
                      onClick={handleSendDraftReply}
                      disabled={isSendingDraft || !draftContent.trim()}
                      data-testid="button-send-draft"
                    >
                      {isSendingDraft ? (
                        <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      )}
                      {isSendingDraft ? "Sending..." : draftAttachments.length > 0 ? `Send (${draftAttachments.length})` : "Send Reply"}
                    </button>
                    <Popover open={showSchedulePicker} onOpenChange={setShowSchedulePicker}>
                      <PopoverTrigger asChild>
                        <button 
                          className="h-8 sm:h-9 px-3 sm:px-4 rounded-full text-[11px] sm:text-xs font-medium backdrop-blur-sm bg-white/5 border border-white/12 text-foreground/70 hover:bg-white/10 hover:text-foreground hover:border-white/20 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2"
                          data-testid="button-send-later"
                        >
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline">Send Later</span>
                          <span className="sm:hidden">Later</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
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

          <div className="flex items-center gap-2 sm:gap-3 pt-6 border-t border-border/50 flex-wrap">
            <Button 
              size="sm"
              className="gap-1.5 sm:gap-2 px-4 sm:px-5 h-10 sm:h-8 text-[13px] sm:text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0" 
              data-testid="button-reply"
              onClick={onReply}
            >
              <Reply className="w-4 h-4 sm:w-4 sm:h-4" />
              Reply
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 px-4 sm:px-3 h-10 sm:h-8 text-[13px] sm:text-sm" data-testid="button-reply-all" onClick={onReplyAll}>
              <ReplyAll className="w-4 h-4 sm:w-4 sm:h-4" />
              Reply All
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 px-4 sm:px-3 h-10 sm:h-8 text-[13px] sm:text-sm" data-testid="button-forward" onClick={onForward}>
              <Forward className="w-4 h-4 sm:w-4 sm:h-4" />
              Forward
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
