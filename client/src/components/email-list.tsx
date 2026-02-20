import { useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { format, isToday, isYesterday, subDays, isAfter } from "date-fns";
import { Star, Sparkles, Loader2, Archive, Trash2, Clock, Search, SlidersHorizontal, X, Check, Mail, Calendar, User, Link, Wand2, PenSquare } from "lucide-react";
import { useScreenSize } from "@/hooks/use-screen-size";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SwipeableEmailItem } from "@/components/swipeable-email-item";
import { AiInboxRefreshButton } from "@/components/ai-inbox-refresh";
import { categorizeEmail, getCategoryFromFolder, type EmailCategory } from "@/lib/email-categories";
import type { Email } from "@shared/schema";

interface EmailWithNylasId extends Email {
  nylasId?: string;
  threadCount?: number;
  threadEmails?: EmailWithNylasId[];
  isFlagged?: boolean;
}

function getEmailId(email: EmailWithNylasId): string | number {
  return email.nylasId || email.id;
}

function formatEmailTime(date: Date): string {
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMM d");
  }
}

interface EmailListProps {
  emails: EmailWithNylasId[];
  selectedEmailId: string | number | null;
  onSelectEmail: (email: EmailWithNylasId) => void;
  onAiReply: () => void;
  onAiReplyMultiple?: (emails: EmailWithNylasId[]) => void;
  onTrashEmail: () => void;
  onArchiveEmail: () => void;
  onTrashMultipleEmails: (emailIds: (string | number)[]) => void;
  onArchiveMultipleEmails: (emailIds: (string | number)[]) => void;
  onToggleStar: (emailId: string | number) => void;
  onToggleFlag?: (emailId: string | number) => void;
  onTrashSingleEmail: (emailId: string | number) => void;
  onArchiveSingleEmail: (emailId: string | number) => void;
  onRestoreSingleEmail?: (emailId: string | number) => void;
  onPermanentDeleteSingleEmail?: (emailId: string | number) => void;
  onMoveToFolder?: (emailId: string | number) => void;
  onMarkUnread?: (emailId: string | number) => void;
  onReplyEmail?: (email: EmailWithNylasId) => void;
  onForwardEmail?: (email: EmailWithNylasId) => void;
  isAiLoading?: boolean;
  isMoving?: boolean;
  isLoading?: boolean;
  isSyncing?: boolean;
  activeFolder?: string;
  hasConnectedAccount?: boolean;
  onConnectAccount?: () => void;
  onInboxRefresh?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onCompose?: () => void;
  onOpenAssistant?: () => void;
  mobileNavLeft?: ReactNode;
}

interface ResponseTimeEstimate {
  estimatedMinutes: number;
  unreadCount: number;
  totalWords: number;
  message?: string;
}

