import { useState, useEffect } from "react";
import { StickyNote, X, Loader2, Check, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmailNote } from "@shared/schema";

interface EmailNoteProps {
  messageId: string;
}

export function EmailNotePanel({ messageId }: EmailNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ note: EmailNote | null }>({
    queryKey: ["/api/emails", messageId, "note"],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${messageId}/note`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch note");
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.note) {
      setNoteContent(data.note.content);
    } else {
      setNoteContent("");
    }
    setIsEditing(false);
  }, [data?.note, messageId]);

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/emails/${messageId}/note`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails", messageId, "note"] });
      setIsEditing(false);
      toast({ title: "Note saved", description: "Your note has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/emails/${messageId}/note`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails", messageId, "note"] });
      setNoteContent("");
      setIsEditing(false);
      toast({ title: "Note deleted", description: "Your note has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (noteContent.trim()) {
      saveMutation.mutate(noteContent.trim());
    }
  };

  const handleCancel = () => {
    setNoteContent(data?.note?.content || "");
    setIsEditing(false);
  };

  const hasNote = !!data?.note;
  const isPending = saveMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasNote && !isEditing) {
    return (
      <div className="px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => setIsEditing(true)}
          data-testid="button-add-note"
        >
          <StickyNote className="w-3.5 h-3.5" />
          Add note
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div 
        className="rounded-lg border shadow-sm transition-all duration-200 bg-muted/50 border-border"
        data-testid="sticky-note-container"
      >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Note</span>
            </div>
            <div className="flex items-center gap-1">
              {!isEditing && hasNote && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsEditing(true)}
                    disabled={isPending}
                    data-testid="button-edit-note"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate()}
                    disabled={isPending}
                    data-testid="button-delete-note"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 text-primary hover:text-primary"
                    onClick={handleSave}
                    disabled={isPending || !noteContent.trim()}
                    data-testid="button-save-note"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 text-muted-foreground hover:text-foreground"
                    onClick={handleCancel}
                    disabled={isPending}
                    data-testid="button-cancel-note"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="p-3">
            {isEditing ? (
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write your note here..."
                className="min-h-[80px] resize-none bg-transparent border-0 focus-visible:ring-0 text-sm text-foreground placeholder:text-muted-foreground"
                autoFocus
                data-testid="textarea-note-content"
              />
            ) : (
              <p 
                className="text-sm text-foreground whitespace-pre-wrap"
                data-testid="text-note-content"
              >
                {noteContent}
              </p>
            )}
          </div>
      </div>
    </div>
  );
}