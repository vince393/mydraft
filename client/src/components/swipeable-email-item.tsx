import { useState, useRef, useCallback, useEffect } from "react";
import { Archive, Trash2, Star, Check, RotateCcw, MoreHorizontal, Reply, ReplyAll, Forward, FolderInput, Flag, MailOpen } from "lucide-react";
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
  onMarkUnread?: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onMouseEnterWhileDragging: () => void;
  formatTime: (date: Date) => string;
}

const REVEAL_PERCENT = 32;
const DELETE_PERCENT = 70;
const MAX_SWIPE_PERCENT = 99;
const MORE_BUTTON_WIDTH = 72;

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
  onMarkUnread,
  onLongPressStart,
  onLongPressEnd,
  onMouseEnterWhileDragging,
  formatTime,
}: SwipeableEmailItemProps) {
  const isArchiveFolder = folder === "archived";
  const [swipeX, setSwipeX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitHeight, setExitHeight] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wasScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealThreshold = (containerWidth * REVEAL_PERCENT) / 100;
  const deleteThreshold = (containerWidth * DELETE_PERCENT) / 100;
  const maxSwipe = (containerWidth * MAX_SWIPE_PERCENT) / 100;

  const animateExit = useCallback((callback: () => void) => {
    if (isExiting) return;
    const h = wrapperRef.current?.offsetHeight || 0;
    setExitHeight(h);
    setSwipeX(-containerWidth);
    setIsExiting(true);
    setTimeout(() => {
      setExitHeight(0);
    }, 30);
    setTimeout(() => {
      callback();
    }, 220);
  }, [isExiting, containerWidth]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  const handleWheel = useCallback(() => {
    wasScrolling.current = true;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      wasScrolling.current = false;
    }, 150);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    onLongPressStart();
    if (isSelectionMode) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    wasScrolling.current = false;
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

    if (Math.abs(deltaY) > 8) {
      wasScrolling.current = true;
    }

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
      const action = isTrashFolder && onPermanentDelete ? onPermanentDelete : onDelete;
      animateExit(action);
      return;
    }

    const minSwipeDistance = 30;
    if (swipeX <= -revealThreshold / 2 && Math.abs(swipeX) >= minSwipeDistance) {
      setSwipeX(-revealThreshold);
      setIsRevealed(true);
    } else {
      setSwipeX(0);
      setIsRevealed(false);
    }
  }, [swipeX, onDelete, onPermanentDelete, isTrashFolder, isSelectionMode, onLongPressEnd, deleteThreshold, revealThreshold, animateExit]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onLongPressStart();
    if (isSelectionMode) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    wasScrolling.current = false;
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
    if (wasScrolling.current) return;
    if (Math.abs(swipeX) > 5 && !isRevealed) return;
    if (isRevealed) {
      setSwipeX(0);
      setIsRevealed(false);
      return;
    }
    onSelect();
  }, [swipeX, isRevealed, onSelect]);

  const handleActionClick = useCallback((action: () => void, animate = false) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (animate) {
      animateExit(action);
    } else {
      action();
      setSwipeX(0);
      setIsRevealed(false);
    }
  }, [animateExit]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleStar();
  }, [onToggleStar]);

  const absSwipe = Math.abs(swipeX);
  const isFullSwipe = swipeX <= -deleteThreshold;

  const iconOpacity = Math.min((absSwipe - 10) / 40, 1);
  const iconScale = Math.min(absSwipe / revealThreshold, 1);

  const PILL_HEIGHT = 42;
  const FIXED_BTN_WIDTH = 50;
  const GAP = 6;
  const PAD = 8;

  const deleteButtonWidth = isFullSwipe
    ? absSwipe - PAD * 2
    : Math.max(0, absSwipe - FIXED_BTN_WIDTH - GAP - PAD * 2);

  const glossyPill = (bg: string, w: number) => ({
    width: w,
    height: PILL_HEIGHT,
    borderRadius: 9999,
    background: bg,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
  });

  const redBg = 'linear-gradient(145deg, rgba(220,50,50,0.25) 0%, rgba(180,30,30,0.3) 100%)';
  const greenBg = 'linear-gradient(145deg, rgba(40,180,90,0.2) 0%, rgba(20,140,60,0.25) 100%)';
  const neutralBg = 'rgba(255,255,255,0.08)';

  const renderLeftAction = () => {
    if (isTrashFolder) {
      const firstBtnW = FIXED_BTN_WIDTH;
      const secondBtnW = Math.max(0, absSwipe - firstBtnW - GAP - PAD * 2);
      if (isFullSwipe) {
        return (
          <div className="flex items-center w-full" style={{ padding: `0 ${PAD}px` }}>
            <button
              onClick={handleActionClick(onPermanentDelete || onDelete, true)}
              className="flex items-center justify-center gap-2"
              style={{ ...glossyPill(redBg, absSwipe - PAD * 2), opacity: iconOpacity }}
              data-testid={`swipe-delete-${emailId}`}
            >
              <Trash2 className="w-5 h-5 text-white" style={{ transform: `scale(${iconScale})` }} />
              <span className="text-xs font-semibold text-white/95">Delete</span>
            </button>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-end w-full" style={{ padding: `0 ${PAD}px`, gap: GAP }}>
          <button
            onClick={handleActionClick(onRestore || (() => {}))}
            className="flex items-center justify-center flex-shrink-0"
            style={{ ...glossyPill(greenBg, firstBtnW), opacity: iconOpacity }}
            data-testid={`swipe-restore-${emailId}`}
          >
            <RotateCcw className="w-4 h-4 text-white" style={{ transform: `scale(${iconScale})` }} />
          </button>
          {secondBtnW > 0 && (
            <button
              onClick={handleActionClick(onPermanentDelete || onDelete, true)}
              className="flex items-center justify-center"
              style={{ ...glossyPill(redBg, secondBtnW), opacity: iconOpacity }}
              data-testid={`swipe-delete-${emailId}`}
            >
              <Trash2 className="w-4 h-4 text-white" style={{ transform: `scale(${iconScale})` }} />
            </button>
          )}
        </div>
      );
    }

    if (isArchiveFolder) {
      const firstBtnW = FIXED_BTN_WIDTH;
      const secondBtnW = Math.max(0, absSwipe - firstBtnW - GAP - PAD * 2);
      if (isFullSwipe) {
        return (
          <div className="flex items-center w-full" style={{ padding: `0 ${PAD}px` }}>
            <button
              onClick={handleActionClick(onDelete, true)}
              className="flex items-center justify-center gap-2"
              style={{ ...glossyPill(redBg, absSwipe - PAD * 2), opacity: iconOpacity }}
              data-testid={`swipe-delete-${emailId}`}
            >
              <Trash2 className="w-5 h-5 text-white" style={{ transform: `scale(${iconScale})` }} />
              <span className="text-xs font-semibold text-white/95">Delete</span>
            </button>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-end w-full" style={{ padding: `0 ${PAD}px`, gap: GAP }}>
          <button
            onClick={handleActionClick(onRestore || (() => {}))}
            className="flex items-center justify-center flex-shrink-0"
            style={{ ...glossyPill(greenBg, firstBtnW), opacity: iconOpacity }}
            data-testid={`swipe-restore-${emailId}`}
          >
            <RotateCcw className="w-4 h-4 text-white" style={{ transform: `scale(${iconScale})` }} />
          </button>
          {secondBtnW > 0 && (
            <button
              onClick={handleActionClick(onDelete, true)}
              className="flex items-center justify-center"
              style={{ ...glossyPill(redBg, secondBtnW), opacity: iconOpacity }}
              data-testid={`swipe-delete-${emailId}`}
            >
              <Trash2 className="w-4 h-4 text-white" style={{ transform: `scale(${iconScale})` }} />
            </button>
          )}
        </div>
      );
    }

    if (isFullSwipe) {
      return (
        <div className="flex items-center w-full" style={{ padding: `0 ${PAD}px` }}>
          <button
            onClick={handleActionClick(onDelete, true)}
            className="flex items-center justify-center gap-2"
            style={{ ...glossyPill(redBg, absSwipe - PAD * 2), opacity: iconOpacity }}
            data-testid={`swipe-delete-${emailId}`}
          >
            <Trash2 className="w-5 h-5 text-white" style={{ transform: `scale(${iconScale})` }} />
            <span className="text-xs font-semibold text-white/95">Delete</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end w-full" style={{ padding: `0 ${PAD}px`, gap: GAP }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center flex-shrink-0"
              style={{ ...glossyPill(neutralBg, FIXED_BTN_WIDTH), opacity: iconOpacity }}
              data-testid={`swipe-more-${emailId}`}
            >
              <MoreHorizontal className="w-4 h-4 text-foreground/80" style={{ transform: `scale(${iconScale})` }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {onReply && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReply(); setSwipeX(0); setIsRevealed(false); }} data-testid={`menu-reply-${emailId}`}>
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </DropdownMenuItem>
            )}
            {onReplyAll && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReplyAll(); setSwipeX(0); setIsRevealed(false); }} data-testid={`menu-reply-all-${emailId}`}>
                <ReplyAll className="w-4 h-4 mr-2" />
                Reply All
              </DropdownMenuItem>
            )}
            {onForward && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onForward(); setSwipeX(0); setIsRevealed(false); }} data-testid={`menu-forward-${emailId}`}>
                <Forward className="w-4 h-4 mr-2" />
                Forward
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onMoveToFolder && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveToFolder(); setSwipeX(0); setIsRevealed(false); }} data-testid={`menu-move-${emailId}`}>
                <FolderInput className="w-4 h-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); setSwipeX(0); setIsRevealed(false); }} data-testid={`menu-archive-${emailId}`}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStar(); setSwipeX(0); setIsRevealed(false); }} data-testid={`menu-star-${emailId}`}>
              <Star className={`w-4 h-4 mr-2 ${isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
              {isStarred ? "Unstar" : "Star"}
            </DropdownMenuItem>
            {isRead && onMarkUnread && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkUnread(); setSwipeX(0); setIsRevealed(false); }} data-testid={`menu-mark-unread-${emailId}`}>
                <MailOpen className="w-4 h-4 mr-2" />
                Mark as Unread
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {deleteButtonWidth > 0 && (
          <button
            onClick={handleActionClick(onDelete, true)}
            className="flex items-center justify-center"
            style={{ ...glossyPill(redBg, deleteButtonWidth), opacity: iconOpacity }}
            data-testid={`swipe-delete-${emailId}`}
          >
            <Trash2 className="w-4 h-4 text-white" style={{ transform: `scale(${iconScale})` }} />
          </button>
        )}
      </div>
    );
  };

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ emailId: String(emailId), subject, sender }));
    e.dataTransfer.effectAllowed = "move";
    if (containerRef.current) {
      containerRef.current.style.opacity = "0.5";
    }
  }, [emailId, subject, sender]);

  const handleDragEnd = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.opacity = "1";
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      onWheel={handleWheel}
      style={{
        height: exitHeight !== null ? exitHeight : undefined,
        opacity: isExiting ? 0 : 1,
        overflow: 'hidden',
        transition: isExiting ? 'height 0.18s cubic-bezier(0.2, 0, 0, 1), opacity 0.12s ease-out' : 'none',
      }}
    >
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl w-full"
      data-testid={`email-item-${emailId}`}
      draggable={!isSelectionMode && !isSwiping}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ width: absSwipe > 4 ? absSwipe : 0 }}
      >
        {absSwipe > 4 && renderLeftAction()}
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
              : ""
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
                <span className={`text-[11px] whitespace-nowrap md:group-hover:hidden ${!isRead ? "font-medium text-foreground" : "text-muted-foreground/70"}`}>
                  {formatTime(new Date(receivedAt))}
                </span>
                {isStarred && (
                  <button
                    onClick={handleStarClick}
                    className="p-1 rounded-md text-yellow-500 md:group-hover:hidden"
                    data-testid={`starred-icon-${emailId}`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                )}
                {isFlagged && !isStarred && (
                  <span className="p-1 text-orange-500 md:group-hover:hidden">
                    <Flag className="w-3.5 h-3.5 fill-current" />
                  </span>
                )}
                <div className="hidden md:group-hover:flex items-center gap-0.5">
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
                        onClick={handleActionClick(onPermanentDelete || onDelete, true)}
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
                        onClick={handleActionClick(onDelete, true)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`hover-delete-${emailId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleActionClick(onArchive, true)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`hover-archive-${emailId}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleActionClick(onDelete, true)}
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
    </div>
  );
}
