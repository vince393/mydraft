import { useState, useRef, useCallback } from "react";
import { 
  Trash2, 
  Star, 
  Check, 
  MoreHorizontal,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  FolderInput,
  Flag,
  Ban,
  Mail
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SwipeableEmailItemProps {
  emailId: string | number;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isSelected: boolean;
  isChecked: boolean;
  isSelectionMode: boolean;
  avatarColor?: string;
  folder?: string;
  threadCount?: number;
  isTrashFolder?: boolean;
  isFlagged?: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPermanentDelete?: () => void;
  onRestore?: () => void;
  onToggleStar: () => void;
  onToggleFlag?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onMove?: () => void;
  onBlock?: () => void;
  onMarkUnread?: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onMouseEnterWhileDragging: () => void;
  formatTime: (date: Date) => string;
  getAvatarUrl: (email: string, name: string) => string;
}

export function SwipeableEmailItem({
  emailId,
  sender,
  senderEmail,
  subject,
  preview,
  receivedAt,
  isRead,
  isStarred,
  isSelected,
  isChecked,
  isSelectionMode,
  avatarColor,
  folder = "inbox",
  threadCount = 1,
  isTrashFolder = false,
  isFlagged = false,
  onSelect,
  onArchive,
  onDelete,
  onPermanentDelete,
  onRestore,
  onToggleStar,
  onToggleFlag,
  onReply,
  onReplyAll,
  onForward,
  onMove,
  onBlock,
  onMarkUnread,
  onLongPressStart,
  onLongPressEnd,
  onMouseEnterWhileDragging,
  formatTime,
  getAvatarUrl,
}: SwipeableEmailItemProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const initials = (sender || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    onLongPressStart();
    if (isSelectionMode || moreMenuOpen) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = isRevealed ? -110 : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart, moreMenuOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isSelectionMode || !isSwiping || moreMenuOpen) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - startX.current;
    const deltaY = touchY - startY.current;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      onLongPressEnd();
    }

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalSwipe.current) return;
    e.preventDefault();

    let newX = currentX.current + deltaX;
    if (newX > 0) newX = 0;
    if (newX < -280) newX = -280;
    setSwipeX(newX);
  }, [isSwiping, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleTouchEnd = useCallback(() => {
    onLongPressEnd();
    if (isSelectionMode || moreMenuOpen) return;
    setIsSwiping(false);
    
    const absSwipe = Math.abs(swipeX);
    
    // Full swipe triggers delete
    if (absSwipe >= 200) {
      setSwipeX(-280);
      setTimeout(() => {
        onDelete();
        setSwipeX(0);
        setIsRevealed(false);
      }, 180);
      return;
    }

    // Partial swipe reveals buttons
    if (absSwipe >= 50) {
      setSwipeX(-110);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  }, [swipeX, onDelete, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onLongPressStart();
    if (isSelectionMode || moreMenuOpen) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = isRevealed ? -110 : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart, moreMenuOpen]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode || !isSwiping || moreMenuOpen) return;
    
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      onLongPressEnd();
    }

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalSwipe.current) return;

    let newX = currentX.current + deltaX;
    if (newX > 0) newX = 0;
    if (newX < -280) newX = -280;
    setSwipeX(newX);
  }, [isSwiping, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleMouseUp = useCallback(() => {
    onLongPressEnd();
    if (isSelectionMode || moreMenuOpen) return;
    handleTouchEnd();
  }, [handleTouchEnd, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleMouseLeave = useCallback(() => {
    onLongPressEnd();
    if (isSwiping && !isSelectionMode && !moreMenuOpen) {
      handleTouchEnd();
    }
  }, [isSwiping, handleTouchEnd, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (moreMenuOpen) {
      setMoreMenuOpen(false);
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    if (Math.abs(swipeX) > 5 && !isRevealed) return;
    if (isRevealed) {
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    onSelect();
  }, [swipeX, isRevealed, onSelect, moreMenuOpen]);

  const closeReveal = useCallback(() => {
    setSwipeX(0);
    setIsRevealed(false);
    setMoreMenuOpen(false);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete();
    closeReveal();
  }, [onDelete, closeReveal]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleStar();
  }, [onToggleStar]);

  const handleMenuAction = useCallback((action?: () => void) => {
    if (action) action();
    closeReveal();
  }, [closeReveal]);

  const absSwipe = Math.abs(swipeX);
  const isFullSwipe = absSwipe >= 200;
  
  // Delete orb stretches on full swipe
  const deleteWidth = isFullSwipe 
    ? 52 + Math.min((absSwipe - 200) * 1.5, 120)
    : 52;

  return (
    <div className="relative overflow-hidden w-full" data-testid={`email-item-${emailId}`}>
      {/* Background action area */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-3 gap-2"
        style={{ width: Math.max(absSwipe + 16, 0) }}
      >
        {absSwipe > 20 && (
          <>
            {/* More button - hides on full swipe */}
            {!isFullSwipe && (
              <DropdownMenu open={moreMenuOpen} onOpenChange={(open) => {
                setMoreMenuOpen(open);
                if (!open) closeReveal();
              }}>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                      opacity: Math.min(absSwipe / 60, 1),
                      transform: `scale(${Math.min(absSwipe / 80, 1)})`,
                    }}
                    data-testid={`swipe-more-${emailId}`}
                  >
                    <MoreHorizontal className="w-5 h-5 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover/95 backdrop-blur-xl border-border/30 shadow-2xl">
                  <DropdownMenuItem onClick={() => handleMenuAction(onReply)} className="gap-3 py-2.5">
                    <Reply className="w-4 h-4 text-muted-foreground" />
                    <span>Reply</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onReplyAll)} className="gap-3 py-2.5">
                    <ReplyAll className="w-4 h-4 text-muted-foreground" />
                    <span>Reply All</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onForward)} className="gap-3 py-2.5">
                    <Forward className="w-4 h-4 text-muted-foreground" />
                    <span>Forward</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem onClick={() => handleMenuAction(onToggleStar)} className="gap-3 py-2.5">
                    <Star className={`w-4 h-4 ${isStarred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                    <span>{isStarred ? "Unstar" : "Star"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onToggleFlag)} className="gap-3 py-2.5">
                    <Flag className={`w-4 h-4 ${isFlagged ? "fill-orange-500 text-orange-500" : "text-muted-foreground"}`} />
                    <span>{isFlagged ? "Unflag" : "Flag"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onMarkUnread)} className="gap-3 py-2.5">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>Mark Unread</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem onClick={() => handleMenuAction(onMove)} className="gap-3 py-2.5">
                    <FolderInput className="w-4 h-4 text-muted-foreground" />
                    <span>Move</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onArchive)} className="gap-3 py-2.5">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <span>Archive</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem onClick={() => handleMenuAction(onBlock)} className="gap-3 py-2.5 text-red-400 focus:text-red-400">
                    <Ban className="w-4 h-4" />
                    <span>Block</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onDelete)} className="gap-3 py-2.5 text-red-400 focus:text-red-400">
                    <Trash2 className="w-4 h-4" />
                    <span>Trash</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Delete button - stretches into pill on full swipe */}
            <button
              onClick={handleDeleteClick}
              className="h-[52px] rounded-full flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                width: deleteWidth,
                background: isFullSwipe 
                  ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: isFullSwipe 
                  ? '0 6px 20px rgba(239, 68, 68, 0.5)'
                  : '0 4px 14px rgba(239, 68, 68, 0.4)',
                opacity: Math.min(absSwipe / 60, 1),
                transform: `scale(${Math.min(absSwipe / 80, 1)})`,
              }}
              data-testid={`swipe-delete-${emailId}`}
            >
              <Trash2 className="w-5 h-5 text-white flex-shrink-0" />
              {isFullSwipe && deleteWidth > 100 && (
                <span className="text-sm font-medium text-white whitespace-nowrap pr-1">
                  Delete
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Email content */}
      <div
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={onMouseEnterWhileDragging}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          relative py-3 px-4 cursor-pointer bg-background select-none
          ${!isSwiping ? "transition-transform duration-200 ease-out" : ""}
          ${isSelectionMode && isChecked ? "bg-muted/50" : isSelected ? "bg-muted/30" : "hover:bg-muted/20"}
        `}
        style={{ transform: `translateX(${swipeX}px)` }}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="w-10 h-10">
              <AvatarImage src={getAvatarUrl(senderEmail, sender)} alt={sender} />
              <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isRead && !isSelectionMode && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background" />
            )}
            {isSelectionMode && isChecked && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary ring-2 ring-background flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`min-w-0 text-[13px] truncate block ${!isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                {sender}
              </span>
              {threadCount > 1 && (
                <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded bg-muted/60 text-muted-foreground">
                  {threadCount}
                </span>
              )}
              <span className="flex-1" />
              <div className="flex-shrink-0 flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                  {formatTime(new Date(receivedAt))}
                </span>
                {isStarred && (
                  <button onClick={handleStarClick} className="p-1 rounded-md text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                )}
                {isFlagged && (
                  <span className="p-1 text-orange-500">
                    <Flag className="w-4 h-4 fill-current" />
                  </span>
                )}
              </div>
            </div>
            
            <h4 className={`text-[13px] mb-1 truncate pr-1 ${!isRead ? "font-medium text-foreground" : "text-foreground/70"}`}>
              {subject}
            </h4>
            
            <p className="text-[12px] text-muted-foreground/60 truncate pr-1 leading-relaxed">
              {preview.replace(/[\u200B-\u200D\uFEFF\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\u3164\uFFA0]/g, '').trim()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
