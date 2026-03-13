import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, Check, X, Archive, Trash2, Star, Mail, FolderInput, ShieldAlert, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface AiSuggestion {
  id: number;
  messageId: string;
  messageSubject: string | null;
  messageSender: string | null;
  actionType: string;
  actionData: { reason?: string; folderId?: number; folderName?: string } | null;
  confidence: number;
  status: string;
  createdAt: string;
}

const actionMeta: Record<string, { icon: any; label: string }> = {
  spam: { icon: ShieldAlert, label: "Spam" },
  junk: { icon: Ban, label: "Junk" },
  archive: { icon: Archive, label: "Archive" },
  delete: { icon: Trash2, label: "Delete" },
  star: { icon: Star, label: "Star" },
  mark_read: { icon: Mail, label: "Mark read" },
  move_to_folder: { icon: FolderInput, label: "Move" },
};

export function AiInboxRefreshButton({ onRefreshComplete, compact = false, asMenuItem = false }: { onRefreshComplete?: () => void; compact?: boolean; asMenuItem?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deselected, setDeselected] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: suggestionsData, refetch: refetchSuggestions } = useQuery<{ suggestions: AiSuggestion[] }>({
    queryKey: ["/api/ai/inbox-suggestions"],
    enabled: isOpen,
  });

  const allSuggestions = suggestionsData?.suggestions || [];
  const pending = allSuggestions.filter(s => s.status === "pending");
  const approved = allSuggestions.filter(s => s.status === "approved");
  const items = [...pending, ...approved];

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/inbox-refresh");
      return res.json();
    },
    onSuccess: (data) => {
      setDeselected(new Set());
      refetchSuggestions();
      if (data.suggestions?.length === 0) {
        toast({ title: "Inbox looks clean", description: "No actions needed right now." });
      }
    },
    onError: () => {
      toast({ title: "Analysis failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (selectedIds: number[]) => {
      for (const s of items) {
        if (selectedIds.includes(s.id) && s.status === "pending") {
          await apiRequest("PATCH", `/api/ai/inbox-suggestions/${s.id}`, { status: "approved" });
        }
        if (!selectedIds.includes(s.id) && s.status !== "rejected") {
          await apiRequest("PATCH", `/api/ai/inbox-suggestions/${s.id}`, { status: "rejected" });
        }
      }
      const res = await apiRequest("POST", "/api/ai/inbox-suggestions/execute");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Done", description: `${data.executed} action${data.executed !== 1 ? "s" : ""} applied.` });
      setDeselected(new Set());
      refetchSuggestions();
      queryClient.invalidateQueries({ queryKey: ["/api/emails", "cached"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/inbox-suggestions"] });
      onRefreshComplete?.();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply actions.", variant: "destructive" });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", "/api/ai/inbox-suggestions"); },
    onSuccess: () => {
      setDeselected(new Set());
      refetchSuggestions();
    },
  });

  const toggleItem = (id: number) => {
    setDeselected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = items.filter(s => !deselected.has(s.id)).map(s => s.id);
  const selectedCount = selectedIds.length;

  const handleOpen = () => {
    setIsOpen(true);
    if (items.length === 0) {
      refreshMutation.mutate();
    }
  };

  return (
    <>
      {asMenuItem ? (
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setTimeout(handleOpen, 100);
          }}
          className="gap-2"
          data-testid="button-ai-inbox-refresh"
        >
          <Sparkles className="w-4 h-4 text-primary/70" />
          AI Cleanup
        </DropdownMenuItem>
      ) : (
        <button
          onClick={handleOpen}
          className={`${compact ? 'w-8 h-8' : 'w-9 h-9'} flex items-center justify-center rounded-full cursor-pointer transition-all hover:bg-white/[0.06] flex-shrink-0`}
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          title="AI Cleanup"
          data-testid="button-ai-inbox-refresh"
        >
          <Sparkles className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-foreground/40`} />
        </button>
      )}

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center sm:justify-center" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-[400px] sm:max-h-[min(520px,80vh)] flex flex-col sm:rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(22,22,28,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground/90">AI Cleanup</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06] transition-colors"
                data-testid="button-close-ai-refresh"
              >
                <X className="w-3.5 h-3.5 text-foreground/40" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 flex-1">
                  <Loader2 className="w-5 h-5 text-primary animate-spin mb-3" />
                  <p className="text-xs text-foreground/40">Scanning your inbox...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 flex-1">
                  <Sparkles className="w-5 h-5 text-foreground/20 mb-3" />
                  <p className="text-sm text-foreground/50 mb-1">All clean</p>
                  <p className="text-xs text-foreground/25 text-center mb-5">No suggestions right now.</p>
                  <button
                    onClick={() => refreshMutation.mutate()}
                    className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-white/[0.06]"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                    data-testid="button-start-ai-analysis"
                  >
                    Scan again
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-[11px] text-foreground/30">
                      {selectedCount} of {items.length} selected
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deselected.size > 0 ? setDeselected(new Set()) : setDeselected(new Set(items.map(s => s.id)))}
                        className="text-[11px] text-foreground/30 hover:text-foreground/50 cursor-pointer"
                        data-testid="button-toggle-all"
                      >
                        {deselected.size > 0 ? "Select all" : "Deselect all"}
                      </button>
                      <button
                        onClick={() => dismissAllMutation.mutate()}
                        className="text-[11px] text-foreground/20 hover:text-foreground/35 cursor-pointer"
                        data-testid="button-dismiss-all-suggestions"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto max-h-[50vh] sm:max-h-none" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
                    <div className="py-1">
                      {items.map((s) => {
                        const meta = actionMeta[s.actionType] || actionMeta.archive;
                        const Icon = meta.icon;
                        const isSelected = !deselected.has(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleItem(s.id)}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-left cursor-pointer transition-colors hover:bg-white/[0.03]"
                            data-testid={`suggestion-item-${s.id}`}
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                background: isSelected ? "rgba(59,130,246,0.15)" : "transparent",
                                border: isSelected ? "1.5px solid rgba(59,130,246,0.5)" : "1.5px solid rgba(255,255,255,0.12)",
                              }}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 text-primary" />}
                            </div>
                            <Icon className="w-3.5 h-3.5 text-foreground/25 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs truncate ${isSelected ? "text-foreground/70" : "text-foreground/30 line-through"}`}>
                                {s.messageSubject || "(No subject)"}
                              </p>
                              <p className="text-[10px] text-foreground/20 truncate">
                                {meta.label}{s.messageSender ? ` \u00B7 ${s.messageSender}` : ""}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                      onClick={() => refreshMutation.mutate()}
                      disabled={refreshMutation.isPending}
                      className="px-3 py-2 rounded-lg text-xs text-foreground/30 hover:text-foreground/50 cursor-pointer transition-all hover:bg-white/[0.04]"
                      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                      data-testid="button-rescan-inbox"
                    >
                      Rescan
                    </button>
                    <button
                      onClick={() => executeMutation.mutate(selectedIds)}
                      disabled={executeMutation.isPending || selectedCount === 0}
                      className="flex-1 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-30"
                      style={{
                        background: selectedCount > 0 ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                        border: selectedCount > 0 ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        color: selectedCount > 0 ? "rgba(147,197,253,0.9)" : "rgba(255,255,255,0.3)",
                      }}
                      data-testid="button-execute-suggestions"
                    >
                      {executeMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>Apply {selectedCount} action{selectedCount !== 1 ? "s" : ""}</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
