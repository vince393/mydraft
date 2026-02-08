import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wand2, Loader2, Check, X, Archive, Trash2, Star, Mail, Sparkles, FolderInput, ShieldAlert, RotateCcw, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

const actionMeta: Record<string, { icon: any; label: string; color: string }> = {
  spam: { icon: ShieldAlert, label: "Spam", color: "#ef4444" },
  junk: { icon: Ban, label: "Junk", color: "#f97316" },
  archive: { icon: Archive, label: "Archive", color: "#3b82f6" },
  delete: { icon: Trash2, label: "Delete", color: "#f97316" },
  star: { icon: Star, label: "Star", color: "#eab308" },
  mark_read: { icon: Mail, label: "Read", color: "#22c55e" },
  move_to_folder: { icon: FolderInput, label: "Move", color: "#a855f7" },
};

export function AiInboxRefreshButton({ onRefreshComplete }: { onRefreshComplete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: suggestionsData, refetch: refetchSuggestions } = useQuery<{ suggestions: AiSuggestion[] }>({
    queryKey: ["/api/ai/inbox-suggestions"],
    enabled: isOpen,
  });

  const suggestions = suggestionsData?.suggestions || [];

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/inbox-refresh");
      return res.json();
    },
    onSuccess: (data) => {
      refetchSuggestions();
      if (data.suggestions?.length === 0) {
        toast({ title: "Inbox looks clean", description: "No actions needed." });
      } else {
        setSelectedIds(new Set(data.suggestions?.map((s: AiSuggestion) => s.id) || []));
      }
    },
    onError: () => {
      toast({ title: "Analysis failed", description: "Try again.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/ai/inbox-suggestions/${id}`, { status });
      return res.json();
    },
    onSuccess: () => refetchSuggestions(),
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/inbox-suggestions/execute");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Done", description: `${data.executed} action${data.executed !== 1 ? "s" : ""} applied` });
      refetchSuggestions();
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/inbox-suggestions"] });
      onRefreshComplete?.();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply actions", variant: "destructive" });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", "/api/ai/inbox-suggestions"); },
    onSuccess: () => {
      refetchSuggestions();
      toast({ title: "Cleared" });
    },
  });

  const pending = suggestions.filter(s => s.status === "pending");
  const approved = suggestions.filter(s => s.status === "approved");
  const total = pending.length + approved.length;

  const toggleSelect = (id: number) => {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  };

  const toggleAll = () => {
    if (selectedIds.size === pending.length && pending.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(pending.map(s => s.id)));
  };

  const batchUpdate = async (status: string) => {
    for (const id of Array.from(selectedIds)) {
      await updateMutation.mutateAsync({ id, status });
    }
    if (status === "rejected") setSelectedIds(new Set());
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))",
          border: "1px solid rgba(168,85,247,0.18)",
        }}
        title="AI Inbox Cleanup"
        data-testid="button-ai-inbox-refresh"
      >
        <Wand2 className="w-4 h-4 text-purple-400/70 group-hover:text-purple-300 transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "380px",
              maxHeight: "min(520px, 80vh)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              background: "linear-gradient(145deg, rgba(30,30,40,0.92) 0%, rgba(20,20,28,0.96) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-foreground/90">Smart Cleanup</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.06)" }}
                data-testid="button-close-ai-refresh"
              >
                <X className="w-3.5 h-3.5 text-foreground/40" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {total === 0 && !refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-10 px-6">
                  <Wand2 className="w-8 h-8 text-purple-400/50 mb-3" />
                  <p className="text-sm text-foreground/70 mb-1">Analyze your inbox</p>
                  <p className="text-xs text-foreground/30 mb-5 text-center">Scan for spam, junk, and clutter</p>
                  <button
                    onClick={() => refreshMutation.mutate()}
                    className="px-5 py-2 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.25))",
                      border: "1px solid rgba(168,85,247,0.25)",
                      color: "#c4b5fd",
                    }}
                    data-testid="button-start-ai-analysis"
                  >
                    <Sparkles className="w-3 h-3" />
                    Start Analysis
                  </button>
                </div>
              ) : refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-3" />
                  <p className="text-xs text-foreground/50">Scanning inbox...</p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAll}
                        className="w-3.5 h-3.5 rounded-sm flex items-center justify-center cursor-pointer"
                        style={{
                          background: selectedIds.size === pending.length && pending.length > 0
                            ? "#6366f1" : "rgba(255,255,255,0.08)",
                          border: selectedIds.size === pending.length && pending.length > 0
                            ? "none" : "1px solid rgba(255,255,255,0.12)"
                        }}
                        data-testid="checkbox-select-all-suggestions"
                      >
                        {selectedIds.size === pending.length && pending.length > 0 && <Check className="w-2 h-2 text-white" />}
                      </button>
                      <span className="text-[10px] text-foreground/30">{selectedIds.size}/{pending.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => refreshMutation.mutate()}
                        className="px-2 py-0.5 text-[10px] text-foreground/35 hover:text-foreground/55 cursor-pointer flex items-center gap-1"
                        data-testid="button-rescan-inbox"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Rescan
                      </button>
                      {pending.length > 0 && (
                        <button
                          onClick={() => dismissAllMutation.mutate()}
                          className="px-2 py-0.5 text-[10px] text-foreground/25 hover:text-foreground/45 cursor-pointer"
                          data-testid="button-dismiss-all-suggestions"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Suggestion list */}
                  <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                    <div className="px-2 py-1.5 space-y-0.5">
                      {pending.map((s) => {
                        const meta = actionMeta[s.actionType] || actionMeta.archive;
                        const Icon = meta.icon;
                        const sel = selectedIds.has(s.id);

                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                            style={{
                              background: sel ? "rgba(255,255,255,0.04)" : "transparent",
                            }}
                            onClick={() => toggleSelect(s.id)}
                            data-testid={`suggestion-item-${s.id}`}
                          >
                            <button
                              className="w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center cursor-pointer"
                              style={{
                                background: sel ? "#6366f1" : "rgba(255,255,255,0.08)",
                                border: sel ? "none" : "1px solid rgba(255,255,255,0.12)"
                              }}
                              onClick={(e) => { e.stopPropagation(); toggleSelect(s.id); }}
                              data-testid={`checkbox-suggestion-${s.id}`}
                            >
                              {sel && <Check className="w-2 h-2 text-white" />}
                            </button>

                            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color, opacity: 0.7 }} />

                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground/75 truncate leading-tight">
                                {s.messageSubject || "(No subject)"}
                              </p>
                              <p className="text-[10px] text-foreground/30 truncate">
                                {s.messageSender}
                                {s.actionData?.reason && <> &middot; {s.actionData.reason}</>}
                              </p>
                            </div>

                            <span
                              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}20` }}
                            >
                              {s.actionType === "move_to_folder" && s.actionData?.folderName
                                ? s.actionData.folderName
                                : meta.label}
                            </span>

                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
                                style={{ background: "rgba(34,197,94,0.08)" }}
                                onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: s.id, status: "approved" }); }}
                                title="Approve"
                                data-testid={`button-approve-suggestion-${s.id}`}
                              >
                                <Check className="w-2.5 h-2.5" style={{ color: "#4ade80" }} />
                              </button>
                              <button
                                className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
                                style={{ background: "rgba(239,68,68,0.06)" }}
                                onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: s.id, status: "rejected" }); }}
                                title="Deny"
                                data-testid={`button-reject-suggestion-${s.id}`}
                              >
                                <X className="w-2.5 h-2.5" style={{ color: "#f87171" }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {approved.length > 0 && (
                        <div className="mt-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="text-[10px] text-foreground/30 px-2 flex items-center gap-1 mb-1">
                            <Check className="w-2.5 h-2.5" style={{ color: "#4ade80" }} />
                            Ready ({approved.length})
                          </span>
                          {approved.map((s) => {
                            const meta = actionMeta[s.actionType] || actionMeta.archive;
                            const Icon = meta.icon;
                            return (
                              <div
                                key={s.id}
                                className="flex items-center gap-2 px-2 py-1 rounded-md"
                                style={{ background: "rgba(34,197,94,0.03)" }}
                              >
                                <Icon className="w-3 h-3 flex-shrink-0" style={{ color: meta.color, opacity: 0.5 }} />
                                <span className="text-[11px] text-foreground/50 truncate flex-1">{s.messageSubject}</span>
                                <button
                                  onClick={() => updateMutation.mutate({ id: s.id, status: "rejected" })}
                                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 cursor-pointer"
                                  style={{ background: "rgba(255,255,255,0.05)" }}
                                  title="Undo"
                                >
                                  <X className="w-2 h-2 text-foreground/25" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {pending.length === 0 && approved.length === 0 && (
                        <div className="text-center py-8">
                          <Check className="w-6 h-6 mx-auto mb-2" style={{ color: "#4ade80" }} />
                          <p className="text-xs text-foreground/50">All caught up!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  {(pending.length > 0 || approved.length > 0) && (
                    <div className="flex items-center justify-between px-3 py-2 gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-1">
                        {selectedIds.size > 0 && (
                          <>
                            <button
                              onClick={() => batchUpdate("rejected")}
                              disabled={updateMutation.isPending}
                              className="px-2.5 py-1 rounded-full text-[10px] cursor-pointer"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
                              data-testid="button-reject-selected"
                            >
                              Deny {selectedIds.size}
                            </button>
                            <button
                              onClick={() => batchUpdate("approved")}
                              disabled={updateMutation.isPending}
                              className="px-2.5 py-1 rounded-full text-[10px] cursor-pointer"
                              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.12)", color: "#86efac" }}
                              data-testid="button-approve-selected"
                            >
                              Approve {selectedIds.size}
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => executeMutation.mutate()}
                        disabled={approved.length === 0 || executeMutation.isPending}
                        className="px-3.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all flex items-center gap-1.5"
                        style={{
                          background: approved.length > 0
                            ? "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.15))"
                            : "rgba(255,255,255,0.03)",
                          border: approved.length > 0
                            ? "1px solid rgba(34,197,94,0.2)"
                            : "1px solid rgba(255,255,255,0.05)",
                          color: approved.length > 0 ? "#86efac" : "rgba(255,255,255,0.2)",
                          opacity: approved.length === 0 ? 0.5 : 1,
                        }}
                        data-testid="button-execute-suggestions"
                      >
                        {executeMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Apply {approved.length > 0 ? `(${approved.length})` : ""}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
