import { useState, useRef, useCallback, useEffect } from "react";
import { Archive, Trash2, Star, Check } from "lucide-react";
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
  onSelect: () => void;
  onArchive: () => void;
  onDelete: () => void;
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
  onSelect,
  onArchive,
  onDelete,
  onToggleStar,
  onLongPressStart,
  onLongPressEnd,
  onMouseEnterWhileDragging,
  formatTime,
  getAvatarUrl,
}: SwipeableEmailItemProps) {
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
    if (isSelectionMode) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = isRevealed ? -revealThreshold : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isSelectionMode || !isSwiping) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - startX.current;
    const deltaY = touchY - startY.current;

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
  }, [isSwiping, isSelectionMode]);

  const handleTouchEnd = useCallback(() => {
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
  }, [swipeX, onDelete, isSelectionMode]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode) {
      onLongPressStart();
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
  }, [isSwiping, isSelectionMode]);

  const handleMouseUp = useCallback(() => {
    if (isSelectionMode) {
      onLongPressEnd();
      return;
    }
    handleTouchEnd();
  }, [handleTouchEnd, isSelectionMode, onLongPressEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isSwiping && !isSelectionMode) {
      handleTouchEnd();
    }
  }, [isSwiping, handleTouchEnd, isSelectionMode]);

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
    onArchive();
    setSwipeX(0);
    setIsRevealed(false);
  }, [onArchive]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setSwipeX(0);
    setIsRevealed(false);
  }, [onDelete]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar();
  }, [onToggleStar]);

  const progress = Math.min(Math.abs(swipeX) / deleteThreshold, 1);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-xl w-[30vw]"
      data-testid={`email-item-${emailId}`}
    >
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch overflow-hidden"
        style={{ width: Math.abs(swipeX) }}
      >
        {swipeX > -deleteThreshold && (
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
          group relative py-4 pl-4 pr-6 cursor-pointer bg-background
          transition-transform select-none
          ${!isSwiping ? "duration-200 ease-out" : "duration-0"}
          ${isSelectionMode && isChecked
            ? "bg-primary/20 ring-1 ring-primary/50"
            : isSelected 
              ? "bg-primary/10 ring-1 ring-primary/30" 
              : "hover:bg-muted/50"
          }
        `}
        style={{ transform: `translateX(${swipeX}px)` }}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="w-11 h-11 ring-2 ring-border/30">
              <AvatarImage 
                src={getAvatarUrl(senderEmail, sender)} 
                alt={sender}
              />
              <AvatarFallback 
                style={{ backgroundColor: avatarColor }}
                className="text-white text-sm font-medium"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isRead && !isSelectionMode && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
            )}
            {isSelectionMode && isChecked && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary ring-2 ring-background flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex-1 min-w-0 text-sm truncate block ${!isRead ? "font-semibold" : "font-medium text-foreground/90"}`}>
                {sender}
              </span>
              <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(new Date(receivedAt))}
              </span>
              <button 
                className={`
                  flex-shrink-0 p-1 rounded-lg transition-all duration-200
                  ${isStarred 
                    ? "opacity-100 text-yellow-400" 
                    : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400"
                  }
                `}
                onClick={handleStarClick}
                data-testid={`star-email-${emailId}`}
              >
                <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
              </button>
            </div>
            
            <h4 className={`text-sm mb-1.5 truncate ${!isRead ? "font-medium" : "text-foreground/80"}`}>
              {subject}
            </h4>
            
            <p className="text-xs text-muted-foreground/80 truncate">
              {preview}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
