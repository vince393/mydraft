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

// Thresholds
const REVEAL_THRESHOLD = 50;
const FULL_SWIPE_THRESHOLD = 140;

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
    currentX.current = isRevealed ? -100 : 0;
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
    if (newX < -220) newX = -220;
    setSwipeX(newX);
  }, [isSwiping, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleTouchEnd = useCallback(() => {
    onLongPressEnd();
    if (isSelectionMode || moreMenuOpen) return;
    setIsSwiping(false);
    
    const absSwipe = Math.abs(swipeX);
    
    // Full swipe - trigger delete
    if (absSwipe >= FULL_SWIPE_THRESHOLD) {
      setSwipeX(-220);
      setTimeout(() => {
        onDelete();
        setSwipeX(0);
        setIsRevealed(false);
      }, 200);
      return;
    }

    // Half swipe - reveal buttons and keep them visible
    if (absSwipe >= REVEAL_THRESHOLD) {
      setSwipeX(-100);
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
    currentX.current = isRevealed ? -100 : 0;
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
    if (newX < -220) newX = -220;
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

  // Calculate animations
  const absSwipe = Math.abs(swipeX);
  const isFullSwipe = absSwipe >= FULL_SWIPE_THRESHOLD;
  const revealProgress = Math.min(absSwipe / REVEAL_THRESHOLD, 1);
  const fullSwipeProgress = Math.max(0, (absSwipe - REVEAL_THRESHOLD) / (FULL_SWIPE_THRESHOLD - REVEAL_THRESHOLD));
  
  // Circle sizes - grow from 32 to 44
  const circleSize = 32 + (revealProgress * 12);
  const iconSize = 16 + (revealProgress * 2);
  
  // More button fades out during full swipe
  const moreOpacity = isFullSwipe ? Math.max(0, 1 - fullSwipeProgress * 2) : Math.min(revealProgress * 1.5, 1);
  
  // Delete button stretches into orb during full swipe
  const deleteWidth = isFullSwipe 
    ? circleSize + (fullSwipeProgress * 80) // Stretch to orb
    : circleSize;

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden w-full"
      data-testid={`email-item-${emailId}`}
    >
      {/* Action area behind email */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 pr-3"
        style={{ width: Math.max(absSwipe + 20, 0) }}
      >
        {absSwipe > 15 && (
          <>
            {/* More button - fades out on full swipe */}
            {moreOpacity > 0.05 && (
              <DropdownMenu open={moreMenuOpen} onOpenChange={(open) => {
                setMoreMenuOpen(open);
                if (!open) closeReveal();
              }}>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    className="flex items-center justify-center rounded-full transition-all duration-150 backdrop-blur-sm"
                    style={{ 
                      width: circleSize,
                      height: circleSize,
                      opacity: moreOpacity,
                      transform: `scale(${0.6 + revealProgress * 0.4})`,
                      background: 'rgba(120, 120, 128, 0.36)',
                    }}
                    data-testid={`swipe-more-${emailId}`}
                  >
                    <MoreHorizontal 
                      className="text-white/90" 
                      style={{ width: iconSize, height: iconSize }}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-popover/95 backdrop-blur-xl border-border/30 shadow-xl">
                  <DropdownMenuItem onClick={() => handleMenuAction(onReply)} className="text-xs gap-2.5 py-2">
                    <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onReplyAll)} className="text-xs gap-2.5 py-2">
                    <ReplyAll className="w-3.5 h-3.5 text-muted-foreground" />
                    Reply All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onForward)} className="text-xs gap-2.5 py-2">
                    <Forward className="w-3.5 h-3.5 text-muted-foreground" />
                    Forward
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem onClick={() => handleMenuAction(onToggleStar)} className="text-xs gap-2.5 py-2">
                    <Star className={`w-3.5 h-3.5 ${isStarred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                    {isStarred ? "Unstar" : "Star"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onToggleFlag)} className="text-xs gap-2.5 py-2">
                    <Flag className={`w-3.5 h-3.5 ${isFlagged ? "fill-orange-500 text-orange-500" : "text-muted-foreground"}`} />
                    {isFlagged ? "Unflag" : "Flag"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onMarkUnread)} className="text-xs gap-2.5 py-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Mark Unread
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem onClick={() => handleMenuAction(onMove)} className="text-xs gap-2.5 py-2">
                    <FolderInput className="w-3.5 h-3.5 text-muted-foreground" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onArchive)} className="text-xs gap-2.5 py-2">
                    <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem onClick={() => handleMenuAction(onBlock)} className="text-xs gap-2.5 py-2 text-red-400 focus:text-red-400">
                    <Ban className="w-3.5 h-3.5" />
                    Block
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMenuAction(onDelete)} className="text-xs gap-2.5 py-2 text-red-400 focus:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                    Trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Delete button - stretches into orb on full swipe */}
            <button
              onClick={handleDeleteClick}
              className="flex items-center justify-center transition-all duration-150"
              style={{ 
                width: deleteWidth,
                height: circleSize,
                borderRadius: circleSize / 2,
                opacity: Math.min(revealProgress * 1.5, 1),
                transform: `scale(${0.6 + revealProgress * 0.4})`,
                background: isFullSwipe 
                  ? 'linear-gradient(90deg, rgba(239,68,68,0.9) 0%, rgba(220,38,38,1) 100%)'
                  : 'rgba(239, 68, 68, 0.9)',
                boxShadow: isFullSwipe ? '0 4px 20px rgba(239,68,68,0.4)' : 'none',
              }}
              data-testid={`swipe-delete-${emailId}`}
            >
              <Trash2 
                className="text-white" 
                style={{ width: iconSize, height: iconSize }}
              />
              {isFullSwipe && fullSwipeProgress > 0.5 && (
                <span className="ml-1 text-[11px] font-medium text-white/90 whitespace-nowrap">
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
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
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
