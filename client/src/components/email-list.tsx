import { useState, useRef, useCallback } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Star, Sparkles, Loader2, Archive, Trash2, Clock, Search, SlidersHorizontal, X, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-xl animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-muted/50" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-28 bg-muted/50 rounded-full" />
                <div className="h-3 w-14 bg-muted/50 rounded-full" />
              </div>
              <div className="h-4 w-48 bg-muted/50 rounded-full" />
              <div className="h-3 w-full bg-muted/50 rounded-full" />
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
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/80 to-muted/30 flex items-center justify-center mb-6">
        <svg className="w-9 h-9 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-medium text-xl mb-2 tracking-tight">No emails yet</h3>
      <p className="text-sm text-muted-foreground">Your inbox is empty</p>
    </div>
  );
}

export function EmailList({ emails, selectedEmailId, onSelectEmail, onAiReply, onTrashEmail, onArchiveEmail, onTrashMultipleEmails, onArchiveMultipleEmails, onToggleStar, isAiLoading, isMoving, isLoading }: EmailListProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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

  if (isLoading) {
    return <EmailListSkeleton />;
  }

  if (emails.length === 0) {
    return <EmailListEmpty />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/30">
        <div className="relative flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input 
              type="search"
              placeholder="Search emails..." 
              className="pl-10 bg-muted/30 border-0 h-10 rounded-xl focus:bg-muted/50 transition-colors"
              data-testid="input-search"
            />
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
            data-testid="button-filter"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/40 backdrop-blur-sm rounded-md border border-blue-800/30">
          <Clock className="w-3.5 h-3.5 text-blue-400/80" />
          <span className="text-sm text-blue-100/80">Est. response time: 6 min</span>
        </div>
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="space-y-0.5 p-3">
        {emails.map((email) => {
          const isSelected = email.id === selectedEmailId;
          const isChecked = selectedIds.has(email.id);
          const initials = email.sender
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

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
                group relative p-4 rounded-xl cursor-pointer
                transition-all duration-200 ease-out select-none
                ${isSelectionMode && isChecked
                  ? "bg-primary/20 ring-1 ring-primary/50"
                  : isSelected 
                    ? "bg-primary/10 ring-1 ring-primary/30" 
                    : "hover:bg-muted/50"
                }
              `}
              data-testid={`email-item-${email.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-11 h-11 ring-2 ring-border/30">
                    <AvatarFallback 
                      style={{ backgroundColor: email.avatarColor }}
                      className="text-white text-sm font-medium"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!email.isRead && !isSelectionMode && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                  )}
                  {isSelectionMode && isChecked && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary ring-2 ring-background flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm truncate ${!email.isRead ? "font-semibold" : "font-medium text-foreground/90"}`}>
                      {email.sender}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNowStrict(new Date(email.receivedAt))}
                    </span>
                  </div>
                  
                  <h4 className={`text-sm truncate mb-1.5 ${!email.isRead ? "font-medium" : "text-foreground/80"}`}>
                    {email.subject}
                  </h4>
                  
                  <p className="text-xs text-muted-foreground/80 line-clamp-1">
                    {email.preview}
                  </p>
                </div>

                <button 
                  className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${email.isStarred 
                      ? "opacity-100 text-yellow-400" 
                      : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400"
                    }
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(email.id);
                  }}
                  data-testid={`star-email-${email.id}`}
                >
                  <Star className={`w-4 h-4 ${email.isStarred ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/30 bg-background/95 backdrop-blur-xl">
        {isSelectionMode ? (
          <div className="flex items-center gap-2">
            <Button 
              size="icon"
              variant="ghost"
              onClick={handleCancelSelection}
              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
              data-testid="button-cancel-selection"
            >
              <X className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size}
            </span>
            <span className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSelectAll}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-select-all"
            >
              {allSelected ? "Deselect" : "All"}
            </Button>
            <div className="flex items-center">
              <Button 
                size="icon"
                variant="ghost"
                onClick={handleArchiveSelected}
                disabled={selectedIds.size === 0 || isMoving}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
                data-testid="button-archive-selected"
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                onClick={handleTrashSelected}
                disabled={selectedIds.size === 0 || isMoving}
                className="h-10 w-10 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10"
                data-testid="button-delete-selected"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              size="icon"
              variant="ghost"
              disabled={selectedIds.size === 0}
              className="h-10 w-10 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              data-testid="button-ai-selected"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Button 
                size="icon"
                variant="ghost"
                disabled={!selectedEmailId || isMoving}
                onClick={onArchiveEmail}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
                data-testid="button-archive"
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                disabled={!selectedEmailId || isMoving}
                onClick={onTrashEmail}
                className="h-10 w-10 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10"
                data-testid="button-trash"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              onClick={onAiReply}
              disabled={!selectedEmailId || isAiLoading}
              className="flex-1 gap-2 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 transition-all"
              data-testid="button-ai-reply"
            >
              {isAiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Draft with AI
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
