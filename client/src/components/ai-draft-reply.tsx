import { useState, useEffect } from "react";
import { Sparkles, Send, RotateCcw, Edit3, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Draft } from "@shared/schema";

interface AIDraftReplyProps {
  draft: Draft | null;
  onGenerate: () => void;
  onUpdate: (content: string) => void;
  onSend: () => void;
  isGenerating?: boolean;
  isSending?: boolean;
}

export function AIDraftReply({ 
  draft, 
  onGenerate, 
  onUpdate, 
  onSend,
  isGenerating,
  isSending 
}: AIDraftReplyProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (draft) {
      setEditContent(draft.content);
    }
  }, [draft]);

  const handleSaveEdit = () => {
    onUpdate(editContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (draft) {
      setEditContent(draft.content);
    }
    setIsEditing(false);
  };

  if (!draft && !isGenerating) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-medium text-lg mb-2">AI Reply Assistant</h3>
            <p className="text-sm text-muted-foreground max-w-[300px] mb-6">
              Let AI analyze this email and generate a professional draft reply for you
            </p>
            <Button 
              onClick={onGenerate} 
              className="gap-2"
              data-testid="button-generate-draft"
            >
              <Sparkles className="w-4 h-4" />
              Draft with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="relative mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
            <h3 className="font-medium text-lg mb-2">Generating AI Reply</h3>
            <p className="text-sm text-muted-foreground">
              Analyzing email content and crafting a response...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">AI Draft Reply</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
              <Check className="w-3 h-3 mr-1" />
              AI Generated
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[200px] resize-none bg-background/50 border-primary/20 focus:border-primary"
              data-testid="textarea-edit-draft"
            />
            <div className="flex items-center justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelEdit}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveEdit}
                data-testid="button-save-edit"
              >
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="bg-background/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap"
            data-testid="text-draft-content"
          >
            {draft?.content}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isEditing}
              className="gap-2"
              data-testid="button-edit-draft"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              className="gap-2"
              data-testid="button-regenerate-draft"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerate
            </Button>
          </div>
          <Button 
            onClick={onSend}
            disabled={isSending || isEditing}
            className="gap-2"
            data-testid="button-send-draft"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Reply
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
