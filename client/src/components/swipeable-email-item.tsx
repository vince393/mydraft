import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Trash2, 
  Star, 
  Check, 
  RotateCcw, 
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

// Fixed pixel thresholds for consistent behavior
const REVEAL_THRESHOLD = 80;  // 80px to reveal buttons
const DELETE_THRESHOLD = 180; // 180px to trigger delete mode
const BUTTON_WIDTH = 132;     // Width for both buttons combined

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
  const isArchiveFolder = folder === "archive";
  const [swipeX, setSwipeX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    currentX.current = isRevealed ? -BUTTON_WIDTH : 0;
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
    
    // Clamp values
    if (newX > 0) newX = 0;
    if (newX < -300) newX = -300;

    setSwipeX(newX);
  }, [isSwiping, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleTouchEnd = useCallback(() => {
    onLongPressEnd();
    
    if (isSelectionMode || moreMenuOpen) return;
    setIsSwiping(false);
    
    const absSwipe = Math.abs(swipeX);
    
    // If swiped past delete threshold, trigger delete
    if (absSwipe >= DELETE_THRESHOLD) {
      setSwipeX(-300);
      setTimeout(() => {
        onDelete();
        setSwipeX(0);
        setIsRevealed(false);
      }, 150);
      return;
    }

    // If swiped enough, reveal the action buttons and KEEP them visible
    if (absSwipe >= REVEAL_THRESHOLD) {
      setSwipeX(-BUTTON_WIDTH);
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
    currentX.current = isRevealed ? -BUTTON_WIDTH : 0;
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
    if (newX < -300) newX = -300;

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
    // If menu is open, close everything
    if (moreMenuOpen) {
      setMoreMenuOpen(false);
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    
    // Ignore clicks during active swipe
    if (Math.abs(swipeX) > 5 && !isRevealed) {
      return;
    }
    
    // If revealed, close it
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

  const handleRestoreClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRestore) onRestore();
    closeReveal();
  }, [onRestore, closeReveal]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleStar();
  }, [onToggleStar]);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onArchive();
    closeReveal();
  }, [onArchive, closeReveal]);

  // Safe menu action handler
  const handleMenuAction = useCallback((action?: () => void) => {
    if (action) action();
    closeReveal();
  }, [closeReveal]);

  // Calculate button visibility
  const showButtons = isRevealed || Math.abs(swipeX) > 40;
  const isDeleteMode = Math.abs(swipeX) >= DELETE_THRESHOLD;

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden w-full"
      data-testid={`email-item-${emailId}`}
    >
      {/* Action buttons - positioned behind the email content */}
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: BUTTON_WIDTH }}
      >
        {/* Delete mode background */}
        {isDeleteMode && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              <span className="text-xs font-medium">Release to delete</span>
            </div>
          </div>
        )}
        
        {/* Buttons container */}
        {showButtons && !isDeleteMode && (
          <div 
            className="flex items-stretch h-full w-full"
            style={{ 
              opacity: Math.min(Math.abs(swipeX) / REVEAL_THRESHOLD, 1),
            }}
          >
            {/* More button */}
            <DropdownMenu open={moreMenuOpen} onOpenChange={(open) => {
              setMoreMenuOpen(open);
              if (!open) closeReveal();
            }}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  className="flex items-center justify-center w-[66px] h-full bg-muted/80 hover:bg-muted transition-colors border-r border-border/10"
                  data-testid={`swipe-more-${emailId}`}
                >
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover/95 backdrop-blur-xl border-border/50">
                <DropdownMenuItem onClick={() => handleMenuAction(onReply)} className="text-xs">
                  <Reply className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onReplyAll)} className="text-xs">
                  <ReplyAll className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Reply All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onForward)} className="text-xs">
                  <Forward className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Forward
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem onClick={() => handleMenuAction(onToggleStar)} className="text-xs">
                  <Star className={`w-3.5 h-3.5 mr-2 ${isStarred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                  {isStarred ? "Unstar" : "Star"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onToggleFlag)} className="text-xs">
                  <Flag className={`w-3.5 h-3.5 mr-2 ${isFlagged ? "fill-orange-500 text-orange-500" : "text-muted-foreground"}`} />
                  {isFlagged ? "Unflag" : "Flag"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onMarkUnread)} className="text-xs">
                  <Mail className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Mark Unread
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem onClick={() => handleMenuAction(onMove)} className="text-xs">
                  <FolderInput className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onArchive)} className="text-xs">
                  <Archive className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem onClick={() => handleMenuAction(onBlock)} className="text-xs text-red-400 focus:text-red-400">
                  <Ban className="w-3.5 h-3.5 mr-2" />
                  Block
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onDelete)} className="text-xs text-red-400 focus:text-red-400">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete button */}
            {isTrashFolder ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onPermanentDelete) onPermanentDelete();
                  closeReveal();
                }}
                className="flex items-center justify-center w-[66px] h-full bg-red-500/90 hover:bg-red-500 transition-colors"
                data-testid={`swipe-delete-${emailId}`}
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            ) : (
              <button
                onClick={handleDeleteClick}
                className="flex items-center justify-center w-[66px] h-full bg-red-500/90 hover:bg-red-500 transition-colors"
                data-testid={`swipe-delete-${emailId}`}
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Email content - slides left to reveal buttons */}
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
          relative py-3 px-4 cursor-pointer bg-background
          transition-transform select-none
          ${!isSwiping ? "duration-200 ease-out" : "duration-0"}
          ${isSelectionMode && isChecked
            ? "bg-muted/50"
            : isSelected 
              ? "bg-muted/30" 
              : "hover:bg-muted/20"
          }
        `}
        style={{ transform: `translateX(${swipeX}px)` }}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={getAvatarUrl(senderEmail, sender)} 
                alt={sender}
              />
              <AvatarFallback 
                style={{ backgroundColor: avatarColor }}
                className="text-white text-xs font-medium"
              >
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
                <span 
                  className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded bg-muted/60 text-muted-foreground"
                  data-testid={`thread-count-badge-${threadCount}`}
                >
                  {threadCount}
                </span>
              )}
              <span className="flex-1" />
              <div className="flex-shrink-0 flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap group-hover:hidden">
                  {formatTime(new Date(receivedAt))}
                </span>
                {isStarred && (
                  <button
                    onClick={handleStarClick}
                    className="p-1 rounded-md text-yellow-500"
                    data-testid={`starred-icon-${emailId}`}
                  >
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
