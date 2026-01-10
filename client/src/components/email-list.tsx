import { useState, useRef, useCallback } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Star, Sparkles, Loader2, Archive, Trash2, Clock, X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Email } from "@shared/schema";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: number | null;
  onSelectEmail: (email: Email) => void;
  onAiReply: () => void;
  onTrashEmail: () => void;
  onArchiveEmail: () => void;
  onTrashMultipleEmails: (emailIds: number[]) => void;
  onArchiveMultipleEmails: (emailIds: number[]) => void;
  onToggleStar: (emailId: number) => void;
  isAiLoading?: boolean;
  isMoving?: boolean;
  isLoading?: boolean;
  activeFolder?: string;
}

interface ResponseTimeEstimate {
  estimatedMinutes: number;
  unreadCount: number;
  totalWords: number;
  message?: string;
}

function EmailListSkeleton() {
  return (
    <div className="divide-y divide-border/20">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="px-4 py-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-muted/30" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-24 bg-muted/30 rounded" />
                <div className="flex-1" />
                <div className="h-3 w-12 bg-muted/30 rounded" />
              </div>
              <div className="h-3.5 w-48 bg-muted/30 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-medium text-base mb-1">No emails</h3>
      <p className="text-xs text-muted-foreground">This folder is empty</p>
    </div>
  );
}

