import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wand2, Loader2, Check, X, Archive, Trash2, Star, Mail, AlertTriangle, ChevronDown, ChevronUp, Sparkles, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
  spam: AlertTriangle,
  archive: Archive,
  delete: Trash2,
  star: Star,
  mark_read: Mail,
  move_to_folder: FolderInput,
};

const actionLabels: Record<string, string> = {
  spam: "Mark as Spam",
  archive: "Archive",
  delete: "Delete",
  star: "Star",
  mark_read: "Mark as Read",
  move_to_folder: "Move to Folder",
};

const actionIconColors: Record<string, string> = {
  spam: "text-red-400",
  archive: "text-blue-400",
  delete: "text-orange-400",
  star: "text-yellow-400",
  mark_read: "text-green-400",
  move_to_folder: "text-purple-400",
};

export function AiInboxRefreshButton({ onRefreshComplete }: { onRefreshComplete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: suggestionsData, isLoading: isLoadingSuggestions, refetch: refetchSuggestions } = useQuery<{ suggestions: AiSuggestion[] }>({
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
        toast({
          title: "No suggestions",
          description: "Your inbox looks well organized!",
        });
      } else {
        toast({
          title: "Analysis complete",
          description: `Found ${data.suggestions?.length || 0} suggested actions`,
        });
        setSelectedIds(new Set(data.suggestions?.map((s: AiSuggestion) => s.id) || []));
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze inbox",
        variant: "destructive",
      });
    },
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/ai/inbox-suggestions/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      refetchSuggestions();
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/inbox-suggestions/execute");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Actions executed",
        description: `${data.executed} actions completed${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
      });
      refetchSuggestions();
      // Invalidate all email-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/inbox-suggestions"] });
      onRefreshComplete?.();
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to execute actions",
        variant: "destructive",
      });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/ai/inbox-suggestions");
    },
    onSuccess: () => {
      refetchSuggestions();
      toast({
        title: "Dismissed",
        description: "All suggestions have been dismissed",
      });
    },
  });

  const pendingSuggestions = suggestions.filter(s => s.status === "pending");
  const approvedSuggestions = suggestions.filter(s => s.status === "approved");

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingSuggestions.length && pendingSuggestions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSuggestions.map(s => s.id)));
    }
  };

  const approveSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await updateSuggestionMutation.mutateAsync({ id, status: "approved" });
    }
  };

  const rejectSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await updateSuggestionMutation.mutateAsync({ id, status: "rejected" });
    }
    setSelectedIds(new Set());
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-purple-500"
        title="AI Inbox Refresh"
        data-testid="button-ai-inbox-refresh"
      >
        <Wand2 className="w-4 h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0 border-border/50">
          <DialogHeader className="p-5 pb-4 border-b border-border/30">
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              Smart Cleanup
            </DialogTitle>
            <DialogDescription className="text-xs">
              Based on your history, we recommend these actions
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {suggestions.length === 0 && !refreshMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                  <Wand2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium text-sm mb-1">Scan your inbox</h3>
                <p className="text-xs text-muted-foreground mb-5 max-w-[200px]">
                  We'll learn from your history and suggest what to clean up
                </p>
                <Button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  size="sm"
                  className="gap-1.5"
                  data-testid="button-start-ai-analysis"
                >
                  {refreshMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Analyze
                </Button>
              </div>
            ) : refreshMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" />
                <p className="text-xs text-muted-foreground">Scanning...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.size === pendingSuggestions.length && pendingSuggestions.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="h-4 w-4"
                      data-testid="checkbox-select-all-suggestions"
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.size}/{pendingSuggestions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshMutation.mutate()}
                      disabled={refreshMutation.isPending}
                      data-testid="button-rescan-inbox"
                    >
                      Rescan
                    </Button>
                    {pendingSuggestions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAllMutation.mutate()}
                        disabled={dismissAllMutation.isPending}
                        className="text-muted-foreground"
                        data-testid="button-dismiss-all-suggestions"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="px-3 py-2 space-y-1">
                    {pendingSuggestions.map((suggestion) => {
                      const Icon = actionIcons[suggestion.actionType] || Mail;
                      const isExpanded = expandedId === suggestion.id;
                      const isSelected = selectedIds.has(suggestion.id);

                      return (
                        <div
                          key={suggestion.id}
                          className={`rounded-md p-2.5 transition-all cursor-pointer overflow-visible ${
                            isSelected ? "bg-primary/5" : "hover-elevate"
                          }`}
                          onClick={() => toggleSelect(suggestion.id)}
                          data-testid={`suggestion-item-${suggestion.id}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (typeof checked === 'boolean') toggleSelect(suggestion.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5"
                              data-testid={`checkbox-suggestion-${suggestion.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Icon className={`w-3 h-3 flex-shrink-0 ${actionIconColors[suggestion.actionType] || "text-muted-foreground"}`} />
                                <span className="text-[11px] text-muted-foreground">
                                  {suggestion.actionType === "move_to_folder" && suggestion.actionData?.folderName
                                    ? `Move to ${suggestion.actionData.folderName}`
                                    : actionLabels[suggestion.actionType]}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 ml-auto">
                                  {suggestion.confidence}%
                                </span>
                              </div>
                              <p className="font-medium text-xs truncate leading-tight">
                                {suggestion.messageSubject || "(No subject)"}
                              </p>
                              <p className="text-[11px] text-muted-foreground/70 truncate">
                                {suggestion.messageSender || "Unknown"}
                              </p>
                              {isExpanded && suggestion.actionData?.reason && (
                                <p className="text-[11px] text-muted-foreground mt-1.5 py-1.5 px-2 bg-muted/30 rounded leading-relaxed">
                                  {suggestion.actionData.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : suggestion.id); }}
                                data-testid={`button-expand-suggestion-${suggestion.id}`}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-500"
                                onClick={(e) => { e.stopPropagation(); updateSuggestionMutation.mutate({ id: suggestion.id, status: "approved" }); }}
                                data-testid={`button-approve-suggestion-${suggestion.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                                onClick={(e) => { e.stopPropagation(); updateSuggestionMutation.mutate({ id: suggestion.id, status: "rejected" }); }}
                                data-testid={`button-reject-suggestion-${suggestion.id}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {pendingSuggestions.length === 0 && approvedSuggestions.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        <Check className="w-8 h-8 mx-auto mb-2 text-green-500/60" />
                        <p className="text-xs">All done!</p>
                      </div>
                    )}

                    {approvedSuggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <h4 className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-500" />
                          Ready ({approvedSuggestions.length})
                        </h4>
                        <div className="space-y-0.5">
                          {approvedSuggestions.map((suggestion) => {
                            const Icon = actionIcons[suggestion.actionType] || Mail;
                            return (
                              <div
                                key={suggestion.id}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-sm bg-green-500/5 text-xs"
                              >
                                <Icon className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span className="truncate flex-1 text-[11px]">{suggestion.messageSubject}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {(pendingSuggestions.length > 0 || approvedSuggestions.length > 0) && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-muted/20 gap-3">
                    <div className="text-xs text-muted-foreground">
                      {approvedSuggestions.length} ready
                    </div>
                    <div className="flex gap-1.5">
                      {selectedIds.size > 0 && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={rejectSelected}
                            disabled={updateSuggestionMutation.isPending}
                            data-testid="button-reject-selected"
                          >
                            Skip
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={approveSelected}
                            disabled={updateSuggestionMutation.isPending}
                            className="text-green-500"
                            data-testid="button-approve-selected"
                          >
                            Approve
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => executeMutation.mutate()}
                        disabled={approvedSuggestions.length === 0 || executeMutation.isPending}
                        size="sm"
                        className="gap-1.5"
                        data-testid="button-execute-approved"
                      >
                        {executeMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Clean Up
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
