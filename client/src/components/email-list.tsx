import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { format, isToday, isYesterday, subDays, isAfter } from "date-fns";
import { Star, Sparkles, Loader2, Archive, Trash2, Clock, Search, SlidersHorizontal, X, Check, Mail, Calendar, User, Link, Wand2, PenSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SwipeableEmailItem } from "@/components/swipeable-email-item";
import { AiInboxRefreshButton } from "@/components/ai-inbox-refresh";
import { categorizeEmail, getCategoryFromFolder, type EmailCategory } from "@/lib/email-categories";
import type { Email } from "@shared/schema";

interface EmailWithNylasId extends Email {
  nylasId?: string;
  threadCount?: number;
  threadEmails?: EmailWithNylasId[];
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

export function EmailList({ emails, selectedEmailId, onSelectEmail, onAiReply, onAiReplyMultiple, onTrashEmail, onArchiveEmail, onTrashMultipleEmails, onArchiveMultipleEmails, onToggleStar, onToggleFlag, onTrashSingleEmail, onArchiveSingleEmail, onRestoreSingleEmail, onPermanentDeleteSingleEmail, onMoveToFolder, onMarkUnread, onReplyEmail, onForwardEmail, isAiLoading, isMoving, isLoading, isSyncing, activeFolder = "inbox", hasConnectedAccount = true, onConnectAccount, onInboxRefresh, onRefresh, isRefreshing, onCompose, onOpenAssistant }: EmailListProps) {
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
      setSelectedIds(new Set([emailId]));
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
      {/* Floating search bar overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {hasConnectedAccount && activeFolder === "inbox" && (
          <AiInboxRefreshButton onRefreshComplete={onInboxRefresh} />
        )}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
          <Input 
            type="search"
            placeholder="Search emails..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-9 pr-16 backdrop-blur-md bg-white/8 dark:bg-white/5 border-white/25 dark:border-white/15 h-9 rounded-full text-sm placeholder:text-muted-foreground/50 focus:bg-white/12 dark:focus:bg-white/8 focus:border-white/35 dark:focus:border-white/20 transition-all`}
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.1)"
            }}
            data-testid="input-search"
          />
          <div className="absolute right-1.5 top-1/2 transform -translate-y-1/2 flex items-center gap-1 z-10">
            {(hasActiveFilters || searchQuery) && (
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                {categoryFilteredEmails.length}
              </span>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="w-5 h-5 flex items-center justify-center rounded-full backdrop-blur-sm bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/15 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                data-testid="button-clear-search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="group w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 dark:hover:bg-white/8 transition-all cursor-pointer"
                  data-testid="button-filter"
                >
                  <SlidersHorizontal className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground/80'} transition-colors`} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">Filters</h4>
                    {hasActiveFilters && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        data-testid="button-clear-filters"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center space-x-2">
                    <Checkbox 
                      id="unread-only" 
                      checked={filters.unreadOnly}
                      onCheckedChange={(checked) => setFilters(f => ({ ...f, unreadOnly: !!checked }))}
                      data-testid="checkbox-unread-only"
                    />
                    <Label htmlFor="unread-only" className="text-sm flex flex-wrap items-center gap-2 cursor-pointer">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Unread only
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm flex flex-wrap items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Date range
                    </Label>
                    <Select 
                      value={filters.dateRange} 
                      onValueChange={(value: "all" | "today" | "week" | "month") => setFilters(f => ({ ...f, dateRange: value }))}
                    >
                      <SelectTrigger className="w-full h-9" data-testid="select-date-range">
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm flex flex-wrap items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Sender
                    </Label>
                    <Input
                      placeholder="Filter by sender..."
                      value={filters.sender}
                      onChange={(e) => setFilters(f => ({ ...f, sender: e.target.value }))}
                      className="h-9"
                      data-testid="input-filter-sender"
                    />
                    {uniqueSenders.length > 0 && !filters.sender && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {uniqueSenders.slice(0, 5).map(([email, name]) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            onClick={() => setFilters(f => ({ ...f, sender: name }))}
                            className="cursor-pointer text-xs truncate max-w-[120px]"
                            data-testid={`button-sender-${email}`}
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {onOpenAssistant && (
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
      {/* Email list with top padding for floating search */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin relative pt-16"
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
        <div className="space-y-0.5 p-3">
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
        {isSyncing && (
          <div className="flex items-center justify-center gap-2 py-4 px-3" data-testid="updating-indicator">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            <span className="text-xs text-muted-foreground">Checking for new emails...</span>
          </div>
        )}
        </div>
        )}
      </div>

      {isSelectionMode ? (
        <div className="px-3 py-2 flex flex-wrap items-center gap-2">
          <Button 
            size="icon"
            variant="ghost"
            onClick={handleCancelSelection}
            data-testid="button-cancel-selection"
          >
            <X className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedIds.size}
          </span>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSelectAll}
            data-testid="button-select-all"
          >
            {allSelected ? "Deselect" : "All"}
          </Button>
          <div className="flex flex-wrap items-center">
            <Button 
              size="icon"
              variant="ghost"
              onClick={handleArchiveSelected}
              disabled={selectedIds.size === 0 || isMoving}
              data-testid="button-archive-selected"
            >
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            </Button>
            <Button 
              size="icon"
              variant="destructive"
              onClick={handleTrashSelected}
              disabled={selectedIds.size === 0 || isMoving}
              data-testid="button-delete-selected"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            size="icon"
            variant="default"
            disabled={selectedIds.size === 0}
            onClick={handleAiSelected}
            data-testid="button-ai-selected"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="absolute bottom-4 right-4">
          <button 
            className="group rounded-full w-14 h-14 flex items-center justify-center backdrop-blur-sm bg-white/5 dark:bg-white/[0.03] border border-white/20 dark:border-white/10 hover:bg-white/8 dark:hover:bg-white/5 hover:border-white/30 dark:hover:border-white/15 hover:scale-110 active:scale-95 active:bg-white/12 dark:active:bg-white/8 transition-all duration-150 cursor-pointer"
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.1)"
            }}
            onClick={onCompose}
            data-testid="button-compose"
          >
            <PenSquare className="w-5 h-5 text-foreground/60 group-hover:text-foreground/80 transition-colors" />
          </button>
        </div>
      )}
    </div>
  );
}