export function EmailList({ emails, selectedEmailId, onSelectEmail, onAiReply, onTrashEmail, onArchiveEmail, onTrashMultipleEmails, onArchiveMultipleEmails, onToggleStar, isAiLoading, isMoving, isLoading, activeFolder = "inbox" }: EmailListProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const { data: responseTime, isLoading: isLoadingTime } = useQuery<ResponseTimeEstimate>({
    queryKey: ['/api/response-time', activeFolder],
    queryFn: async () => {
      const response = await fetch(`/api/response-time?folder=${activeFolder}`);
      if (!response.ok) throw new Error("Failed to fetch response time");
      return response.json();
    },
    staleTime: Infinity,
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);
  const dragStarted = useRef(false);

  const handleLongPressStart = useCallback((emailId: number) => {
    longPressTriggered.current = false;
    dragStarted.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      dragStarted.current = true;
      setIsSelectionMode(true);
      setIsDragging(true);
      setSelectedIds(new Set([emailId]));
    }, 1000);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsDragging(false);
    dragStarted.current = false;
  }, []);

  const handleMouseEnterWhileDragging = useCallback((emailId: number) => {
    if (isDragging && isSelectionMode) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.add(emailId);
        return newSet;
      });
    }
  }, [isDragging, isSelectionMode]);

  const handleEmailClick = useCallback((email: Email) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    
    if (isSelectionMode) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(email.id)) {
          newSet.delete(email.id);
        } else {
          newSet.add(email.id);
        }
        if (newSet.size === 0) {
          setIsSelectionMode(false);
        }
        return newSet;
      });
    } else {
      onSelectEmail(email);
    }
  }, [isSelectionMode, onSelectEmail]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(emails.map(e => e.id)));
    }
  }, [selectedIds.size, emails]);

  const handleTrashSelected = useCallback(() => {
    if (selectedIds.size > 0) {
      onTrashMultipleEmails(Array.from(selectedIds));
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [selectedIds, onTrashMultipleEmails]);

  const handleArchiveSelected = useCallback(() => {
    if (selectedIds.size > 0) {
      onArchiveMultipleEmails(Array.from(selectedIds));
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [selectedIds, onArchiveMultipleEmails]);

  const allSelected = emails.length > 0 && selectedIds.size === emails.length;
  const unreadCount = emails.filter(e => !e.isRead).length;

  if (isLoading) {
    return <EmailListSkeleton />;
  }

  if (emails.length === 0) {
    return <EmailListEmpty />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {activeFolder === "inbox" && responseTime && !responseTime.message && responseTime.estimatedMinutes > 0 && (
        <div className="px-4 py-2 border-b border-border/20 bg-blue-950/30">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-blue-300">
              {isLoadingTime ? "..." : `~${responseTime.estimatedMinutes} min to clear ${unreadCount} unread`}
            </span>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/20">
          {emails.map((email) => {
            const isSelected = email.id === selectedEmailId;
            const isChecked = selectedIds.has(email.id);

            return (
              <div
                key={email.id}
                onClick={() => handleEmailClick(email)}
                onMouseDown={() => handleLongPressStart(email.id)}
                onMouseUp={handleLongPressEnd}
                onMouseEnter={() => handleMouseEnterWhileDragging(email.id)}
                onTouchStart={() => handleLongPressStart(email.id)}
                onTouchEnd={handleLongPressEnd}
                className={`
                  group relative px-4 py-2.5 cursor-pointer
                  transition-colors duration-100 select-none
                  ${isSelectionMode && isChecked
                    ? "bg-primary/15"
                    : isSelected 
                      ? "bg-muted/60" 
                      : "hover:bg-muted/30"
                  }
                `}
                data-testid={`email-item-${email.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 pt-0.5">
                    {isSelectionMode ? (
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                        {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    ) : (
                      <div className={`w-2 h-2 rounded-full transition-opacity ${!email.isRead ? "bg-primary" : "opacity-0"}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm truncate ${!email.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                        {email.sender}
                      </span>
                      {email.isStarred && (
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                      <span className="flex-1" />
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDistanceToNowStrict(new Date(email.receivedAt), { addSuffix: false })}
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className={`text-sm truncate ${!email.isRead ? "text-foreground/90" : "text-muted-foreground"}`}>
                        {email.subject}
                      </span>
                      <span className="text-xs text-muted-foreground/60 truncate hidden sm:inline">
                        — {email.preview}
                      </span>
                    </div>
                  </div>

                  <button 
                    className={`
                      p-1 rounded transition-all duration-150 flex-shrink-0 mt-0.5
                      ${email.isStarred 
                        ? "opacity-0" 
                        : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-500"
                      }
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(email.id);
                    }}
                    data-testid={`star-email-${email.id}`}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border/30 bg-background">
        {isSelectionMode ? (
          <div className="flex items-center gap-1">
            <Button 
              size="icon"
              variant="ghost"
              onClick={handleCancelSelection}
              className="h-8 w-8"
              data-testid="button-cancel-selection"
            >
              <X className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {selectedIds.size} selected
            </span>
            <span className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSelectAll}
              className="h-7 px-2 text-xs"
              data-testid="button-select-all"
            >
              {allSelected ? "None" : "All"}
            </Button>
            <Button 
              size="icon"
              variant="ghost"
              onClick={handleArchiveSelected}
              disabled={selectedIds.size === 0 || isMoving}
              className="h-8 w-8"
              data-testid="button-archive-selected"
            >
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            </Button>
            <Button 
              size="icon"
              variant="ghost"
              onClick={handleTrashSelected}
              disabled={selectedIds.size === 0 || isMoving}
              className="h-8 w-8 text-destructive hover:text-destructive"
              data-testid="button-delete-selected"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button 
              size="icon"
              variant="ghost"
              disabled={!selectedEmailId || isMoving}
              onClick={onArchiveEmail}
              className="h-8 w-8"
              data-testid="button-archive"
            >
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            </Button>
            <Button 
              size="icon"
              variant="ghost"
              disabled={!selectedEmailId || isMoving}
              onClick={onTrashEmail}
              className="h-8 w-8 text-destructive hover:text-destructive"
              data-testid="button-trash"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <Button 
              onClick={onAiReply}
              disabled={!selectedEmailId || isAiLoading}
              size="sm"
              className="gap-1.5 h-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
              data-testid="button-ai-reply"
            >
              {isAiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              AI Reply
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
