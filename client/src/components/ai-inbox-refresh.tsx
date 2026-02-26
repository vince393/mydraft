import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wand2, Loader2, Check, X, Archive, Trash2, Star, Mail, Sparkles, FolderInput, ShieldAlert, Ban } from "lucide-react";
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

const actionMeta: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  spam: { icon: ShieldAlert, label: "Spam", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  junk: { icon: Ban, label: "Junk", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  archive: { icon: Archive, label: "Archive", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  delete: { icon: Trash2, label: "Delete", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  star: { icon: Star, label: "Star", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
  mark_read: { icon: Mail, label: "Mark read", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  move_to_folder: { icon: FolderInput, label: "Move", color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
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
      toast({ title: "Cleanup complete", description: `${data.executed} action${data.executed !== 1 ? "s" : ""} applied.` });
      setDeselected(new Set());
      refetchSuggestions();
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
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

  const groupedByAction = items.reduce<Record<string, AiSuggestion[]>>((acc, s) => {
    const key = s.actionType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const actionOrder = ["delete", "spam", "junk", "archive", "move_to_folder", "mark_read", "star"];
  const sortedGroups = actionOrder.filter(a => groupedByAction[a]).map(a => ({ action: a, items: groupedByAction[a] }));
  for (const key of Object.keys(groupedByAction)) {
    if (!actionOrder.includes(key)) sortedGroups.push({ action: key, items: groupedByAction[key] });
  }

  return (
    <>
      {asMenuItem ? (
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setTimeout(() => setIsOpen(true), 100);
          }}
          className="gap-2"
          data-testid="button-ai-inbox-refresh"
        >
          <Wand2 className="w-4 h-4 text-purple-400" />
          AI Cleanup
        </DropdownMenuItem>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`group ${compact ? 'w-8 h-8' : 'w-9 h-9'} flex items-center justify-center rounded-full cursor-pointer transition-all flex-shrink-0`}
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))",
            border: "1px solid rgba(168,85,247,0.18)",
          }}
          title="AI Inbox Cleanup"
          data-testid="button-ai-inbox-refresh"
        >
          <Wand2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-purple-400/70 group-hover:text-purple-300 transition-colors`} />
        </button>
      )}

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center sm:justify-center" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full h-full sm:h-auto sm:max-w-[420px] sm:max-h-[min(580px,85vh)] flex flex-col sm:rounded-2xl sm:border sm:border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
            style={{
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              background: "linear-gradient(145deg, rgba(30,30,40,0.95) 0%, rgba(20,20,28,0.98) 100%)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
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
              {items.length === 0 && !refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-14 px-6 flex-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))" }}>
                    <Wand2 className="w-5 h-5 text-purple-400/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground/70 mb-1">Scan your inbox</p>
                  <p className="text-xs text-foreground/30 mb-6 text-center max-w-[220px]">
                    AI will find emails to delete, archive, or organize.
                  </p>
                  <button
                    onClick={() => refreshMutation.mutate()}
                    className="px-5 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center gap-2 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.25))",
                      border: "1px solid rgba(168,85,247,0.3)",
                      color: "#c4b5fd",
                    }}
                    data-testid="button-start-ai-analysis"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Start Scan
                  </button>
                </div>
              ) : refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-14 flex-1">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-3" />
                  <p className="text-sm text-foreground/50">Scanning inbox...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-xs text-foreground/40">
                      {selectedCount} of {items.length} selected
                    </p>
                    <div className="flex items-center gap-1">
                      {deselected.size > 0 ? (
                        <button
                          onClick={() => setDeselected(new Set())}
                          className="text-[11px] text-purple-400/60 hover:text-purple-300 cursor-pointer px-2 py-0.5"
                          data-testid="button-select-all"
                        >
                          Select all
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeselected(new Set(items.map(s => s.id)))}
                          className="text-[11px] text-foreground/25 hover:text-foreground/40 cursor-pointer px-2 py-0.5"
                          data-testid="button-deselect-all"
                        >
                          Deselect all
                        </button>
                      )}
                      <button
                        onClick={() => { dismissAllMutation.mutate(); }}
                        className="text-[11px] text-foreground/20 hover:text-foreground/35 cursor-pointer px-2 py-0.5"
                        data-testid="button-dismiss-all-suggestions"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                    <div className="py-1">
                      {sortedGroups.map(({ action, items: groupItems }) => {
                        const meta = actionMeta[action] || actionMeta.archive;
                        const Icon = meta.icon;
                        return (
                          <div key={action}>
                            <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
                              <Icon className="w-3 h-3" style={{ color: meta.color, opacity: 0.6 }} />
                              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: meta.color, opacity: 0.5 }}>
                                {meta.label} ({groupItems.length})
                              </span>
                            </div>
                            {groupItems.map((s) => {
                              const isSelected = !deselected.has(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => toggleItem(s.id)}
                                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-left cursor-pointer transition-colors hover:bg-white/[0.03]"
                                  data-testid={`suggestion-item-${s.id}`}
                                >
                                  <div
                                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                    style={{
                                      background: isSelected ? meta.bg : "transparent",
                                      border: isSelected ? `1.5px solid ${meta.color}` : "1.5px solid rgba(255,255,255,0.12)",
                                    }}
                                  >
                                    {isSelected && <Check className="w-2.5 h-2.5" style={{ color: meta.color }} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs truncate ${isSelected ? "text-foreground/70" : "text-foreground/30 line-through"}`}>
                                      {s.messageSubject || "(No subject)"}
                                    </p>
                                    <p className="text-[10px] text-foreground/25 truncate">
                                      {s.messageSender}
                                      {s.actionData?.reason && ` \u00B7 ${s.actionData.reason}`}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                      onClick={() => refreshMutation.mutate()}
                      disabled={refreshMutation.isPending}
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-all hover:bg-white/[0.06]"
                      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                      title="Rescan"
                      data-testid="button-rescan-inbox"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-foreground/30" />
                    </button>
                    <button
                      onClick={() => executeMutation.mutate(selectedIds)}
                      disabled={executeMutation.isPending || selectedCount === 0}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-30"
                      style={{
                        background: selectedCount > 0 ? "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.2))" : "rgba(255,255,255,0.04)",
                        border: selectedCount > 0 ? "1px solid rgba(168,85,247,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        color: selectedCount > 0 ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                      }}
                      data-testid="button-execute-suggestions"
                    >
                      {executeMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Clean up {selectedCount} email{selectedCount !== 1 ? "s" : ""}
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
