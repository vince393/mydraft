import { useState, useRef, useCallback } from "react";
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

const REVEAL_THRESHOLD = 80;
const DELETE_THRESHOLD = 160;

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
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    currentX.current = isRevealed ? -REVEAL_THRESHOLD : 0;
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
    
    if (newX < -DELETE_THRESHOLD - 40) {
      newX = -DELETE_THRESHOLD - 40;
    }

    setSwipeX(newX);
  }, [isSwiping, isSelectionMode]);

  const handleTouchEnd = useCallback(() => {
    if (isSelectionMode) return;
    setIsSwiping(false);
    
    if (swipeX <= -DELETE_THRESHOLD) {
      setSwipeX(-DELETE_THRESHOLD - 40);
      setTimeout(() => {
        onDelete();
        setSwipeX(0);
        setIsRevealed(false);
      }, 150);
      return;
    }

    if (swipeX <= -REVEAL_THRESHOLD / 2) {
      setSwipeX(-REVEAL_THRESHOLD);
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
    currentX.current = isRevealed ? -REVEAL_THRESHOLD : 0;
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
    if (newX < -DELETE_THRESHOLD - 40) newX = -DELETE_THRESHOLD - 40;

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

  const progress = Math.min(Math.abs(swipeX) / DELETE_THRESHOLD, 1);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden rounded-xl"
      data-testid={`email-item-${emailId}`}
    >
      <div 
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: Math.max(Math.abs(swipeX), REVEAL_THRESHOLD) }}
      >
        <button
          onClick={handleArchiveClick}
          className="flex-1 flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-colors"
          style={{ 
            opacity: Math.abs(swipeX) > 20 ? 1 : 0,
            minWidth: REVEAL_THRESHOLD / 2
          }}
          data-testid={`swipe-archive-${emailId}`}
        >
          <Archive className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleDeleteClick}
          className="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors"
          style={{ 
            opacity: Math.abs(swipeX) > 20 ? 1 : 0,
            minWidth: REVEAL_THRESHOLD / 2,
            flex: swipeX <= -DELETE_THRESHOLD ? 2 : 1
          }}
          data-testid={`swipe-delete-${emailId}`}
        >
          <Trash2 className={`text-white transition-transform ${swipeX <= -DELETE_THRESHOLD ? "w-6 h-6 scale-110" : "w-5 h-5"}`} />
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
          group relative py-4 pl-4 pr-2 cursor-pointer bg-background
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
              <div className={`flex-1 min-w-0 text-sm truncate ${!isRead ? "font-semibold" : "font-medium text-foreground/90"}`}>
                {sender}
              </div>
              <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(new Date(receivedAt))}
              </div>
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
            
            <h4 className={`text-sm truncate mb-1.5 ${!isRead ? "font-medium" : "text-foreground/80"}`}>
              {subject}
            </h4>
            
            <p className="text-xs text-muted-foreground/80 line-clamp-1">
              {preview}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
