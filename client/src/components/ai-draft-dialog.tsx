import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Loader2, AlertCircle, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
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
  const { toast } = useToast();

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
    if (!aiInstructions.trim() || !draftContent.trim()) return;
    setIsRefining(true);
    try {
      const response = await apiRequest("POST", "/api/ai/refine", {
        text: draftContent,
        instructions: aiInstructions,
      });
      const data = await response.json();
      setDraftContent(data.refinedText);
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

  const handleSend = async () => {
    if (!draftContent.trim() || !email) return;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 px-6 py-5 border-b border-border/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-600/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-semibold">AI Draft</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">Generate and refine your reply with AI</p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {email && (
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl border border-border/20">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary">
                  {email.sender.split('@')[0].charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Replying to</p>
                <p className="text-sm font-medium truncate">{email.sender}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{email.subject}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="bg-background border-border/50 focus:border-primary/50 transition-colors"
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => handleToneChange(tone.value)}
                  disabled={generateMutation.isPending}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                    ${selectedTone === tone.value
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md shadow-blue-600/20"
                      : "bg-background border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  data-testid={`tone-${tone.value}`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Reply</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRegenerate}
                disabled={generateMutation.isPending || !email}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-regenerate"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Regenerate
              </Button>
            </div>
            
            <div className="min-h-[180px] relative">
              {generateMutation.isPending ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600/5 to-purple-600/5 rounded-xl border border-primary/20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 animate-pulse" />
                      <Loader2 className="w-6 h-6 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-sm text-muted-foreground">Crafting your reply...</span>
                  </div>
                </div>
              ) : generateError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/5 rounded-xl border border-destructive/30">
                  <div className="flex flex-col items-center gap-4 p-6 text-center max-w-md">
                    <div className="p-3 rounded-full bg-destructive/10">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{generateError.error}</p>
                      {generateError.reason && (
                        <p className="text-xs text-muted-foreground">{generateError.reason}</p>
                      )}
                    </div>
                    {generateError.canRetry && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerate}
                        className="gap-2"
                        data-testid="button-retry-generate"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="h-full min-h-[180px] resize-none bg-background border-border/50 rounded-xl focus:border-primary/50 transition-colors"
                  placeholder="Your AI-generated reply will appear here..."
                  data-testid="textarea-ai-draft"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-xl border border-primary/20">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <Input
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Ask AI to make changes... (e.g., 'make it shorter')"
              className="flex-1 h-9 border-0 bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleRefine();
                }
              }}
              disabled={isRefining || !draftContent.trim()}
              data-testid="input-ai-instructions"
            />
            <Button
              size="sm"
              onClick={handleRefine}
              disabled={!aiInstructions.trim() || isRefining || !draftContent.trim()}
              className="h-8 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0 text-white shadow-md shadow-blue-600/20"
              data-testid="button-apply-instructions"
            >
              {isRefining ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/20 border-t border-border/30">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-muted-foreground"
            data-testid="button-cancel-draft"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={generateMutation.isPending || !draftContent.trim() || isSending}
            className="gap-2 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0 shadow-lg shadow-blue-600/25"
            data-testid="button-send-draft"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
