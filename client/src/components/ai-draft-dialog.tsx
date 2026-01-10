import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Email, Draft } from "@shared/schema";

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
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);

  const generateMutation = useMutation({
    mutationFn: async ({ emailId, tone }: { emailId: number; tone: string }) => {
      const response = await apiRequest("POST", "/api/drafts/generate", { emailId, tone });
      return response.json();
    },
    onSuccess: (draft: Draft) => {
      setGeneratedDraft(draft);
      setDraftContent(draft.content);
    },
  });

  useEffect(() => {
    if (open && email) {
      setDraftContent("");
      setGeneratedDraft(null);
      generateMutation.mutate({ emailId: email.id, tone: selectedTone });
    }
  }, [open, email?.id]);

  const handleRegenerate = () => {
    if (email) {
      generateMutation.mutate({ emailId: email.id, tone: selectedTone });
    }
  };

  const handleToneChange = (tone: ToneType) => {
    setSelectedTone(tone);
    if (email) {
      generateMutation.mutate({ emailId: email.id, tone });
    }
  };

  const handleAccept = () => {
    if (generatedDraft) {
      const updatedDraft = { ...generatedDraft, content: draftContent };
      onDraftAccepted(updatedDraft);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            AI Draft Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => handleToneChange(tone.value)}
                  disabled={generateMutation.isPending}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${selectedTone === tone.value
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
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

          <div className="flex-1 overflow-hidden flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Generated Reply</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRegenerate}
                disabled={generateMutation.isPending || !email}
                className="gap-2 text-muted-foreground hover:text-foreground"
                data-testid="button-regenerate"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Regenerate
              </Button>
            </div>
            
            <div className="flex-1 min-h-[200px] relative">
              {generateMutation.isPending ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg border border-border/30">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Generating your reply...</span>
                  </div>
                </div>
              ) : (
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="h-full min-h-[200px] resize-none bg-muted/20 border-border/30 rounded-lg"
                  placeholder="Your AI-generated reply will appear here..."
                  data-testid="textarea-ai-draft"
                />
              )}
            </div>
          </div>

          {email && (
            <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Replying to:</p>
              <p className="text-sm font-medium truncate">{email.subject}</p>
              <p className="text-xs text-muted-foreground">{email.sender}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/30">
            <Button
              variant="ghost"
              onClick={handleClose}
              data-testid="button-cancel-draft"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={generateMutation.isPending || !draftContent.trim()}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0"
              data-testid="button-use-draft"
            >
              <Sparkles className="w-4 h-4" />
              Use This Draft
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
