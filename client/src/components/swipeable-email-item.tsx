import { useState, useRef, useCallback, useEffect } from "react";
import { Archive, Trash2, Star, Check, RotateCcw, MoreHorizontal, Reply, ReplyAll, Forward, FolderInput, Flag } from "lucide-react";
import { SmartAvatar } from "@/components/smart-avatar";
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
  isFlagged?: boolean;
  isSelected: boolean;
  isChecked: boolean;
  isSelectionMode: boolean;
  avatarColor?: string;
  folder?: string;
  threadCount?: number;
  isTrashFolder?: boolean;
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
  onMoveToFolder?: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onMouseEnterWhileDragging: () => void;
  formatTime: (date: Date) => string;
}

// Percentage-based thresholds
const REVEAL_PERCENT = 25;   // 25% of container width to reveal buttons
const DELETE_PERCENT = 70;   // 70% of container width to trigger delete on release
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
  isFlagged = false,
  isSelected,
  isChecked,
  isSelectionMode,
  avatarColor,
  folder = "inbox",
  threadCount = 1,
  isTrashFolder = false,
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
  onMoveToFolder,
  onLongPressStart,
  onLongPressEnd,
  onMouseEnterWhileDragging,
  formatTime,
}: SwipeableEmailItemProps) {
  const isArchiveFolder = folder === "archived";
  const [swipeX, setSwipeX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [containerWidth, setContainerWidth] = useState(300);
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
    // Always trigger long press start for potential selection mode entry
    onLongPressStart();
    
    if (isSelectionMode) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = isRevealed ? -revealThreshold : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isSelectionMode || !isSwiping) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - startX.current;
    const deltaY = touchY - startY.current;

    // Cancel long press if user starts moving (they're swiping, not long pressing)
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
  }, [isSwiping, isSelectionMode, onLongPressEnd]);

  const handleTouchEnd = useCallback(() => {
    // Always end long press timer
    onLongPressEnd();
    
    if (isSelectionMode) return;
    setIsSwiping(false);
    
    // If swiped past delete threshold, trigger delete on release
    if (swipeX <= -deleteThreshold) {
      onDelete();
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }

    // If swiped past half the reveal threshold, keep buttons visible
    if (swipeX <= -revealThreshold / 2) {
      setSwipeX(-revealThreshold);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  }, [swipeX, onDelete, isSelectionMode, onLongPressEnd, deleteThreshold, revealThreshold]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Always trigger long press start for potential selection mode entry
    onLongPressStart();
    
    if (isSelectionMode) {
      return;
    }
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = isRevealed ? -revealThreshold : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode || !isSwiping) return;
    
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    // Cancel long press if user starts moving (they're swiping, not long pressing)
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
  }, [isSwiping, isSelectionMode, onLongPressEnd]);

  const handleMouseUp = useCallback(() => {
    // Always end long press timer
    onLongPressEnd();
    
    if (isSelectionMode) {
      return;
    }
    handleTouchEnd();
  }, [handleTouchEnd, isSelectionMode, onLongPressEnd]);

  const handleMouseLeave = useCallback(() => {
    // Cancel long press timer when mouse leaves
    onLongPressEnd();
    
    if (isSwiping && !isSelectionMode) {
      handleTouchEnd();
    }
  }, [isSwiping, handleTouchEnd, isSelectionMode, onLongPressEnd]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (Math.abs(swipeX) > 5 && !isRevealed) {
      return;
    }
    
    if (isRevealed) {
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    
    onSelect();
  }, [swipeX, isRevealed, onSelect]);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onArchive();
    setSwipeX(0);
    setIsRevealed(false);
  }, [onArchive]);

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

  const progress = Math.min(Math.abs(swipeX) / deleteThreshold, 1);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-xl w-full"
      data-testid={`email-item-${emailId}`}
    >
      <div 
        className="absolute inset-y-0 right-0 flex items-center gap-2 px-3 overflow-hidden"
        style={{ 
          width: Math.abs(swipeX),
          background: swipeX <= -deleteThreshold 
            ? 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.3) 100%)' 
            : 'linear-gradient(90deg, rgba(100,100,100,0.08) 0%, rgba(100,100,100,0.15) 100%)'
        }}
      >
        {swipeX > -deleteThreshold && Math.abs(swipeX) > 50 && (
          isArchiveFolder ? (
            <button
              onClick={handleRestoreClick}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500/90 hover:bg-emerald-500 backdrop-blur-sm transition-all duration-200 shadow-lg shadow-emerald-500/25"
              style={{ 
                opacity: Math.min((Math.abs(swipeX) - 50) / 30, 1),
                transform: `scale(${Math.min((Math.abs(swipeX) - 50) / 40 + 0.8, 1)})`
              }}
              data-testid={`swipe-restore-${emailId}`}
            >
              <RotateCcw className="w-4 h-4 text-white" />
              {Math.abs(swipeX) > 90 && (
                <span className="text-xs font-medium text-white whitespace-nowrap">Restore</span>
              )}
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-slate-600/90 hover:bg-slate-600 backdrop-blur-sm transition-all duration-200 shadow-lg shadow-slate-600/25"
                  style={{ 
                    opacity: Math.min((Math.abs(swipeX) - 50) / 30, 1),
                    transform: `scale(${Math.min((Math.abs(swipeX) - 50) / 40 + 0.8, 1)})`
                  }}
                  data-testid={`swipe-more-${emailId}`}
                >
                  <MoreHorizontal className="w-4 h-4 text-white" />
                  {Math.abs(swipeX) > 90 && (
                    <span className="text-xs font-medium text-white whitespace-nowrap">More</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onReply && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReply(); setSwipeX(0); }} data-testid={`menu-reply-${emailId}`}>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {onReplyAll && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReplyAll(); setSwipeX(0); }} data-testid={`menu-reply-all-${emailId}`}>
                    <ReplyAll className="w-4 h-4 mr-2" />
                    Reply All
                  </DropdownMenuItem>
                )}
                {onForward && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onForward(); setSwipeX(0); }} data-testid={`menu-forward-${emailId}`}>
                    <Forward className="w-4 h-4 mr-2" />
                    Forward
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onMoveToFolder && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveToFolder(); setSwipeX(0); }} data-testid={`menu-move-${emailId}`}>
                    <FolderInput className="w-4 h-4 mr-2" />
                    Move to Folder
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); setSwipeX(0); }} data-testid={`menu-archive-${emailId}`}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStar(); setSwipeX(0); }} data-testid={`menu-star-${emailId}`}>
                  <Star className={`w-4 h-4 mr-2 ${isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  {isStarred ? "Unstar" : "Star"}
                </DropdownMenuItem>
                {onToggleFlag && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFlag(); setSwipeX(0); }} data-testid={`menu-flag-${emailId}`}>
                    <Flag className={`w-4 h-4 mr-2 ${isFlagged ? "fill-red-400 text-red-400" : ""}`} />
                    {isFlagged ? "Unflag" : "Flag"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
        {Math.abs(swipeX) > 30 && (
          <button
            onClick={handleDeleteClick}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
              swipeX <= -deleteThreshold 
                ? 'bg-red-500 shadow-xl shadow-red-500/40 scale-110' 
                : 'bg-red-500/90 hover:bg-red-500 shadow-lg shadow-red-500/25'
            }`}
            style={{ 
              opacity: Math.min((Math.abs(swipeX) - 30) / 30, 1),
              transform: swipeX <= -deleteThreshold ? 'scale(1.1)' : `scale(${Math.min((Math.abs(swipeX) - 30) / 40 + 0.8, 1)})`
            }}
            data-testid={`swipe-delete-${emailId}`}
          >
            <Trash2 className={`text-white transition-all duration-200 ${swipeX <= -deleteThreshold ? "w-5 h-5" : "w-4 h-4"}`} />
            {(Math.abs(swipeX) > 90 || swipeX <= -deleteThreshold) && (
              <span className="text-xs font-medium text-white whitespace-nowrap">
                {swipeX <= -deleteThreshold ? "Release to delete" : "Delete"}
              </span>
            )}
          </button>
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
            <SmartAvatar 
              email={senderEmail}
              name={sender}
              className="w-10 h-10"
              fallbackClassName="text-white text-xs font-medium"
            />
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
                <span className={`text-[11px] whitespace-nowrap group-hover:hidden ${!isRead ? "font-medium text-foreground" : "text-muted-foreground/70"}`}>
                  {formatTime(new Date(receivedAt))}
                </span>
                {/* Star icon - always visible when starred, placed after date */}
                {isStarred && (
                  <button
                    onClick={handleStarClick}
                    className="p-1 rounded-md text-yellow-500 group-hover:hidden"
                    data-testid={`starred-icon-${emailId}`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
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
