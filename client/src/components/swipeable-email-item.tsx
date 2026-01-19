import { useState, useRef, useCallback, useEffect } from "react";
import { Archive, Trash2, Star, Check, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  onSelect: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPermanentDelete?: () => void;
  onRestore?: () => void;
  onToggleStar: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onMouseEnterWhileDragging: () => void;
  formatTime: (date: Date) => string;
  getAvatarUrl: (email: string, name: string) => string;
}

// Percentage-based thresholds
const REVEAL_PERCENT = 25;   // 25% of container width to reveal buttons
const DELETE_PERCENT = 40;   // 40% of container width to trigger delete mode
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
  onSelect,
  onArchive,
  onDelete,
  onPermanentDelete,
  onRestore,
  onToggleStar,
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

  const initials = sender
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
    
    if (swipeX <= -deleteThreshold) {
      setSwipeX(-maxSwipe);
      setTimeout(() => {
        onDelete();
        setSwipeX(0);
        setIsRevealed(false);
      }, 150);
      return;
    }

    if (swipeX <= -revealThreshold / 2) {
      setSwipeX(-revealThreshold);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  }, [swipeX, onDelete, isSelectionMode, onLongPressEnd]);

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
        className="absolute inset-y-0 right-0 flex items-stretch overflow-hidden"
        style={{ width: Math.abs(swipeX) }}
      >
        {swipeX > -deleteThreshold && (
          isArchiveFolder ? (
            <button
              onClick={handleRestoreClick}
              className="flex items-center justify-center bg-green-500 hover:bg-green-600 transition-all"
              style={{ 
                width: Math.abs(swipeX) / 2,
                minWidth: Math.abs(swipeX) > 10 ? 40 : 0
              }}
              data-testid={`swipe-restore-${emailId}`}
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button
              onClick={handleArchiveClick}
              className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-all"
              style={{ 
                width: Math.abs(swipeX) / 2,
                minWidth: Math.abs(swipeX) > 10 ? 40 : 0
              }}
              data-testid={`swipe-archive-${emailId}`}
            >
              <Archive className="w-5 h-5 text-white" />
            </button>
          )
        )}
        <button
          onClick={handleDeleteClick}
          className="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 transition-all"
          style={{ 
            minWidth: Math.abs(swipeX) > 10 ? 40 : 0
          }}
          data-testid={`swipe-delete-${emailId}`}
        >
          <Trash2 className={`text-white transition-transform ${swipeX <= -deleteThreshold ? "w-6 h-6 scale-110" : "w-5 h-5"}`} />
        </button>
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
            ? "bg-primary/10 ring-2 ring-inset ring-primary/30"
            : isSelected 
              ? "bg-primary/15 ring-2 ring-inset ring-primary shadow-sm" 
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
