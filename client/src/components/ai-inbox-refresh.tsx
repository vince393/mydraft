import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wand2, Loader2, Check, X, Archive, Trash2, Star, Mail, AlertTriangle, Sparkles, FolderInput, ShieldAlert, RotateCcw, Ban } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const actionIcons: Record<string, any> = {
  spam: ShieldAlert,
  junk: Ban,
  archive: Archive,
  delete: Trash2,
  star: Star,
  mark_read: Mail,
  move_to_folder: FolderInput,
};

const actionLabels: Record<string, string> = {
  spam: "Spam",
  junk: "Junk",
  archive: "Archive",
  delete: "Delete",
  star: "Important",
  mark_read: "Mark Read",
  move_to_folder: "Move",
};

const actionColors: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
  spam: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)", text: "rgba(252,165,165,1)", iconColor: "#f87171" },
  junk: { bg: "rgba(251,146,60,0.1)", border: "rgba(251,146,60,0.2)", text: "rgba(253,186,116,1)", iconColor: "#fb923c" },
  archive: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)", text: "rgba(147,197,253,1)", iconColor: "#60a5fa" },
  delete: { bg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.15)", text: "rgba(253,186,116,1)", iconColor: "#fb923c" },
  star: { bg: "rgba(250,204,21,0.1)", border: "rgba(250,204,21,0.2)", text: "rgba(253,224,71,1)", iconColor: "#facc15" },
  mark_read: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)", text: "rgba(134,239,172,1)", iconColor: "#4ade80" },
  move_to_folder: { bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.2)", text: "rgba(216,180,254,1)", iconColor: "#a855f7" },
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
        toast({ title: "Inbox looks clean", description: "No actions needed right now." });
      } else {
        setSelectedIds(new Set(data.suggestions?.map((s: AiSuggestion) => s.id) || []));
      }
    },
    onError: () => {
      toast({ title: "Analysis failed", description: "Could not analyze inbox. Try again.", variant: "destructive" });
    },
  });

  const updateSuggestionMutation = useMutation({
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
      toast({
        title: "Cleanup complete",
        description: `${data.executed} action${data.executed !== 1 ? 's' : ''} applied${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
      });
      refetchSuggestions();
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/inbox-suggestions"] });
      onRefreshComplete?.();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to execute actions", variant: "destructive" });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", "/api/ai/inbox-suggestions"); },
    onSuccess: () => {
      refetchSuggestions();
      toast({ title: "Cleared", description: "All suggestions dismissed" });
    },
  });

  const pendingSuggestions = suggestions.filter(s => s.status === "pending");
  const approvedSuggestions = suggestions.filter(s => s.status === "approved");
  const allCount = pendingSuggestions.length + approvedSuggestions.length;

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const approveSelected = async () => {
    for (const id of Array.from(selectedIds)) {
      await updateSuggestionMutation.mutateAsync({ id, status: "approved" });
    }
  };

  const rejectSelected = async () => {
    for (const id of Array.from(selectedIds)) {
      await updateSuggestionMutation.mutateAsync({ id, status: "rejected" });
    }
    setSelectedIds(new Set());
  };

  const getConfidenceLabel = (c: number) => {
    if (c >= 85) return "High";
    if (c >= 60) return "Med";
    return "Low";
  };

  const getConfidenceColor = (c: number) => {
    if (c >= 85) return "#4ade80";
    if (c >= 60) return "#facc15";
    return "#fb923c";
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-sm cursor-pointer transition-all duration-150"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.08))",
          border: "1px solid rgba(168,85,247,0.2)",
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08)"
        }}
        title="AI Inbox Cleanup"
        data-testid="button-ai-inbox-refresh"
      >
        <Wand2 className="w-4 h-4 text-purple-400/70 group-hover:text-purple-300 transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md max-h-[75vh] flex flex-col mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              boxShadow: "0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)"
            }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.15))" }}>
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground/90">Smart Cleanup</h3>
                  <p className="text-[11px] text-foreground/40">AI-powered inbox organizer</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
                data-testid="button-close-ai-refresh"
              >
                <X className="w-3.5 h-3.5 text-foreground/40" />
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {allCount === 0 && !refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))",
                      border: "1px solid rgba(168,85,247,0.15)"
                    }}
                  >
                    <Wand2 className="w-6 h-6 text-purple-300/80" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground/80 mb-1">Analyze your inbox</h3>
                  <p className="text-xs text-foreground/35 mb-5 max-w-[220px] leading-relaxed">
                    We'll scan for spam, junk, and clutter you can clean up
                  </p>
                  <button
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                    className="px-5 py-2 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.2))",
                      border: "1px solid rgba(168,85,247,0.3)",
                      color: "rgba(216,180,254,1)",
                    }}
                    data-testid="button-start-ai-analysis"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Start Analysis
                  </button>
                </div>
              ) : refreshMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-14">
                  <div className="relative mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)" }}>
                      <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
                    </div>
                  </div>
                  <p className="text-xs text-foreground/50 mb-1">Scanning your inbox...</p>
                  <p className="text-[11px] text-foreground/25">This may take a few seconds</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (selectedIds.size === pendingSuggestions.length && pendingSuggestions.length > 0) setSelectedIds(new Set());
                          else setSelectedIds(new Set(pendingSuggestions.map(s => s.id)));
                        }}
                        className="w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{
                          background: selectedIds.size === pendingSuggestions.length && pendingSuggestions.length > 0
                            ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "rgba(255,255,255,0.06)",
                          border: selectedIds.size === pendingSuggestions.length && pendingSuggestions.length > 0
                            ? "none" : "1px solid rgba(255,255,255,0.1)"
                        }}
                        data-testid="checkbox-select-all-suggestions"
                      >
                        {selectedIds.size === pendingSuggestions.length && pendingSuggestions.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <span className="text-[11px] text-foreground/35">{selectedIds.size} of {pendingSuggestions.length} selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => refreshMutation.mutate()}
                        disabled={refreshMutation.isPending}
                        className="px-2.5 py-1 rounded-md text-[11px] text-foreground/40 hover:text-foreground/60 cursor-pointer transition-colors flex items-center gap-1"
                        data-testid="button-rescan-inbox"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Rescan
                      </button>
                      {pendingSuggestions.length > 0 && (
                        <button
                          onClick={() => dismissAllMutation.mutate()}
                          disabled={dismissAllMutation.isPending}
                          className="px-2.5 py-1 rounded-md text-[11px] text-foreground/30 hover:text-foreground/50 cursor-pointer transition-colors"
                          data-testid="button-dismiss-all-suggestions"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="px-3 py-2 space-y-1.5">
                      {pendingSuggestions.map((suggestion) => {
                        const Icon = actionIcons[suggestion.actionType] || Mail;
                        const isSelected = selectedIds.has(suggestion.id);
                        const colors = actionColors[suggestion.actionType] || actionColors.archive;

                        return (
                          <div
                            key={suggestion.id}
                            className="rounded-xl p-3 transition-all cursor-pointer"
                            style={{
                              background: isSelected ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                              border: isSelected ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.04)",
                            }}
                            onClick={() => toggleSelect(suggestion.id)}
                            data-testid={`suggestion-item-${suggestion.id}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer"
                                style={{
                                  background: isSelected ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "rgba(255,255,255,0.06)",
                                  border: isSelected ? "none" : "1px solid rgba(255,255,255,0.1)"
                                }}
                                onClick={(e) => { e.stopPropagation(); toggleSelect(suggestion.id); }}
                                data-testid={`checkbox-suggestion-${suggestion.id}`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                                  >
                                    <Icon className="w-2.5 h-2.5" style={{ color: colors.iconColor }} />
                                    {suggestion.actionType === "move_to_folder" && suggestion.actionData?.folderName
                                      ? suggestion.actionData.folderName
                                      : actionLabels[suggestion.actionType] || suggestion.actionType}
                                  </span>
                                  <span className="text-[10px] font-medium ml-auto flex items-center gap-1" style={{ color: getConfidenceColor(suggestion.confidence) }}>
                                    {getConfidenceLabel(suggestion.confidence)}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-foreground/80 truncate leading-tight">
                                  {suggestion.messageSubject || "(No subject)"}
                                </p>
                                <p className="text-[11px] text-foreground/35 truncate">
                                  {suggestion.messageSender || "Unknown"}
                                </p>
                                {suggestion.actionData?.reason && (
                                  <p className="text-[11px] text-foreground/30 mt-1 leading-relaxed line-clamp-2">
                                    {suggestion.actionData.reason}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all"
                                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.12)" }}
                                  onClick={(e) => { e.stopPropagation(); updateSuggestionMutation.mutate({ id: suggestion.id, status: "approved" }); }}
                                  title="Approve"
                                  data-testid={`button-approve-suggestion-${suggestion.id}`}
                                >
                                  <Check className="w-3 h-3" style={{ color: "#4ade80" }} />
                                </button>
                                <button
                                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all"
                                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.1)" }}
                                  onClick={(e) => { e.stopPropagation(); updateSuggestionMutation.mutate({ id: suggestion.id, status: "rejected" }); }}
                                  title="Deny"
                                  data-testid={`button-reject-suggestion-${suggestion.id}`}
                                >
                                  <X className="w-3 h-3" style={{ color: "#f87171" }} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {pendingSuggestions.length === 0 && approvedSuggestions.length === 0 && (
                        <div className="text-center py-8">
                          <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                            <Check className="w-5 h-5" style={{ color: "#4ade80" }} />
                          </div>
                          <p className="text-xs text-foreground/50">All caught up!</p>
                          <p className="text-[11px] text-foreground/25 mt-0.5">Your inbox is clean</p>
                        </div>
                      )}

                      {approvedSuggestions.length > 0 && (
                        <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <div className="flex items-center gap-1.5 px-1 mb-1.5">
                            <Check className="w-3 h-3" style={{ color: "#4ade80" }} />
                            <span className="text-[11px] text-foreground/40">Ready to apply ({approvedSuggestions.length})</span>
                          </div>
                          <div className="space-y-0.5">
                            {approvedSuggestions.map((suggestion) => {
                              const Icon = actionIcons[suggestion.actionType] || Mail;
                              const colors = actionColors[suggestion.actionType] || actionColors.archive;
                              return (
                                <div
                                  key={suggestion.id}
                                  className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg"
                                  style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.08)" }}
                                >
                                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color: colors.iconColor }} />
                                  <span className="truncate flex-1 text-[11px] text-foreground/60">{suggestion.messageSubject}</span>
                                  <button
                                    onClick={() => updateSuggestionMutation.mutate({ id: suggestion.id, status: "rejected" })}
                                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 cursor-pointer"
                                    style={{ background: "rgba(255,255,255,0.05)" }}
                                    title="Undo"
                                  >
                                    <X className="w-2.5 h-2.5 text-foreground/30" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {(pendingSuggestions.length > 0 || approvedSuggestions.length > 0) && (
                    <div className="flex items-center justify-between px-4 py-3 gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-1.5">
                        {selectedIds.size > 0 && (
                          <>
                            <button
                              onClick={rejectSelected}
                              disabled={updateSuggestionMutation.isPending}
                              className="px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                              data-testid="button-reject-selected"
                            >
                              Deny {selectedIds.size}
                            </button>
                            <button
                              onClick={approveSelected}
                              disabled={updateSuggestionMutation.isPending}
                              className="px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer transition-all"
                              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.15)", color: "rgba(134,239,172,1)" }}
                              data-testid="button-approve-selected"
                            >
                              Approve {selectedIds.size}
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => executeMutation.mutate()}
                        disabled={approvedSuggestions.length === 0 || executeMutation.isPending}
                        className="px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-30"
                        style={{
                          background: approvedSuggestions.length > 0
                            ? "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.2))"
                            : "rgba(255,255,255,0.04)",
                          border: approvedSuggestions.length > 0
                            ? "1px solid rgba(168,85,247,0.3)"
                            : "1px solid rgba(255,255,255,0.06)",
                          color: approvedSuggestions.length > 0
                            ? "rgba(216,180,254,1)"
                            : "rgba(255,255,255,0.3)",
                        }}
                        data-testid="button-execute-approved"
                      >
                        {executeMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Clean Up ({approvedSuggestions.length})
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
