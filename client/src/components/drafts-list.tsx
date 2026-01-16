import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2, Edit2, Loader2, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Draft } from "@shared/schema";
import { DraftEditDialog } from "./draft-edit-dialog";

interface DraftsListProps {
  onDraftSent?: () => void;
}

export function DraftsList({ onDraftSent }: DraftsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: drafts = [], isLoading } = useQuery<Draft[]>({
    queryKey: ["/api/drafts"],
  });

  const filteredDrafts = useMemo(() => {
    if (!searchQuery.trim()) return drafts;
    const query = searchQuery.toLowerCase();
    return drafts.filter(
      (draft) =>
        draft.recipientEmail.toLowerCase().includes(query) ||
        (draft.recipientName?.toLowerCase() ?? "").includes(query) ||
        draft.subject.toLowerCase().includes(query) ||
        draft.content.toLowerCase().includes(query)
    );
  }, [drafts, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      toast({
        title: "Draft deleted",
        description: "The draft has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete draft.",
        variant: "destructive",
      });
    },
  });

  const handleSend = async (draft: Draft) => {
    setSendingId(draft.id);
    try {
      await apiRequest("POST", "/api/emails/send", {
        to: [draft.recipientEmail],
        subject: draft.subject,
        body: draft.content,
      });
      await apiRequest("DELETE", `/api/drafts/${draft.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/drafts"] });
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
      });
      onDraftSent?.();
    } catch {
      toast({
        title: "Failed to send",
        description: "Could not send the email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (drafts.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No drafts yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Saved drafts will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Search bar */}
        <div className="p-4 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              type="search"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-0 h-10 rounded-xl focus:bg-muted/50 transition-colors"
              data-testid="input-search-drafts"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-drafts-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-xs text-muted-foreground">
              {filteredDrafts.length} result{filteredDrafts.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Drafts list */}
        {filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-8">
            <Search className="w-10 h-10 text-muted-foreground/40 mb-4" />
            <h3 className="font-medium text-sm mb-1">No drafts found</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {searchQuery ? `No results for "${searchQuery}"` : "No drafts available"}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-drafts-filter"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-start gap-3 p-4 hover-elevate cursor-pointer"
                onClick={() => setEditingDraft(draft)}
                data-testid={`draft-item-${draft.id}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {draft.recipientEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {draft.recipientName || draft.recipientEmail}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(draft.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm truncate text-muted-foreground">{draft.subject}</p>
                  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                    {draft.content.slice(0, 100)}...
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDraft(draft);
                    }}
                    className="h-8 w-8"
                    data-testid={`button-edit-draft-${draft.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSend(draft);
                    }}
                    disabled={sendingId === draft.id}
                    className="h-8 w-8"
                    data-testid={`button-send-draft-${draft.id}`}
                  >
                    {sendingId === draft.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(draft.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    data-testid={`button-delete-draft-${draft.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingDraft && (
        <DraftEditDialog
          draft={editingDraft}
          open={!!editingDraft}
          onOpenChange={(open: boolean) => !open && setEditingDraft(null)}
          onSent={onDraftSent}
        />
      )}
    </>
  );
}