function EmailListSkeleton() {
  return (
    <div className="space-y-0 p-0">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="px-4 py-3 animate-pulse border-b border-border/10">
          <div className="flex flex-wrap items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/30" />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="h-3.5 w-24 bg-muted/30 rounded" />
                <div className="h-2.5 w-12 bg-muted/20 rounded" />
              </div>
              <div className="h-3.5 w-44 bg-muted/25 rounded" />
              <div className="h-3 w-full bg-muted/20 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailListEmpty({ hasConnectedAccount, onConnectAccount }: { hasConnectedAccount: boolean; onConnectAccount?: () => void }) {
  if (!hasConnectedAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-muted/30 flex flex-wrap items-center justify-center mb-5">
          <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h3 className="font-medium text-lg mb-1.5 tracking-tight">Connect your email</h3>
        <p className="text-sm text-muted-foreground/70 mb-5">Add an account to start managing your inbox</p>
        {onConnectAccount && (
          <Button 
            onClick={onConnectAccount}
            className="gap-2"
            data-testid="button-connect-email-empty"
          >
            <Link className="w-4 h-4" />
            Add Account
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted/20 flex flex-wrap items-center justify-center mb-5">
        <svg className="w-7 h-7 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-medium text-lg mb-1.5 tracking-tight">No emails yet</h3>
      <p className="text-sm text-muted-foreground/70">Your inbox is empty</p>
    </div>
  );
}

interface Filters {
  unreadOnly: boolean;
  dateRange: "all" | "today" | "week" | "month";
  sender: string;
}

export function EmailList({ emails, selectedEmailId, onSelectEmail, onAiReply, onAiReplyMultiple, onTrashEmail, onArchiveEmail, onTrashMultipleEmails, onArchiveMultipleEmails, onToggleStar, onToggleFlag, onTrashSingleEmail, onArchiveSingleEmail, onRestoreSingleEmail, onPermanentDeleteSingleEmail, onMoveToFolder, onMarkUnread, onReplyEmail, onForwardEmail, isAiLoading, isMoving, isLoading, isSyncing, activeFolder = "inbox", hasConnectedAccount = true, onConnectAccount, onInboxRefresh, onRefresh, isRefreshing, onCompose, onOpenAssistant, mobileNavLeft }: EmailListProps) {
  const screen = useScreenSize();
  const isTrashFolder = activeFolder.toLowerCase() === "trash";
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    unreadOnly: false,
    dateRange: "all",
    sender: "",
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeCategory = getCategoryFromFolder(activeFolder || "inbox");
  const isInCategoryView = activeCategory !== null;
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullThreshold = 60;
  
  const { data: responseTime, isLoading: isLoadingTime } = useQuery<ResponseTimeEstimate>({
    queryKey: ['/api/response-time', activeFolder],
    queryFn: async () => {
      const response = await fetch(`/api/response-time?folder=${activeFolder}`);
      if (!response.ok) throw new Error("Failed to fetch response time");
      return response.json();
    },
    staleTime: Infinity,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);
  const dragStarted = useRef(false);
  
  // Auto-scroll refs for drag selection
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const lastMouseY = useRef<number>(0);
  const emailElementsRef = useRef<Map<string | number, HTMLDivElement>>(new Map());

  const hasActiveFilters = filters.unreadOnly || filters.dateRange !== "all" || filters.sender.trim() !== "";

  const filteredEmails = useMemo(() => {
    let result = emails;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(email =>
        (email.sender?.toLowerCase() ?? "").includes(query) ||
        (email.senderEmail?.toLowerCase() ?? "").includes(query) ||
        (email.subject?.toLowerCase() ?? "").includes(query) ||
        (email.preview?.toLowerCase() ?? "").includes(query) ||
        (email.body?.toLowerCase() ?? "").includes(query)
      );
    }

    // Apply unread filter
    if (filters.unreadOnly) {
      result = result.filter(email => !email.isRead);
    }

    // Apply date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      let cutoffDate: Date;
      switch (filters.dateRange) {
        case "today":
          cutoffDate = subDays(now, 1);
          break;
        case "week":
          cutoffDate = subDays(now, 7);
          break;
        case "month":
          cutoffDate = subDays(now, 30);
          break;
        default:
          cutoffDate = new Date(0);
      }
      result = result.filter(email => isAfter(new Date(email.receivedAt), cutoffDate));
    }

    // Apply sender filter
    if (filters.sender.trim()) {
      const senderQuery = filters.sender.toLowerCase();
      result = result.filter(email =>
        (email.sender?.toLowerCase() ?? "").includes(senderQuery) ||
        (email.senderEmail?.toLowerCase() ?? "").includes(senderQuery)
      );
    }

    return result;
  }, [emails, searchQuery, filters]);

  const categoryFilteredEmails = useMemo(() => {
    if (!activeCategory) return filteredEmails;
    return filteredEmails.filter(email => categorizeEmail(email) === activeCategory);
  }, [filteredEmails, activeCategory]);

  const clearFilters = () => {
    setFilters({ unreadOnly: false, dateRange: "all", sender: "" });
    setSearchQuery("");
  };

  const uniqueSenders = useMemo(() => {
    const senders = new Map<string, string>();
    emails.forEach(email => {
      if (!senders.has(email.senderEmail)) {
        senders.set(email.senderEmail, email.sender);
      }
    });
    return Array.from(senders.entries()).slice(0, 10);
  }, [emails]);

  const handleLongPressStart = useCallback((emailId: string | number) => {
    longPressTriggered.current = false;
    dragStarted.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      dragStarted.current = true;
      setIsSelectionMode(true);
      setIsDragging(true);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.add(emailId);
        return next;
      });
    }, 1000);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsDragging(false);
    dragStarted.current = false;
  }, []);

  const handleMouseEnterWhileDragging = useCallback((emailId: string | number) => {
    if (isDragging && isSelectionMode) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.add(emailId);
        return newSet;
      });
    }
  }, [isDragging, isSelectionMode]);

  // Find email element at a given Y position
  const findEmailAtPosition = useCallback((clientY: number): string | number | null => {
    const entries = Array.from(emailElementsRef.current.entries());
    for (const [emailId, element] of entries) {
      const rect = element.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return emailId;
      }
    }
    return null;
  }, []);

  // Auto-scroll and select during drag
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging || !isSelectionMode) return;
    
    lastMouseY.current = clientY;
    
    // Find and select email at current position
    const emailId = findEmailAtPosition(clientY);
    if (emailId !== null) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.add(emailId);
        return newSet;
      });
    }
    
    // Auto-scroll logic
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    const containerRect = scrollContainer.getBoundingClientRect();
    const scrollThreshold = 60; // pixels from edge to start scrolling
    const scrollSpeed = 8; // pixels per frame
    
    // Clear existing auto-scroll
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    
    // Check if near top edge
    if (clientY < containerRect.top + scrollThreshold && clientY > containerRect.top) {
      autoScrollTimer.current = setInterval(() => {
        if (scrollContainer.scrollTop > 0) {
          scrollContainer.scrollTop -= scrollSpeed;
          // Select email at current position after scroll
          const emailAtPos = findEmailAtPosition(lastMouseY.current);
          if (emailAtPos !== null) {
            setSelectedIds(prev => {
              const newSet = new Set(prev);
              newSet.add(emailAtPos);
              return newSet;
            });
          }
        }
      }, 16);
    }
    // Check if near bottom edge
    else if (clientY > containerRect.bottom - scrollThreshold && clientY < containerRect.bottom) {
      autoScrollTimer.current = setInterval(() => {
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (scrollContainer.scrollTop < maxScroll) {
          scrollContainer.scrollTop += scrollSpeed;
          // Select email at current position after scroll
          const emailAtPos = findEmailAtPosition(lastMouseY.current);
          if (emailAtPos !== null) {
            setSelectedIds(prev => {
              const newSet = new Set(prev);
              newSet.add(emailAtPos);
              return newSet;
            });
          }
        }
      }, 16);
    }
  }, [isDragging, isSelectionMode, findEmailAtPosition]);

  // Stop auto-scroll when drag ends
  useEffect(() => {
    if (!isDragging && autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, [isDragging]);

  // Global mouse/touch move handler for drag selection
  useEffect(() => {
    if (!isDragging || !isSelectionMode) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientY);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isSelectionMode, handleDragMove]);

  // Register email element ref
  const registerEmailRef = useCallback((emailId: string | number, element: HTMLDivElement | null) => {
    if (element) {
      emailElementsRef.current.set(emailId, element);
    } else {
      emailElementsRef.current.delete(emailId);
    }
  }, []);

  const handleEmailClick = useCallback((email: EmailWithNylasId) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    
    const id = getEmailId(email);
    if (isSelectionMode) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        if (newSet.size === 0) {
          setIsSelectionMode(false);
        }
        return newSet;
      });
    } else {
      onSelectEmail(email);
    }
  }, [isSelectionMode, onSelectEmail]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === categoryFilteredEmails.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(categoryFilteredEmails.map(e => getEmailId(e))));
    }
  }, [selectedIds.size, categoryFilteredEmails]);

  const handleTrashSelected = useCallback(() => {
    if (selectedIds.size > 0) {
      onTrashMultipleEmails(Array.from(selectedIds));
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [selectedIds, onTrashMultipleEmails]);

  const handleArchiveSelected = useCallback(() => {
    if (selectedIds.size > 0) {
      onArchiveMultipleEmails(Array.from(selectedIds));
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [selectedIds, onArchiveMultipleEmails]);

  const handleAiSelected = useCallback(() => {
    if (selectedIds.size > 0 && onAiReplyMultiple) {
      const selectedEmails = categoryFilteredEmails.filter(e => selectedIds.has(getEmailId(e)));
      onAiReplyMultiple(selectedEmails);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [selectedIds, categoryFilteredEmails, onAiReplyMultiple]);

  const allSelected = categoryFilteredEmails.length > 0 && selectedIds.size === categoryFilteredEmails.length;

  if (isLoading) {
    return <EmailListSkeleton />;
  }

  if (emails.length === 0 && !searchQuery && !hasActiveFilters) {
    return <EmailListEmpty hasConnectedAccount={hasConnectedAccount} onConnectAccount={onConnectAccount} />;
  }

  return (
    <div className="flex flex-col h-full overflow-x-hidden relative">
      {/* Search bar - sticky top on mobile with nav, floating on desktop */}
      <div className={`z-20 flex items-center ${screen.isMobile ? 'gap-2 absolute top-2 left-0 right-0 px-3' : 'gap-2 absolute top-3 left-1/2 -translate-x-1/2'}`}>
        {screen.isMobile && mobileNavLeft}
        {!screen.isMobile && hasConnectedAccount && activeFolder === "inbox" && (
          <AiInboxRefreshButton onRefreshComplete={onInboxRefresh} />
        )}
        <div className={`relative ${screen.isMobile ? 'flex-1 min-w-0' : 'w-64'}`}>
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${screen.isMobile ? 'w-[18px] h-[18px]' : 'w-4 h-4'} text-muted-foreground/50 pointer-events-none z-10`} />
          <Input 
            type="search"
            placeholder={screen.isMobile ? "Search..." : "Search emails..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${screen.isMobile ? 'pl-10 pr-18 h-11' : 'pl-9 pr-16 h-10'} text-sm backdrop-blur-md bg-gray-100 border-gray-200 rounded-full placeholder:text-muted-foreground/50 focus:bg-white focus:border-primary/40 transition-all`}
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.1)"
            }}
            data-testid="input-search"
          />
          <div className={`absolute ${screen.isMobile ? 'right-2' : 'right-1.5'} top-1/2 transform -translate-y-1/2 flex items-center gap-1 z-10`}>
            {(hasActiveFilters || searchQuery) && (
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                {categoryFilteredEmails.length}
              </span>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={`${screen.isMobile ? 'w-7 h-7' : 'w-6 h-6'} flex items-center justify-center rounded-full backdrop-blur-sm bg-gray-200 border border-gray-300 hover:bg-gray-300 text-muted-foreground hover:text-foreground transition-all`}
                data-testid="button-clear-search"
              >
                <X className={`${screen.isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
              </button>
            )}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <button 
                  className={`group ${screen.isMobile ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center rounded-full hover:bg-white/10 dark:hover:bg-white/8 transition-all cursor-pointer`}
                  data-testid="button-filter"
                >
                  <SlidersHorizontal className={`${screen.isMobile ? 'w-[18px] h-[18px]' : 'w-4 h-4'} ${hasActiveFilters ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground/80'} transition-colors`} />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-64 p-0 border-0 shadow-xl overflow-hidden" 
                align="end"
                style={{
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)"
                }}
              >
                <div className="px-3 pt-2.5 pb-2 flex flex-wrap items-center justify-between gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-xs font-medium text-foreground/60">Filters</span>
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters}
                      className="text-[11px] text-foreground/35 hover:text-foreground/60 transition-colors cursor-pointer"
                      data-testid="button-clear-filters"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="px-3 py-2.5 space-y-3">
                  <button
                    onClick={() => setFilters(f => ({ ...f, unreadOnly: !f.unreadOnly }))}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: filters.unreadOnly ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                      border: filters.unreadOnly ? "1px solid rgba(59,130,246,0.2)" : "1px solid rgba(255,255,255,0.05)",
                    }}
                    data-testid="checkbox-unread-only"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-blue-400/70" />
                      <span className="text-xs text-foreground/70">Unread only</span>
                    </div>
                    <div 
                      className="w-4 h-4 rounded flex items-center justify-center transition-all"
                      style={{
                        background: filters.unreadOnly ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "rgba(255,255,255,0.06)",
                        border: filters.unreadOnly ? "none" : "1px solid rgba(255,255,255,0.1)"
                      }}
                    >
                      {filters.unreadOnly && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </button>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-foreground/40 px-0.5">Date</span>
                    <div className="grid grid-cols-4 gap-1">
                      {([
                        { value: "all", label: "All" },
                        { value: "today", label: "Today" },
                        { value: "week", label: "7d" },
                        { value: "month", label: "30d" },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFilters(f => ({ ...f, dateRange: option.value }))}
                          className="py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer"
                          style={{
                            background: filters.dateRange === option.value ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
                            border: filters.dateRange === option.value ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(255,255,255,0.05)",
                            color: filters.dateRange === option.value ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.45)",
                          }}
                          data-testid={`button-date-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-foreground/40 px-0.5">Sender</span>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/25 pointer-events-none" />
                      <input
                        placeholder="Filter sender..."
                        value={filters.sender}
                        onChange={(e) => setFilters(f => ({ ...f, sender: e.target.value }))}
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs text-foreground/70 placeholder:text-foreground/20 outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                        data-testid="input-filter-sender"
                      />
                    </div>
                    {uniqueSenders.length > 0 && !filters.sender && (
                      <div className="flex flex-wrap gap-1">
                        {uniqueSenders.slice(0, 4).map(([email, name]) => (
                          <button
                            key={email}
                            onClick={() => setFilters(f => ({ ...f, sender: name }))}
                            className="px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-all"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.45)",
                            }}
                            data-testid={`button-sender-${email}`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {screen.isMobile && (hasConnectedAccount && activeFolder === "inbox" || onOpenAssistant) && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-md cursor-pointer transition-all" style={{ background: "linear-gradient(145deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))", border: "1px solid rgba(129, 140, 248, 0.2)", boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.1)" }} data-testid="button-ai-mobile-menu">
                <Sparkles className="w-6 h-6 text-indigo-300/80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="dropdown-ai-mobile-menu">
              {onOpenAssistant && (
                <DropdownMenuItem onClick={onOpenAssistant} className="gap-2" data-testid="button-ai-chat-mobile">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  AI Chat
                </DropdownMenuItem>
              )}
              {hasConnectedAccount && activeFolder === "inbox" && (
                <AiInboxRefreshButton onRefreshComplete={onInboxRefresh} asMenuItem />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!screen.isMobile && onOpenAssistant && (
          <button
            onClick={onOpenAssistant}
            className="group w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-md cursor-pointer transition-all duration-150"
            style={{
              background: "linear-gradient(145deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))",
              border: "1px solid rgba(129, 140, 248, 0.25)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.1)"
            }}
            data-testid="button-ai-chat-search"
          >
            <Sparkles className="w-4 h-4 text-indigo-300/80 group-hover:text-indigo-200 transition-colors" />
          </button>
        )}
      </div>
      {/* Email list */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin relative pt-[52px]"
        onTouchStart={(e) => {
          if (scrollContainerRef.current?.scrollTop === 0) {
            setIsPulling(true);
          }
        }}
        onTouchMove={(e) => {
          if (isPulling && scrollContainerRef.current?.scrollTop === 0) {
            const touch = e.touches[0];
            const startY = (scrollContainerRef.current as any)._startY || touch.clientY;
            if (!(scrollContainerRef.current as any)._startY) {
              (scrollContainerRef.current as any)._startY = touch.clientY;
            }
            const distance = Math.max(0, Math.min(100, touch.clientY - startY));
            setPullDistance(distance);
          }
        }}
        onTouchEnd={() => {
          if (pullDistance >= pullThreshold && onRefresh && !isRefreshing) {
            onRefresh();
          }
          setPullDistance(0);
          setIsPulling(false);
          if (scrollContainerRef.current) {
            (scrollContainerRef.current as any)._startY = null;
          }
        }}
      >
        {(pullDistance > 0 || isRefreshing) && (
          <div 
            className="flex items-center justify-center py-3 transition-all"
            style={{ height: isRefreshing ? 48 : pullDistance * 0.6 }}
          >
            <Loader2 
              className={`w-5 h-5 text-primary ${isRefreshing || pullDistance >= pullThreshold ? 'animate-spin' : ''}`}
              style={{ 
                transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3.6}deg)`,
                opacity: Math.min(1, pullDistance / pullThreshold)
              }}
            />
          </div>
        )}
        {isSyncing && (
          <div className="flex items-center justify-center gap-2 py-1 px-3" data-testid="syncing-banner">
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground/60 animate-spin" />
            <span className="text-xs text-muted-foreground/60">Checking for new emails...</span>
          </div>
        )}
        {categoryFilteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-8">
            <Search className="w-10 h-10 text-muted-foreground/40 mb-4" />
            <h3 className="font-medium text-sm mb-1">No emails found</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {searchQuery ? `No results for "${searchQuery}"` : activeCategory ? `No ${activeCategory} emails` : "Try adjusting your filters"}
            </p>
            {(hasActiveFilters || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
                data-testid="button-clear-filters-empty"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
        <div className="p-3" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {categoryFilteredEmails.map((email) => {
          const emailId = getEmailId(email);
          const isSelected = getEmailId(email) === selectedEmailId;
          const isChecked = selectedIds.has(emailId);

          return (
            <div 
              key={emailId}
              ref={(el) => registerEmailRef(emailId, el)}
            >
              <SwipeableEmailItem
                emailId={emailId}
                sender={email.sender}
                senderEmail={email.senderEmail}
                subject={email.subject}
                preview={email.preview || ""}
                receivedAt={(email.receivedAt || new Date()).toString()}
                isRead={email.isRead}
                isStarred={email.isStarred}
                isSelected={isSelected}
                isChecked={isChecked}
                isSelectionMode={isSelectionMode}
                avatarColor={email.avatarColor || undefined}
                folder={activeFolder}
                threadCount={email.threadCount || 1}
                isTrashFolder={isTrashFolder}
                onSelect={() => handleEmailClick(email)}
                onArchive={() => onArchiveSingleEmail(emailId)}
                onDelete={() => onTrashSingleEmail(emailId)}
                onPermanentDelete={onPermanentDeleteSingleEmail ? () => onPermanentDeleteSingleEmail(emailId) : undefined}
                onRestore={onRestoreSingleEmail ? () => onRestoreSingleEmail(emailId) : undefined}
                onToggleStar={() => onToggleStar(emailId)}
                isFlagged={email.isFlagged || false}
                onToggleFlag={onToggleFlag ? () => onToggleFlag(emailId) : undefined}
                onReply={onReplyEmail ? () => onReplyEmail(email) : undefined}
                onReplyAll={onReplyEmail ? () => onReplyEmail(email) : undefined}
                onForward={onForwardEmail ? () => onForwardEmail(email) : undefined}
                onMoveToFolder={onMoveToFolder ? () => onMoveToFolder(emailId) : undefined}
                onMarkUnread={onMarkUnread ? () => onMarkUnread(emailId) : undefined}
                onLongPressStart={() => handleLongPressStart(emailId)}
                onLongPressEnd={handleLongPressEnd}
                onMouseEnterWhileDragging={() => handleMouseEnterWhileDragging(emailId)}
                formatTime={formatEmailTime}
              />
            </div>
          );
        })}
        </div>
        )}
      </div>

      {isSelectionMode ? (
        <div 
          className="mx-3 mb-2 px-3 py-2 flex flex-wrap items-center gap-2 rounded-full backdrop-blur-2xl border border-gray-200"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.12), 0 4px 16px rgba(0,0,0,0.15)"
          }}
        >
          <button 
            className="w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-sm bg-gray-100 border border-gray-200 hover:bg-gray-200 text-foreground/70 hover:text-foreground transition-all cursor-pointer"
            onClick={handleCancelSelection}
            data-testid="button-cancel-selection"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm text-foreground/60 font-medium tabular-nums ml-1">
            {selectedIds.size}
          </span>
          <span className="flex-1" />
          <button
            className="h-8 px-3 rounded-full backdrop-blur-sm bg-gray-100 border border-gray-200 hover:bg-gray-200 text-xs font-medium text-foreground/70 hover:text-foreground transition-all cursor-pointer"
            onClick={handleSelectAll}
            data-testid="button-select-all"
          >
            {allSelected ? "Deselect" : "All"}
          </button>
          <div className="flex items-center gap-1.5">
            <button 
              className="w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-sm bg-gray-100 border border-gray-200 hover:bg-gray-200 text-foreground/70 hover:text-foreground transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleArchiveSelected}
              disabled={selectedIds.size === 0 || isMoving}
              data-testid="button-archive-selected"
            >
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            </button>
            <button 
              className="w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-sm bg-red-500/15 dark:bg-red-500/10 border border-red-500/25 dark:border-red-500/15 hover:bg-red-500/25 dark:hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleTrashSelected}
              disabled={selectedIds.size === 0 || isMoving}
              data-testid="button-delete-selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button 
            className="w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-sm bg-primary/15 dark:bg-primary/10 border border-primary/25 dark:border-primary/15 hover:bg-primary/25 dark:hover:bg-primary/20 text-primary hover:text-primary transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={selectedIds.size === 0}
            onClick={handleAiSelected}
            data-testid="button-ai-selected"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="absolute bottom-4 right-4">
          <button 
            className="group rounded-full w-16 h-16 flex items-center justify-center backdrop-blur-sm bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.1)"
            }}
            onClick={onCompose}
            data-testid="button-compose"
          >
            <PenSquare className="w-6 h-6 text-foreground/60 group-hover:text-foreground/80 transition-colors" />
          </button>
        </div>
      )}
    </div>
  );
}
