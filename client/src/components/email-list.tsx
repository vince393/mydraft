import { useState, useRef, useCallback, useMemo } from "react";
import { format, isToday, isYesterday, subDays, isAfter } from "date-fns";
import { Star, Sparkles, Loader2, Archive, Trash2, Clock, Search, SlidersHorizontal, X, Check, Mail, Calendar, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Email } from "@shared/schema";

interface EmailWithNylasId extends Email {
  nylasId?: string;
}

function getEmailId(email: EmailWithNylasId): string | number {
  return email.nylasId || email.id;
}

function getAvatarUrl(email: string, name: string): string {
  const seed = encodeURIComponent(email || name);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=3b82f6,8b5cf6,ec4899,f97316,84cc16,06b6d4,10b981`;
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
  selectedEmailId: number | null;
  onSelectEmail: (email: EmailWithNylasId) => void;
  onAiReply: () => void;
  onTrashEmail: () => void;
  onArchiveEmail: () => void;
  onTrashMultipleEmails: (emailIds: (string | number)[]) => void;
  onArchiveMultipleEmails: (emailIds: (string | number)[]) => void;
  onToggleStar: (emailId: string | number) => void;
  isAiLoading?: boolean;
  isMoving?: boolean;
  isLoading?: boolean;
  activeFolder?: string;
}

interface ResponseTimeEstimate {
  estimatedMinutes: number;
  unreadCount: number;
  totalWords: number;
  message?: string;
}

function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-xl animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-muted/50" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-28 bg-muted/50 rounded-full" />
                <div className="h-3 w-14 bg-muted/50 rounded-full" />
              </div>
              <div className="h-4 w-48 bg-muted/50 rounded-full" />
              <div className="h-3 w-full bg-muted/50 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/80 to-muted/30 flex items-center justify-center mb-6">
        <svg className="w-9 h-9 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-medium text-xl mb-2 tracking-tight">No emails yet</h3>
      <p className="text-sm text-muted-foreground">Your inbox is empty</p>
    </div>
  );
}

interface Filters {
  unreadOnly: boolean;
  dateRange: "all" | "today" | "week" | "month";
  sender: string;
}

export function EmailList({ emails, selectedEmailId, onSelectEmail, onAiReply, onTrashEmail, onArchiveEmail, onTrashMultipleEmails, onArchiveMultipleEmails, onToggleStar, isAiLoading, isMoving, isLoading, activeFolder = "inbox" }: EmailListProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    unreadOnly: false,
    dateRange: "all",
    sender: "",
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
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
    if (selectedIds.size === filteredEmails.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(filteredEmails.map(e => getEmailId(e))));
    }
  }, [selectedIds.size, filteredEmails]);

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

  const allSelected = filteredEmails.length > 0 && selectedIds.size === filteredEmails.length;

  if (isLoading) {
    return <EmailListSkeleton />;
  }

  if (emails.length === 0 && !searchQuery && !hasActiveFilters) {
    return <EmailListEmpty />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/30">
        <div className="relative flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input 
              type="search"
              placeholder="Search emails..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-0 h-10 rounded-xl focus:bg-muted/50 transition-colors"
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className={`h-10 w-10 rounded-xl transition-colors ${hasActiveFilters ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="button-filter"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filters</h4>
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      data-testid="button-clear-filters"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="unread-only" 
                    checked={filters.unreadOnly}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, unreadOnly: !!checked }))}
                    data-testid="checkbox-unread-only"
                  />
                  <Label htmlFor="unread-only" className="text-sm flex items-center gap-2 cursor-pointer">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Unread only
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
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
                  <Label className="text-sm flex items-center gap-2">
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
                        <button
                          key={email}
                          onClick={() => setFilters(f => ({ ...f, sender: name }))}
                          className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors truncate max-w-[120px]"
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
        {(hasActiveFilters || searchQuery) && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">
              {filteredEmails.length} result{filteredEmails.length !== 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-all-filters"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/40 backdrop-blur-sm rounded-md border border-blue-800/30">
          <Clock className="w-3.5 h-3.5 text-blue-400/80" />
          <span className="text-sm text-blue-100/80">
            {isLoadingTime ? (
              "Calculating..."
            ) : responseTime?.message ? (
              responseTime.message
            ) : responseTime?.estimatedMinutes ? (
              `Est. response time: ${responseTime.estimatedMinutes} min`
            ) : (
              "Est. response time: --"
            )}
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-8">
            <Search className="w-10 h-10 text-muted-foreground/40 mb-4" />
            <h3 className="font-medium text-sm mb-1">No emails found</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {searchQuery ? `No results for "${searchQuery}"` : "Try adjusting your filters"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
              data-testid="button-clear-filters-empty"
            >
              Clear filters
            </Button>
          </div>
        ) : (
        <div className="space-y-0.5 p-3">
        {filteredEmails.map((email) => {
          const emailId = getEmailId(email);
          const isSelected = email.id === selectedEmailId;
          const isChecked = selectedIds.has(emailId);
          const initials = email.sender
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={emailId}
              onClick={() => handleEmailClick(email)}
              onMouseDown={() => handleLongPressStart(emailId)}
              onMouseUp={handleLongPressEnd}
              onMouseEnter={() => handleMouseEnterWhileDragging(emailId)}
              onTouchStart={() => handleLongPressStart(emailId)}
              onTouchEnd={handleLongPressEnd}
              className={`
                group relative py-4 pl-4 pr-2 rounded-xl cursor-pointer
                transition-all duration-200 ease-out select-none
                ${isSelectionMode && isChecked
                  ? "bg-primary/20 ring-1 ring-primary/50"
                  : isSelected 
                    ? "bg-primary/10 ring-1 ring-primary/30" 
                    : "hover:bg-muted/50"
                }
              `}
              data-testid={`email-item-${emailId}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-11 h-11 ring-2 ring-border/30">
                    <AvatarImage 
                      src={getAvatarUrl(email.senderEmail, email.sender)} 
                      alt={email.sender}
                    />
                    <AvatarFallback 
                      style={{ backgroundColor: email.avatarColor }}
                      className="text-white text-sm font-medium"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!email.isRead && !isSelectionMode && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                  )}
                  {isSelectionMode && isChecked && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary ring-2 ring-background flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="grid grid-cols-[60%_auto_auto] items-center gap-1 mb-1 min-w-0">
                    <div className={`block text-sm truncate min-w-0 ${!email.isRead ? "font-semibold" : "font-medium text-foreground/90"}`}>
                      {email.sender}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatEmailTime(new Date(email.receivedAt))}
                    </div>
                    <button 
                      className={`
                        p-1 rounded-lg transition-all duration-200
                        ${email.isStarred 
                          ? "opacity-100 text-yellow-400" 
                          : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400"
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(emailId);
                      }}
                      data-testid={`star-email-${emailId}`}
                    >
                      <Star className={`w-4 h-4 ${email.isStarred ? "fill-current" : ""}`} />
                    </button>
                  </div>
                  
                  <h4 className={`text-sm truncate mb-1.5 ${!email.isRead ? "font-medium" : "text-foreground/80"}`}>
                    {email.subject}
                  </h4>
                  
                  <p className="text-xs text-muted-foreground/80 line-clamp-1">
                    {email.preview}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-border/30 bg-background/95 backdrop-blur-xl">
        {isSelectionMode ? (
          <div className="flex items-center gap-2">
            <Button 
              size="icon"
              variant="ghost"
              onClick={handleCancelSelection}
              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
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
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-select-all"
            >
              {allSelected ? "Deselect" : "All"}
            </Button>
            <div className="flex items-center">
              <Button 
                size="icon"
                variant="ghost"
                onClick={handleArchiveSelected}
                disabled={selectedIds.size === 0 || isMoving}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
                data-testid="button-archive-selected"
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                onClick={handleTrashSelected}
                disabled={selectedIds.size === 0 || isMoving}
                className="h-10 w-10 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10"
                data-testid="button-delete-selected"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              size="icon"
              variant="ghost"
              disabled={selectedIds.size === 0}
              className="h-10 w-10 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              data-testid="button-ai-selected"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Button 
                size="icon"
                variant="ghost"
                disabled={!selectedEmailId || isMoving}
                onClick={onArchiveEmail}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
                data-testid="button-archive"
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              </Button>
              <Button 
                size="icon"
                variant="ghost"
                disabled={!selectedEmailId || isMoving}
                onClick={onTrashEmail}
                className="h-10 w-10 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10"
                data-testid="button-trash"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              onClick={onAiReply}
              disabled={!selectedEmailId || isAiLoading}
              className="flex-1 gap-2 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 transition-all"
              data-testid="button-ai-reply"
            >
              {isAiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Draft with AI
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
