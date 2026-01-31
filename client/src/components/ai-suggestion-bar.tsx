import { useState, useEffect } from "react";
import { Sparkles, X, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Email } from "@shared/schema";

interface ExtendedEmail extends Email {
  nylasId?: string;
}

interface AiSuggestionBarProps {
  email: ExtendedEmail | null;
  onExpand: () => void;
  onDismiss: () => void;
  hasPro: boolean;
  onUpgradeNeeded: () => void;
}

export function AiSuggestionBar({ 
  email, 
  onExpand, 
  onDismiss,
  hasPro,
  onUpgradeNeeded
}: AiSuggestionBarProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastEmailId, setLastEmailId] = useState<string | number | null>(null);

  const generateSuggestion = useMutation({
    mutationFn: async (emailData: Email) => {
      const response = await apiRequest("POST", "/api/ai/quick-suggestion", {
        subject: emailData.subject,
        sender: emailData.sender,
        preview: emailData.preview || emailData.body?.substring(0, 200),
      });
      if (!response.ok) throw new Error("Failed to generate suggestion");
      return response.json();
    },
    onSuccess: (data) => {
      setSuggestion(data.suggestion);
    },
    onError: () => {
      setSuggestion(null);
    },
  });

  useEffect(() => {
    const emailId = email?.nylasId || email?.id;
    if (email && emailId !== lastEmailId && hasPro) {
      setLastEmailId(emailId ?? null);
      setIsDismissed(false);
      setSuggestion(null);
      generateSuggestion.mutate(email);
    } else if (!email) {
      setLastEmailId(null);
      setSuggestion(null);
      setIsDismissed(false);
    }
  }, [email, hasPro]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  const handleClick = () => {
    if (!hasPro) {
      onUpgradeNeeded();
    } else {
      onExpand();
    }
  };

  if (!email || isDismissed) return null;

  const isLoading = generateSuggestion.isPending;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background via-background/95 to-transparent">
      <div 
        className="bg-card border border-border/50 rounded-xl p-3 shadow-lg backdrop-blur-sm cursor-pointer hover:border-primary/30 transition-all group"
        onClick={handleClick}
        data-testid="ai-suggestion-bar"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">AI Suggestion</span>
              {!hasPro && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 font-medium">
                  Pro
                </span>
              )}
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Analyzing email...
              </p>
            ) : suggestion ? (
              <p className="text-sm text-foreground line-clamp-2">
                {suggestion}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click to draft a response with AI
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              data-testid="button-dismiss-suggestion"
            >
              <X className="w-4 h-4" />
            </Button>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
