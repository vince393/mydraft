import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Lightbulb, Bug, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserFeedback } from "@shared/schema";

const FEEDBACK_TYPES = [
  { id: "feature_request", label: "Feature Request", icon: Lightbulb },
  { id: "bug_report", label: "Bug Report", icon: Bug },
  { id: "general", label: "General Feedback", icon: MessageSquare },
] as const;

type FeedbackType = typeof FEEDBACK_TYPES[number]["id"];

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
}

export function FeedbackModal({ open, onOpenChange, userEmail }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const { data: pastFeedback = [], isLoading: isLoadingHistory } = useQuery<UserFeedback[]>({
    queryKey: ["/api/feedback"],
    enabled: open,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { feedbackType: string; message: string }) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      setSubmitted(true);
      setMessage("");
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) return;
    submitMutation.mutate({ feedbackType, message: message.trim() });
  };

  const getTypeIcon = (type: string) => {
    const t = FEEDBACK_TYPES.find((f) => f.id === type);
    if (!t) return MessageSquare;
    return t.icon;
  };

  const getTypeLabel = (type: string) => {
    const t = FEEDBACK_TYPES.find((f) => f.id === type);
    return t?.label || "Feedback";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return <Badge variant="secondary" className="text-xs">Reviewed</Badge>;
      case "resolved":
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0" data-testid="modal-feedback">
        <DialogHeader className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
          <DialogTitle className="text-lg">Feedback</DialogTitle>
          <DialogDescription>
            Share your thoughts, report issues, or request features.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="submit" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="submit" className="flex-1" data-testid="tab-submit-feedback">
                Submit
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1" data-testid="tab-feedback-history">
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="submit" className="flex-1 p-6 pt-4 space-y-4 mt-0">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Thank you!</h3>
                <p className="text-sm text-muted-foreground">
                  Your feedback has been submitted successfully.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="feedback-type">Type</Label>
                  <Select value={feedbackType} onValueChange={(v: FeedbackType) => setFeedbackType(v)}>
                    <SelectTrigger id="feedback-type" data-testid="select-feedback-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id} data-testid={`feedback-type-${type.id}`}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback-message">Message</Label>
                  <Textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      feedbackType === "feature_request"
                        ? "Describe the feature you'd like to see..."
                        : feedbackType === "bug_report"
                        ? "Describe the issue you encountered..."
                        : "Share your thoughts..."
                    }
                    className="min-h-[150px] resize-none"
                    maxLength={5000}
                    data-testid="textarea-feedback-message"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {message.length} / 5000
                  </p>
                </div>

                {userEmail && (
                  <p className="text-xs text-muted-foreground">
                    Submitting as {userEmail}
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitMutation.isPending}
                  data-testid="button-submit-feedback"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-[350px]">
              <div className="p-6 pt-4 space-y-3">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : pastFeedback.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No feedback submitted yet.
                    </p>
                  </div>
                ) : (
                  pastFeedback.map((item) => {
                    const TypeIcon = getTypeIcon(item.feedbackType);
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03]"
                        data-testid={`feedback-item-${item.id}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {getTypeLabel(item.feedbackType)}
                            </span>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                          {item.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
