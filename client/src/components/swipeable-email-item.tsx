import { useState, useRef, useCallback, useEffect } from "react";
import { Archive, Trash2, Star, Check, RotateCcw, Flag } from "lucide-react";
import { SmartAvatar } from "@/components/smart-avatar";

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

const REVEAL_PERCENT = 30;
const DELETE_PERCENT = 70;
const MAX_SWIPE_PERCENT = 99;

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

  const revealThreshold = (containerWidth * REVEAL_PERCENT) / 100;
  const deleteThreshold = (containerWidth * DELETE_PERCENT) / 100;
  const maxSwipe = (containerWidth * MAX_SWIPE_PERCENT) / 100;

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    onLongPressStart();
    if (isSelectionMode) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = isRevealed ? -revealThreshold : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart, revealThreshold]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isSelectionMode || !isSwiping) return;
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
    if (newX < -maxSwipe) newX = -maxSwipe;
    setSwipeX(newX);
  }, [isSwiping, isSelectionMode, onLongPressEnd, maxSwipe]);

  const handleTouchEnd = useCallback(() => {
    onLongPressEnd();
    if (isSelectionMode) return;
    setIsSwiping(false);

    if (swipeX <= -deleteThreshold) {
      if (isTrashFolder && onPermanentDelete) {
        onPermanentDelete();
      } else {
        onDelete();
      }
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }

    if (swipeX <= -revealThreshold / 2) {
      setSwipeX(-revealThreshold);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  }, [swipeX, onDelete, isSelectionMode, onLongPressEnd, deleteThreshold, revealThreshold]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onLongPressStart();
    if (isSelectionMode) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = isRevealed ? -revealThreshold : 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [isRevealed, isSelectionMode, onLongPressStart, revealThreshold]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelectionMode || !isSwiping) return;
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
  }, [isSwiping, isSelectionMode, onLongPressEnd, maxSwipe]);

  const handleMouseUp = useCallback(() => {
    onLongPressEnd();
    if (isSelectionMode) return;
    handleTouchEnd();
  }, [handleTouchEnd, isSelectionMode, onLongPressEnd]);

  const handleMouseLeave = useCallback(() => {
    onLongPressEnd();
    if (isSwiping && !isSelectionMode) {
      handleTouchEnd();
    }
  }, [isSwiping, handleTouchEnd, isSelectionMode, onLongPressEnd]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (Math.abs(swipeX) > 5 && !isRevealed) return;
    if (isRevealed) {
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    onSelect();
  }, [swipeX, isRevealed, onSelect]);

  const handleActionClick = useCallback((action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    action();
    setSwipeX(0);
    setIsRevealed(false);
  }, []);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleStar();
  }, [onToggleStar]);

  const absSwipe = Math.abs(swipeX);
  const isFullSwipe = swipeX <= -deleteThreshold;

  const getActionStrips = () => {
    if (isTrashFolder) {
      return [
        { icon: RotateCcw, label: "Restore", color: "bg-emerald-500", action: onRestore || (() => {}), testId: `swipe-restore-${emailId}` },
        { icon: Trash2, label: "Delete", color: "bg-red-500", action: onPermanentDelete || onDelete, testId: `swipe-delete-${emailId}` },
      ];
    }
    if (isArchiveFolder) {
      return [
        { icon: RotateCcw, label: "Restore", color: "bg-emerald-500", action: onRestore || (() => {}), testId: `swipe-restore-${emailId}` },
        { icon: Trash2, label: "Delete", color: "bg-red-500", action: onDelete, testId: `swipe-delete-${emailId}` },
      ];
    }
    return [
      { icon: Flag, label: isFlagged ? "Unflag" : "Flag", color: "bg-orange-500", action: onToggleFlag || (() => {}), testId: `swipe-flag-${emailId}` },
      { icon: Archive, label: "Archive", color: "bg-blue-500", action: onArchive, testId: `swipe-archive-${emailId}` },
      { icon: Trash2, label: "Trash", color: "bg-red-500", action: onDelete, testId: `swipe-delete-${emailId}` },
    ];
  };

  const strips = getActionStrips();
  const stripWidth = absSwipe / strips.length;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl w-full"
      data-testid={`email-item-${emailId}`}
    >
      {/* Action strips behind the email content */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: absSwipe }}>
        {isFullSwipe ? (
          <div
            className="flex-1 flex items-center justify-center gap-2 bg-red-500"
            data-testid={`swipe-fulldelete-${emailId}`}
          >
            <Trash2 className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-white">Release to delete</span>
          </div>
        ) : (
          strips.map((strip, idx) => {
            const StripIcon = strip.icon;
            const showLabel = stripWidth > 50;
            return (
              <button
                key={idx}
                onClick={handleActionClick(strip.action)}
                className={`flex flex-col items-center justify-center gap-1 ${strip.color} transition-colors`}
                style={{ width: stripWidth, minWidth: 0 }}
                data-testid={strip.testId}
              >
                <StripIcon className="w-[18px] h-[18px] text-white" />
                {showLabel && (
                  <span className="text-[10px] font-medium text-white/90 leading-none">
                    {strip.label}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Email content layer */}
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
                <span className={`text-[11px] whitespace-nowrap group-hover:hidden ${!isRead ? "font-medium text-foreground" : "text-muted-foreground/70"}`}>
                  {formatTime(new Date(receivedAt))}
                </span>
                {isStarred && (
                  <button
                    onClick={handleStarClick}
                    className="p-1 rounded-md text-yellow-500 group-hover:hidden"
                    data-testid={`starred-icon-${emailId}`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                )}
                {isFlagged && !isStarred && (
                  <span className="p-1 text-orange-500 group-hover:hidden">
                    <Flag className="w-3.5 h-3.5 fill-current" />
                  </span>
                )}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  {isTrashFolder ? (
                    <>
                      <button
                        onClick={handleActionClick(onRestore || (() => {}))}
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
                        onClick={handleActionClick(onRestore || (() => {}))}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-green-500 transition-colors"
                        data-testid={`hover-restore-${emailId}`}
                        title="Restore to inbox"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleActionClick(onDelete)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`hover-delete-${emailId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleActionClick(onArchive)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`hover-archive-${emailId}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleActionClick(onDelete)}
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
