import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wand2, Loader2, Check, X, Archive, Trash2, Star, Mail, Sparkles, FolderInput, ShieldAlert, Ban, Undo2 } from "lucide-react";
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
  spam: { icon: ShieldAlert, label: "Move to spam", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  junk: { icon: Ban, label: "Mark as junk", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  archive: { icon: Archive, label: "Archive", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  delete: { icon: Trash2, label: "Delete", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  star: { icon: Star, label: "Star", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
  mark_read: { icon: Mail, label: "Mark as read", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  move_to_folder: { icon: FolderInput, label: "Move to folder", color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
};

export function AiInboxRefreshButton({ onRefreshComplete, compact = false, asMenuItem = false }: { onRefreshComplete?: () => void; compact?: boolean; asMenuItem?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
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
        toast({ title: "Inbox looks clean", description: "No actions needed right now." });
      }
    },
    onError: () => {
      toast({ title: "Analysis failed", description: "Please try again.", variant: "destructive" });
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
      toast({ title: "Cleanup complete", description: `${data.executed} action${data.executed !== 1 ? "s" : ""} applied to your inbox.` });
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
      refetchSuggestions();
      toast({ title: "Suggestions cleared" });
    },
  });

  const pending = suggestions.filter(s => s.status === "pending");
  const approved = suggestions.filter(s => s.status === "approved");
  const readyCount = approved.length;

  const approveAll = async () => {
    for (const s of pending) {
      await updateMutation.mutateAsync({ id: s.id, status: "approved" });
    }
  };

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
            className="relative w-full h-full sm:h-auto sm:max-w-[480px] sm:max-h-[min(600px,85vh)] flex flex-col sm:rounded-2xl sm:border sm:border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
            style={{
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              background: "linear-gradient(145deg, rgba(30,30,40,0.95) 0%, rgba(20,20,28,0.98) 100%)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 sm:px-5 sm:py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.15))" }}>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground/90">AI Cleanup</h2>
                  <p className="text-[11px] text-foreground/40">Review suggestions before applying</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06] transition-colors"
                data-testid="button-close-ai-refresh"
              >
                <X className="w-4 h-4 text-foreground/40" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {(pending.length === 0 && approved.length === 0) && !refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 flex-1">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))" }}>
                    <Wand2 className="w-7 h-7 text-purple-400/60" />
                  </div>
                  <p className="text-base font-medium text-foreground/80 mb-2">Scan your inbox</p>
                  <p className="text-sm text-foreground/35 mb-8 text-center leading-relaxed max-w-[260px]">
                    AI will find spam, junk, and clutter so you can clean up with one tap.
                  </p>
                  <button
                    onClick={() => refreshMutation.mutate()}
                    className="px-6 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all flex items-center gap-2 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.25))",
                      border: "1px solid rgba(168,85,247,0.3)",
                      color: "#c4b5fd",
                    }}
                    data-testid="button-start-ai-analysis"
                  >
                    <Sparkles className="w-4 h-4" />
                    Start Scan
                  </button>
                </div>
              ) : refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 flex-1">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))" }}>
                    <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                  </div>
                  <p className="text-base font-medium text-foreground/70 mb-1">Scanning inbox...</p>
                  <p className="text-sm text-foreground/30">This takes a few seconds</p>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-sm text-foreground/50">
                      {pending.length > 0 && <>{pending.length} suggestion{pending.length !== 1 ? "s" : ""}</>}
                      {pending.length > 0 && readyCount > 0 && " · "}
                      {readyCount > 0 && <span className="text-green-400/70">{readyCount} ready</span>}
                      {pending.length === 0 && readyCount === 0 && "No suggestions"}
                    </p>
                    <div className="flex items-center gap-2">
                      {pending.length > 0 && (
                        <button
                          onClick={approveAll}
                          disabled={updateMutation.isPending}
                          className="text-xs text-purple-400/70 hover:text-purple-300 cursor-pointer transition-colors px-2 py-1"
                          data-testid="button-approve-all"
                        >
                          Keep all
                        </button>
                      )}
                      <button
                        onClick={() => dismissAllMutation.mutate()}
                        className="text-xs text-foreground/25 hover:text-foreground/45 cursor-pointer transition-colors px-2 py-1"
                        data-testid="button-dismiss-all-suggestions"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Suggestion list */}
                  <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                    <div className="px-3 py-2 space-y-2 sm:px-4">
                      {pending.map((s) => {
                        const meta = actionMeta[s.actionType] || actionMeta.archive;
                        const Icon = meta.icon;

                        return (
                          <div
                            key={s.id}
                            className="rounded-xl p-3 sm:p-3 transition-colors"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                            data-testid={`suggestion-item-${s.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: meta.bg }}>
                                <Icon className="w-4 h-4" style={{ color: meta.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground/80 font-medium truncate">
                                  {s.messageSubject || "(No subject)"}
                                </p>
                                <p className="text-xs text-foreground/35 truncate mt-0.5">
                                  {s.messageSender}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span
                                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
                                    style={{ background: meta.bg, color: meta.color }}
                                  >
                                    <Icon className="w-3 h-3" />
                                    {s.actionType === "move_to_folder" && s.actionData?.folderName
                                      ? `Move to ${s.actionData.folderName}`
                                      : meta.label}
                                  </span>
                                  {s.actionData?.reason && (
                                    <span className="text-[11px] text-foreground/25 truncate">{s.actionData.reason}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 ml-12">
                              <button
                                onClick={() => updateMutation.mutate({ id: s.id, status: "approved" })}
                                className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
                                style={{ background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.15)" }}
                                data-testid={`button-approve-suggestion-${s.id}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Keep
                              </button>
                              <button
                                onClick={() => updateMutation.mutate({ id: s.id, status: "rejected" })}
                                className="flex-1 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
                                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
                                data-testid={`button-reject-suggestion-${s.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                                Skip
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {approved.length > 0 && (
                        <div className="pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <p className="text-xs text-green-400/50 font-medium px-1 mb-2 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            Ready to apply
                          </p>
                          <div className="space-y-1.5">
                            {approved.map((s) => {
                              const meta = actionMeta[s.actionType] || actionMeta.archive;
                              const Icon = meta.icon;
                              return (
                                <div
                                  key={s.id}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                  style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.08)" }}
                                >
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.1)" }}>
                                    <Icon className="w-3.5 h-3.5" style={{ color: meta.color, opacity: 0.7 }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-foreground/60 truncate">{s.messageSubject}</p>
                                    <p className="text-[11px] text-foreground/25 mt-0.5">
                                      {s.actionType === "move_to_folder" && s.actionData?.folderName
                                        ? `Move to ${s.actionData.folderName}`
                                        : meta.label}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => updateMutation.mutate({ id: s.id, status: "rejected" })}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-white/[0.06] transition-colors"
                                    title="Undo"
                                    data-testid={`button-undo-suggestion-${s.id}`}
                                  >
                                    <Undo2 className="w-3.5 h-3.5 text-foreground/25" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {pending.length === 0 && approved.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.1)" }}>
                            <Check className="w-6 h-6" style={{ color: "#4ade80" }} />
                          </div>
                          <p className="text-sm font-medium text-foreground/60">All caught up!</p>
                          <p className="text-xs text-foreground/30 mt-1">Your inbox is looking good.</p>
                          <button
                            onClick={() => refreshMutation.mutate()}
                            className="mt-5 px-4 py-2 rounded-lg text-xs text-foreground/40 hover:text-foreground/60 cursor-pointer transition-colors"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                            data-testid="button-rescan-inbox"
                          >
                            Scan again
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer - Apply button */}
                  {readyCount > 0 && (
                    <div className="px-4 py-4 sm:px-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button
                        onClick={() => executeMutation.mutate()}
                        disabled={executeMutation.isPending}
                        className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{
                          background: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,163,74,0.2))",
                          border: "1px solid rgba(34,197,94,0.25)",
                          color: "#86efac",
                        }}
                        data-testid="button-execute-suggestions"
                      >
                        {executeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Apply {readyCount} change{readyCount !== 1 ? "s" : ""}
                      </button>
                    </div>
                  )}
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
