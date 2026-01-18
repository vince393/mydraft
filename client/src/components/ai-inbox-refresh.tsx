import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wand2, Loader2, Check, X, Archive, Trash2, Star, Mail, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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
  actionData: { reason?: string } | null;
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
};

const actionLabels: Record<string, string> = {
  spam: "Mark as Spam",
  archive: "Archive",
  delete: "Delete",
  star: "Star",
  mark_read: "Mark as Read",
};

const actionColors: Record<string, string> = {
  spam: "bg-red-500/10 text-red-500 border-red-500/20",
  archive: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  delete: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  star: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  mark_read: "bg-green-500/10 text-green-500 border-green-500/20",
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
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
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
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        data-testid="button-ai-inbox-refresh"
      >
        <Wand2 className="w-4 h-4" />
        <span className="hidden sm:inline">AI Refresh</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Inbox Refresh
            </DialogTitle>
            <DialogDescription>
              AI analyzes your emails and suggests actions. Review and approve before changes are made.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {suggestions.length === 0 && !refreshMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Wand2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-medium text-lg mb-2">Analyze your inbox</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  AI will scan your emails and suggest actions like archiving, starring, or marking spam.
                </p>
                <Button
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  className="gap-2"
                  data-testid="button-start-ai-analysis"
                >
                  {refreshMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Start Analysis
                </Button>
              </div>
            ) : refreshMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing your inbox...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.size === pendingSuggestions.length && pendingSuggestions.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all-suggestions"
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size} of {pendingSuggestions.length} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
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
                        data-testid="button-dismiss-all-suggestions"
                      >
                        Dismiss All
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-2 py-3">
                    {pendingSuggestions.map((suggestion) => {
                      const Icon = actionIcons[suggestion.actionType] || Mail;
                      const isExpanded = expandedId === suggestion.id;
                      const isSelected = selectedIds.has(suggestion.id);

                      return (
                        <div
                          key={suggestion.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            isSelected ? "bg-primary/5 border-primary/30" : "hover-elevate"
                          }`}
                          data-testid={`suggestion-item-${suggestion.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(suggestion.id)}
                              className="mt-0.5"
                              data-testid={`checkbox-suggestion-${suggestion.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={`${actionColors[suggestion.actionType]} gap-1 text-xs`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {actionLabels[suggestion.actionType]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {suggestion.confidence}% confident
                                </span>
                              </div>
                              <p className="font-medium text-sm truncate">
                                {suggestion.messageSubject || "(No subject)"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                From: {suggestion.messageSender || "Unknown"}
                              </p>
                              {isExpanded && suggestion.actionData?.reason && (
                                <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                  {suggestion.actionData.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                                data-testid={`button-expand-suggestion-${suggestion.id}`}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={() => updateSuggestionMutation.mutate({ id: suggestion.id, status: "approved" })}
                                data-testid={`button-approve-suggestion-${suggestion.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => updateSuggestionMutation.mutate({ id: suggestion.id, status: "rejected" })}
                                data-testid={`button-reject-suggestion-${suggestion.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {pendingSuggestions.length === 0 && approvedSuggestions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                        <p>All suggestions have been reviewed!</p>
                      </div>
                    )}

                    {approvedSuggestions.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          Approved Actions ({approvedSuggestions.length})
                        </h4>
                        <div className="space-y-1">
                          {approvedSuggestions.map((suggestion) => {
                            const Icon = actionIcons[suggestion.actionType] || Mail;
                            return (
                              <div
                                key={suggestion.id}
                                className="flex items-center gap-2 p-2 rounded bg-green-500/5 text-sm"
                              >
                                <Icon className="w-3 h-3 text-green-500" />
                                <span className="truncate flex-1">{suggestion.messageSubject}</span>
                                <Badge variant="outline" className="text-xs">
                                  {actionLabels[suggestion.actionType]}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {(pendingSuggestions.length > 0 || approvedSuggestions.length > 0) && (
                  <div className="flex items-center justify-between pt-4 border-t gap-3">
                    <div className="text-sm text-muted-foreground">
                      {approvedSuggestions.length} action{approvedSuggestions.length !== 1 ? "s" : ""} ready to execute
                    </div>
                    <div className="flex gap-2">
                      {selectedIds.size > 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={rejectSelected}
                            disabled={updateSuggestionMutation.isPending}
                            data-testid="button-reject-selected"
                          >
                            Reject Selected
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={approveSelected}
                            disabled={updateSuggestionMutation.isPending}
                            className="text-green-600 border-green-600/30 hover:bg-green-600/10"
                            data-testid="button-approve-selected"
                          >
                            Approve Selected
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => executeMutation.mutate()}
                        disabled={approvedSuggestions.length === 0 || executeMutation.isPending}
                        className="gap-2"
                        data-testid="button-execute-approved"
                      >
                        {executeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Execute {approvedSuggestions.length} Action{approvedSuggestions.length !== 1 ? "s" : ""}
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
