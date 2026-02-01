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

// Percentage-based thresholds
const REVEAL_PERCENT = 22;   // 22% of container width to reveal buttons
const DELETE_PERCENT = 45;   // 45% of container width to trigger delete mode
const MAX_SWIPE_PERCENT = 99; // 99% max swipe distance

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
  const [containerWidth, setContainerWidth] = useState(300);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate thresholds based on container width
  const revealThreshold = (containerWidth * REVEAL_PERCENT) / 100;
  const deleteThreshold = (containerWidth * DELETE_PERCENT) / 100;
  const maxSwipe = (containerWidth * MAX_SWIPE_PERCENT) / 100;

  // Measure container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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
    currentX.current = isRevealed ? -revealThreshold : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart, moreMenuOpen, revealThreshold]);

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
    
    if (newX > 0) {
      newX = 0;
    }
    
    if (newX < -maxSwipe) {
      newX = -maxSwipe;
    }

    setSwipeX(newX);
  }, [isSwiping, isSelectionMode, onLongPressEnd, moreMenuOpen, maxSwipe]);

  const handleTouchEnd = useCallback(() => {
    onLongPressEnd();
    
    if (isSelectionMode || moreMenuOpen) return;
    setIsSwiping(false);
    
    // If swiped past delete threshold, trigger delete
    if (swipeX <= -deleteThreshold) {
      setSwipeX(-maxSwipe);
      setTimeout(() => {
        onDelete();
        setSwipeX(0);
        setIsRevealed(false);
      }, 150);
      return;
    }

    // If swiped enough, reveal the action buttons
    if (swipeX <= -revealThreshold / 2) {
      setSwipeX(-revealThreshold);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  }, [swipeX, onDelete, isSelectionMode, onLongPressEnd, moreMenuOpen, deleteThreshold, maxSwipe, revealThreshold]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onLongPressStart();
    
    if (isSelectionMode || moreMenuOpen) {
      return;
    }
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = isRevealed ? -revealThreshold : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart, moreMenuOpen, revealThreshold]);

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
    if (newX < -maxSwipe) newX = -maxSwipe;

    setSwipeX(newX);
  }, [isSwiping, isSelectionMode, onLongPressEnd, moreMenuOpen, maxSwipe]);

  const handleMouseUp = useCallback(() => {
    onLongPressEnd();
    
    if (isSelectionMode || moreMenuOpen) {
      return;
    }
    handleTouchEnd();
  }, [handleTouchEnd, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleMouseLeave = useCallback(() => {
    onLongPressEnd();
    
    if (isSwiping && !isSelectionMode && !moreMenuOpen) {
      handleTouchEnd();
    }
  }, [isSwiping, handleTouchEnd, isSelectionMode, onLongPressEnd, moreMenuOpen]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // If menu is open, close it and the reveal
    if (moreMenuOpen) {
      setMoreMenuOpen(false);
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    
    if (Math.abs(swipeX) > 5 && !isRevealed) {
      return;
    }
    
    if (isRevealed) {
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    
    onSelect();
  }, [swipeX, isRevealed, onSelect, moreMenuOpen]);

  const handleRestoreClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRestore) onRestore();
    setSwipeX(0);
    setIsRevealed(false);
  }, [onRestore]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete();
    setSwipeX(0);
    setIsRevealed(false);
  }, [onDelete]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleStar();
  }, [onToggleStar]);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onArchive();
    setSwipeX(0);
    setIsRevealed(false);
  }, [onArchive]);

  const closeReveal = useCallback(() => {
    setSwipeX(0);
    setIsRevealed(false);
  }, []);

  const handleMenuAction = useCallback((action: () => void | undefined) => {
    if (action) {
      action();
    }
    closeReveal();
  }, [closeReveal]);

  const progress = Math.min(Math.abs(swipeX) / deleteThreshold, 1);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-xl w-full"
      data-testid={`email-item-${emailId}`}
    >
      {/* Swipe action buttons background */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end overflow-hidden"
        style={{ 
          width: Math.abs(swipeX),
          background: swipeX <= -deleteThreshold 
            ? 'linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.4) 100%)' 
            : 'transparent'
        }}
      >
        {/* Show buttons when revealed or swiping */}
        {(isRevealed || Math.abs(swipeX) > 30) && swipeX > -deleteThreshold && (
          <div 
            className="flex items-stretch h-full"
            style={{ 
              opacity: Math.min((Math.abs(swipeX)) / revealThreshold, 1),
            }}
          >
            {/* More button */}
            <DropdownMenu open={moreMenuOpen} onOpenChange={(open) => {
              setMoreMenuOpen(open);
              // When menu closes, also close the reveal
              if (!open) {
                setSwipeX(0);
                setIsRevealed(false);
              }
            }}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  className="flex items-center justify-center w-16 h-full bg-[#8E8E93] hover:bg-[#7C7C80] transition-colors"
                  data-testid={`swipe-more-${emailId}`}
                >
                  <MoreHorizontal className="w-5 h-5 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleMenuAction(onReply)}>
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onReplyAll)}>
                  <ReplyAll className="w-4 h-4 mr-2" />
                  Reply All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onForward)}>
                  <Forward className="w-4 h-4 mr-2" />
                  Forward
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMenuAction(onToggleStar)}>
                  <Star className={`w-4 h-4 mr-2 ${isStarred ? "fill-yellow-500 text-yellow-500" : ""}`} />
                  {isStarred ? "Unstar" : "Star"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onToggleFlag)}>
                  <Flag className={`w-4 h-4 mr-2 ${isFlagged ? "fill-orange-500 text-orange-500" : ""}`} />
                  {isFlagged ? "Unflag" : "Flag"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onMarkUnread)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Mark as Unread
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMenuAction(onMove)}>
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onArchive)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMenuAction(onBlock)} className="text-red-500 focus:text-red-500">
                  <Ban className="w-4 h-4 mr-2" />
                  Block Sender
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction(onDelete)} className="text-red-500 focus:text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Trash/Delete button */}
            {isTrashFolder ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onPermanentDelete) onPermanentDelete();
                  closeReveal();
                }}
                className="flex items-center justify-center w-16 h-full bg-red-500 hover:bg-red-600 transition-colors"
                data-testid={`swipe-delete-${emailId}`}
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            ) : (
              <button
                onClick={handleDeleteClick}
                className="flex items-center justify-center w-16 h-full bg-red-500 hover:bg-red-600 transition-colors"
                data-testid={`swipe-delete-${emailId}`}
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        )}

        {/* Full swipe delete indicator */}
        {swipeX <= -deleteThreshold && (
          <div className="flex items-center justify-center w-full h-full px-4">
            <div className="flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-white animate-pulse" />
              <span className="text-sm font-medium text-white">Release to delete</span>
            </div>
          </div>
        )}
      </div>

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
          group relative py-3 px-4 cursor-pointer bg-background
          transition-all select-none rounded-lg
          ${!isSwiping ? "duration-200 ease-out" : "duration-0"}
          ${isSelectionMode && isChecked
            ? "bg-muted/50"
            : isSelected 
              ? "bg-muted/30" 
              : "hover:bg-muted/30"
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
                {/* Date/time - visible by default, hidden on hover */}
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap group-hover:hidden">
                  {formatTime(new Date(receivedAt))}
                </span>
                {/* Star icon - always visible when starred */}
                {isStarred && (
                  <button
                    onClick={handleStarClick}
                    className="p-1 rounded-md text-yellow-500 group-hover:hidden"
                    data-testid={`starred-icon-${emailId}`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                )}
                {/* Flag icon - always visible when flagged */}
                {isFlagged && (
                  <span className="p-1 text-orange-500 group-hover:hidden">
                    <Flag className="w-4 h-4 fill-current" />
                  </span>
                )}
                {/* Action buttons - hidden by default, visible on hover */}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  {isTrashFolder ? (
                    <>
                      <button
                        onClick={handleRestoreClick}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-green-500 transition-colors"
                        data-testid={`hover-restore-${emailId}`}
                        title="Restore to inbox"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (onPermanentDelete) onPermanentDelete();
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`hover-permanent-delete-${emailId}`}
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : isArchiveFolder ? (
                    <>
                      <button
                        onClick={handleRestoreClick}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-green-500 transition-colors"
                        data-testid={`hover-restore-${emailId}`}
                        title="Restore to inbox"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`hover-delete-${emailId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleArchiveClick}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`hover-archive-${emailId}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`hover-delete-${emailId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleStarClick}
                    className={`p-1.5 rounded-md transition-colors ${
                      isStarred 
                        ? "text-yellow-500" 
                        : "text-muted-foreground hover:text-yellow-500"
                    }`}
                    data-testid={`hover-star-${emailId}`}
                  >
                    <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
                  </button>
                </div>
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
