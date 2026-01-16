import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Loader2, AlertCircle, Send, Wand2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email, Draft } from "@shared/schema";

interface GenerateError {
  error: string;
  reason?: string;
  canRetry?: boolean;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "concise", label: "Concise" },
] as const;

type ToneType = typeof TONE_OPTIONS[number]["value"];

interface AIDraftDialogProps {
  email: Email | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftAccepted: (draft: Draft) => void;
}

export function AIDraftDialog({ email, open, onOpenChange, onDraftAccepted }: AIDraftDialogProps) {
  const [selectedTone, setSelectedTone] = useState<ToneType>("professional");
  const [draftContent, setDraftContent] = useState("");
  const [subject, setSubject] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [generateError, setGenerateError] = useState<GenerateError | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async ({ emailId, tone, instructions }: { emailId: number; tone: string; instructions?: string }) => {
      const response = await apiRequest("POST", "/api/drafts/generate", { emailId, tone, instructions });
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return response.json();
    },
    onSuccess: (draft: Draft) => {
      setGeneratedDraft(draft);
      setDraftContent(draft.content);
      setGenerateError(null);
    },
    onError: (error: GenerateError) => {
      setGenerateError(error);
      setGeneratedDraft(null);
      setDraftContent("");
    },
  });

  useEffect(() => {
    if (open && email) {
      setDraftContent("");
      setSubject(email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`);
      setAiInstructions("");
      setGeneratedDraft(null);
      setGenerateError(null);
      generateMutation.mutate({ emailId: email.id, tone: selectedTone });
    }
  }, [open, email?.id]);

  const handleRegenerate = () => {
    if (email) {
      generateMutation.mutate({ emailId: email.id, tone: selectedTone, instructions: aiInstructions || undefined });
    }
  };

  const handleToneChange = (tone: ToneType) => {
    setSelectedTone(tone);
    if (email) {
      generateMutation.mutate({ emailId: email.id, tone, instructions: aiInstructions || undefined });
    }
  };

  const handleRefine = async () => {
    if (!aiInstructions.trim() || !draftContent || !draftContent.trim()) return;
    setIsRefining(true);
    try {
      const response = await apiRequest("POST", "/api/ai/refine", {
        text: draftContent,
        instruction: aiInstructions,
        originalEmail: email ? {
          sender: email.sender,
          senderEmail: (email as any).senderEmail || email.sender,
          subject: email.subject,
          preview: (email as any).preview || "",
        } : undefined,
      });
      const data = await response.json();
      setDraftContent(data.refined || data.refinedText);
      setAiInstructions("");
      toast({
        title: "Draft updated",
        description: "Your draft has been modified based on your instructions.",
      });
    } catch {
      toast({
        title: "Refinement failed",
        description: "Could not update the draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftContent || !draftContent.trim() || !email) return;
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/drafts", {
        recipientEmail: email.sender,
        recipientName: (email as any).senderName || email.sender.split('@')[0],
        subject: subject,
        content: draftContent,
        emailId: email.id,
        isAiGenerated: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      toast({
        title: "Draft saved",
        description: "Your draft has been saved. You can find it in Drafts.",
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "Failed to save",
        description: "Could not save the draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!draftContent || !draftContent.trim() || !email) return;
    setIsSending(true);
    try {
      await apiRequest("POST", "/api/emails/send", {
        to: [email.sender],
        subject: subject,
        body: draftContent,
        replyToMessageId: (email as any).nylasId || email.id,
      });
      toast({
        title: "Email sent",
        description: "Your reply has been sent successfully.",
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "Failed to send",
        description: "Could not send the email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const hasDraftContent = draftContent && draftContent.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Draft
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {email && (
              <div className="text-sm">
                <span className="text-muted-foreground">To: </span>
                <span className="font-medium">{email.sender}</span>
              </div>
            )}

            <div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="h-9 text-sm"
                data-testid="input-subject"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => handleToneChange(tone.value)}
                  disabled={generateMutation.isPending}
                  className={`
                    px-2.5 py-1 rounded text-xs font-medium transition-colors
                    ${selectedTone === tone.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                    }
                    disabled:opacity-50
                  `}
                  data-testid={`tone-${tone.value}`}
                >
                  {tone.label}
                </button>
              ))}
            </div>

            <div className="relative">
              {generateMutation.isPending ? (
                <div className="h-[200px] flex items-center justify-center bg-muted/30 rounded-md border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                </div>
              ) : generateError ? (
                <div className="h-[200px] flex flex-col items-center justify-center bg-muted/30 rounded-md border border-destructive/30 gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-center max-w-[280px]">{generateError.error}</p>
                  {generateError.canRetry && (
                    <Button size="sm" variant="outline" onClick={handleRegenerate} className="gap-1.5">
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </Button>
                  )}
                </div>
              ) : (
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="min-h-[200px] resize-none text-sm"
                  placeholder="Your reply will appear here..."
                  data-testid="textarea-ai-draft"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border/50">
                <Wand2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Make it shorter, add greeting..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRefine();
                    }
                  }}
                  disabled={isRefining || !hasDraftContent}
                  data-testid="input-ai-instructions"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefine}
                  disabled={!aiInstructions.trim() || isRefining || !hasDraftContent}
                  className="h-6 px-2 text-xs"
                  data-testid="button-apply-instructions"
                >
                  {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRegenerate}
                disabled={generateMutation.isPending || !email}
                className="h-9 px-2"
                data-testid="button-regenerate"
              >
                <RefreshCw className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border/50 bg-muted/20 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-cancel-draft">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={generateMutation.isPending || !hasDraftContent || isSaving || isSending}
              className="gap-1.5"
              data-testid="button-save-draft"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={generateMutation.isPending || !hasDraftContent || isSending || isSaving}
              className="gap-1.5"
              data-testid="button-send-draft"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
