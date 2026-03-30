import { useState, useEffect } from "react";
import { Send, Loader2, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Draft } from "@shared/schema";
import { useScreenSize } from "@/hooks/use-screen-size";

interface DraftEditDialogProps {
  draft: Draft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

export function DraftEditDialog({ draft, open, onOpenChange, onSent }: DraftEditDialogProps) {
  const [subject, setSubject] = useState(draft.subject);
  const [content, setContent] = useState(draft.content);
  const [aiInstructions, setAiInstructions] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const screen = useScreenSize();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSubject(draft.subject);
      setContent(draft.content);
      setAiInstructions("");
    }
  }, [open, draft]);

  const handleRefine = async () => {
    if (!aiInstructions.trim() || !content.trim()) return;
    setIsRefining(true);
    try {
      const response = await apiRequest("POST", "/api/ai/refine", {
        text: content,
        instruction: aiInstructions,
      });
      const data = await response.json();
      setContent(data.refined || data.refinedText);
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("PUT", `/api/drafts/${draft.id}`, {
        subject,
        content,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      toast({
        title: "Draft saved",
        description: "Your changes have been saved.",
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
    if (!content.trim()) return;
    setIsSending(true);
    try {
      await apiRequest("POST", "/api/emails/send", {
        to: [draft.recipientEmail],
        subject: subject,
        body: content,
      });
      await apiRequest("DELETE", `/api/drafts/${draft.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
      });
      onOpenChange(false);
      onSent?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${screen.isMobile ? 'w-full h-[100dvh] max-w-full max-h-full rounded-none !left-0 !top-0 !translate-x-0 !translate-y-0 mobile-slide-up' : 'max-w-[640px] max-h-[85vh] rounded-2xl'} flex flex-col p-0 gap-0 overflow-hidden border-black/10 dark:border-white/10 backdrop-blur-2xl`} style={{ background: screen.isMobile ? "rgba(var(--background-rgb, 10,10,12), 1)" : "rgba(var(--background-rgb, 10,10,12), 0.95)" }}>
        <DialogHeader className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06] flex-shrink-0">
          <DialogTitle className="text-base font-medium">Edit Draft</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            <div className="text-sm">
              <span className="text-muted-foreground">To: </span>
              <span className="font-medium">{draft.recipientEmail}</span>
            </div>

            <div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="h-9 text-sm"
                data-testid="input-draft-subject"
              />
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none text-sm"
              placeholder="Your message..."
              data-testid="textarea-draft-content"
            />

            <div className="flex items-center gap-2 px-3 py-2 bg-black/[0.03] dark:bg-white/[0.03] rounded-lg border border-black/[0.08] dark:border-white/[0.08]">
              <Wand2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Ask AI to modify this draft..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRefine();
                  }
                }}
                disabled={isRefining || !content.trim()}
                data-testid="input-draft-ai"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefine}
                disabled={!aiInstructions.trim() || isRefining || !content.trim()}
                className="h-6 px-2 text-xs"
                data-testid="button-draft-apply"
              >
                {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.06] flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-testid="button-draft-cancel"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isSending}
              data-testid="button-draft-save"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Save
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!content.trim() || isSending || isSaving}
              className="gap-1.5"
              data-testid="button-draft-send"
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
