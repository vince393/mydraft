import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EmailList } from "@/components/email-list";
import { EmailDetail } from "@/components/email-detail";
import { AIDraftDialog } from "@/components/ai-draft-dialog";
import { DraftsList } from "@/components/drafts-list";
import { MultiEmailResponseModal } from "@/components/multi-email-response-modal";
import { ComposeDialog } from "@/components/compose-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, Mail, Crown, Link, ArrowLeft, RefreshCw, Megaphone } from "lucide-react";
import { SiGmail } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { useScreenSize } from "@/hooks/use-screen-size";
import { NotificationBell } from "@/components/notification-bell";
import type { Email, Draft } from "@shared/schema";

interface EmailWithNylasId extends Email {
  nylasId?: string;
  to?: string[];
  cc?: string[];
  threadCount?: number;
  threadEmails?: EmailWithNylasId[];
}

interface InboxProps {
  activeFolder: string;
  showComposeDialog: boolean;
  setShowComposeDialog: (show: boolean) => void;
  composeMode: "new" | "reply" | "replyAll" | "forward";
  setComposeMode: (mode: "new" | "reply" | "replyAll" | "forward") => void;
}

function getEmailId(email: EmailWithNylasId): string | number {
  return email.nylasId || email.id;
}

export default function Inbox({ activeFolder, showComposeDialog, setShowComposeDialog, composeMode, setComposeMode }: InboxProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | number | null>(null);
  const [selectedThreadEmails, setSelectedThreadEmails] = useState<EmailWithNylasId[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showMultiEmailModal, setShowMultiEmailModal] = useState(false);
  const [multiEmailSelection, setMultiEmailSelection] = useState<EmailWithNylasId[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [optimisticStars, setOptimisticStars] = useState<Map<string | number, boolean>>(new Map());
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string | number>>(new Set());
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasPro, hasPremium } = usePlan();
  const screen = useScreenSize();

  // Fetch current user info including connected email
  const { data: userData } = useQuery<{ user: { 
    email: string; 
    connectedEmail: string | null;
    connectedProvider: string | null;
    plan: string | null;
  } | null }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });
  
  const currentUserEmail = userData?.user?.connectedEmail || userData?.user?.email || "";
  const userEmail = userData?.user?.email || "";
  const userName = userEmail.split("@")[0] || "User";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const userPlan = userData?.user?.plan || "free";
  const connectedProvider = userData?.user?.connectedProvider;

  const getProviderIcon = () => {
    if (!connectedProvider) return null;
    const provider = connectedProvider.toLowerCase();
    if (provider === "google" || provider === "gmail") {
      return <SiGmail className="w-4 h-4 text-red-500" />;
    }
    if (provider === "microsoft" || provider === "outlook") {
      return <Mail className="w-4 h-4 text-blue-500" />;
    }
    return <Mail className="w-4 h-4 text-muted-foreground" />;
  };

  const getPlanBadge = () => {
    const badgeClass = "cursor-pointer hover:opacity-80 transition-opacity";
    switch (userPlan) {
      case "business":
        return (
          <Badge 
            className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-[10px] px-1.5 py-0 ${badgeClass}`}
            onClick={() => setLocation("/select-plan")}
            data-testid="badge-plan-business"
          >
            Business
          </Badge>
        );
      case "pro":
        return (
          <Badge 
            className={`bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 text-[10px] px-1.5 py-0 ${badgeClass}`}
            onClick={() => setLocation("/select-plan")}
            data-testid="badge-plan-pro"
          >
            Pro
          </Badge>
        );
      default:
        return (
          <Badge 
            variant="secondary" 
            className={`text-[10px] px-1.5 py-0 ${badgeClass}`}
            onClick={() => setLocation("/select-plan")}
            data-testid="badge-plan-free"
          >
            Free
          </Badge>
        );
    }
  };

  // Fetch full email details when an email is selected
  const { data: selectedEmail, isLoading: isLoadingEmail } = useQuery<EmailWithNylasId>({
    queryKey: ["/api/emails", selectedEmailId],
    queryFn: async () => {
      if (!selectedEmailId) return null;
      const response = await fetch(`/api/emails/${selectedEmailId}`);
      if (!response.ok) throw new Error("Failed to fetch email");
      return response.json();
    },
    enabled: !!selectedEmailId,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  // Check if we're viewing a custom folder
  const isCustomFolder = activeFolder.startsWith("custom-");
  const customFolderId = isCustomFolder ? parseInt(activeFolder.replace("custom-", "")) : null;

  // First, fetch cached emails for instant display (no loading state)
  const { data: cachedEmails = [], isSuccess: hasCachedData } = useQuery<EmailWithNylasId[]>({
    queryKey: ["/api/emails", "cached"],
    queryFn: async () => {
      const response = await fetch(`/api/emails?allFolders=true&cached=true`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userData?.user && !isCustomFolder,
    staleTime: Infinity,
    gcTime: Infinity, // Keep cached data forever in memory
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Then fetch fresh emails from Nylas in background
  const { data: freshEmails, isFetching: isFetchingFresh, isSuccess: hasFreshData } = useQuery<EmailWithNylasId[]>({
    queryKey: ["/api/emails", "fresh"],
    queryFn: async () => {
      const response = await fetch(`/api/emails?allFolders=true`);
      if (!response.ok) throw new Error("Failed to fetch emails");
      return response.json();
    },
    enabled: !!userData?.user && !isCustomFolder,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: 500,
  });
  
  // Always show cached emails immediately, replace with fresh when available
  const allEmails = hasFreshData && freshEmails ? freshEmails : cachedEmails;
  
  // Show updating indicator when we have cached data and are fetching fresh
  const isUpdating = isFetchingFresh && cachedEmails.length > 0;
  
  // Show loading if we have NO data and are still fetching
  const isLoadingEmails = cachedEmails.length === 0 && !freshEmails && isFetchingFresh;
  
  // Legacy syncing indicator (keep for compatibility but use isUpdating for new UI)
  const isSyncing = isUpdating && !isLoadingEmails;

  // Fetch emails from custom folder when viewing a custom folder
  const { data: customFolderData, isLoading: isLoadingCustomFolder } = useQuery<{ emails: EmailWithNylasId[] }>({
    queryKey: ["/api/folders", customFolderId, "emails"],
    queryFn: async () => {
      const response = await fetch(`/api/folders/${customFolderId}/emails`);
      if (!response.ok) throw new Error("Failed to fetch folder emails");
      return response.json();
    },
    enabled: !!userData?.user && isCustomFolder && !!customFolderId,
    staleTime: 10000,
    gcTime: 300000,
    refetchOnWindowFocus: true,
  });

  // Use custom folder emails when viewing a custom folder, otherwise use all emails
  const emailsSource = isCustomFolder ? (customFolderData?.emails || []) : allEmails;

  // Group emails by threadId and filter by active folder
  const { threads, emails } = useMemo(() => {
    // For custom folders, we don't need to filter - just display all emails from the folder
    if (isCustomFolder) {
      const customEmails = emailsSource.map(email => ({
        ...email,
        threadCount: 1,
        threadEmails: [email],
      }));
      // Sort by date (newest first)
      customEmails.sort((a, b) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
      return { threads: customEmails.map(e => [e]), emails: customEmails };
    }
    
    // Group all emails by threadId
    const threadMap = new Map<string, EmailWithNylasId[]>();
    const noThreadEmails: EmailWithNylasId[] = [];
    
    for (const email of emailsSource) {
      if (email.threadId) {
        const existing = threadMap.get(email.threadId) || [];
        existing.push(email);
        threadMap.set(email.threadId, existing);
      } else {
        noThreadEmails.push(email);
      }
    }
    
    // Sort emails within each thread by date (newest first)
    Array.from(threadMap.entries()).forEach(([threadId, threadEmails]) => {
      threadMap.set(threadId, threadEmails.sort((a: EmailWithNylasId, b: EmailWithNylasId) => 
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      ));
    });
    
    // Filter threads that have at least one email in the active folder
    const filteredThreads: EmailWithNylasId[][] = [];
    const seenThreadIds = new Set<string>();
    
    for (const email of allEmails) {
      // Check if this email's folder matches the active folder
      const emailFolder = email.folder || "inbox";
      const matchesFolder = emailFolder === activeFolder || 
        (activeFolder === "inbox" && emailFolder === "inbox");
      
      if (matchesFolder && email.threadId && !seenThreadIds.has(email.threadId)) {
        const threadEmails = threadMap.get(email.threadId);
        if (threadEmails && threadEmails.length > 0) {
          filteredThreads.push(threadEmails);
          seenThreadIds.add(email.threadId);
        }
      }
    }
    
    // Add non-threaded emails that match the folder
    for (const email of noThreadEmails) {
      const emailFolder = email.folder || "inbox";
      if (emailFolder === activeFolder) {
        filteredThreads.push([email]);
      }
    }
    
    // Get representative for sorting (most recent email in active folder)
    const getRepresentative = (thread: EmailWithNylasId[]) => {
      const folderEmails = thread.filter(e => (e.folder || "inbox") === activeFolder);
      if (folderEmails.length > 0) {
        return folderEmails.reduce((latest, e) => 
          new Date(e.receivedAt).getTime() > new Date(latest.receivedAt).getTime() ? e : latest
        );
      }
      return thread[0];
    };
    
    // Sort threads by the representative email date (most recent in active folder)
    filteredThreads.sort((a, b) => 
      new Date(getRepresentative(b).receivedAt).getTime() - new Date(getRepresentative(a).receivedAt).getTime()
    );
    
    // Create flattened email list for compatibility
    // Use the most recent email IN THE ACTIVE FOLDER as the representative
    const flatEmails = filteredThreads.map(thread => {
      // Find the most recent email that belongs to the active folder
      const folderEmails = thread.filter(e => (e.folder || "inbox") === activeFolder);
      // If we have emails in this folder, use the most recent one, otherwise fall back to thread[0]
      const representative = folderEmails.length > 0 
        ? folderEmails.reduce((latest, e) => 
            new Date(e.receivedAt).getTime() > new Date(latest.receivedAt).getTime() ? e : latest
          )
        : thread[0];
      
      return {
        ...representative,
        threadCount: thread.length,
        threadEmails: thread,
      };
    });
    
    return { threads: filteredThreads, emails: flatEmails };
  }, [emailsSource, activeFolder, isCustomFolder]);

  useEffect(() => {
    setSelectedEmailId(null);
    setSelectedThreadEmails([]);
    setGeneratedDraft(null);
    setShowMobileDetail(false);
  }, [activeFolder]);

  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: string | number) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/response-time", activeFolder] });
    },
  });


  const handleToggleStar = async (emailId: string | number) => {
    // Optimistically update UI
    setOptimisticStars(prev => {
      const newMap = new Map(prev);
      const email = emails.find(e => getEmailId(e) === emailId);
      const currentStarred = newMap.has(emailId) ? newMap.get(emailId)! : email?.isStarred || false;
      newMap.set(emailId, !currentStarred);
      return newMap;
    });
    // Persist to database
    try {
      await apiRequest("PATCH", `/api/emails/${emailId}/star`, {});
    } catch (error) {
      console.error("Failed to persist star:", error);
    }
  };

  const restoreEmailMutation = useMutation({
    mutationFn: async ({ emailId, folder }: { emailId: string | number; folder: string }) => {
      // Remove from optimistic removals immediately
      setOptimisticRemovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(emailId);
        return newSet;
      });
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/folder`, { folder });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore email");
      }
      return { emailId, folder };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      toast({
        title: "Email restored",
        duration: 3000,
      });
    },
    onError: (error: Error, variables) => {
      // Re-add to optimistic removals on error
      setOptimisticRemovals(prev => new Set(prev).add(variables.emailId));
      toast({
        title: "Failed to restore email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveEmailMutation = useMutation({
    mutationFn: async ({ emailId, folder, previousFolder, showUndo = true }: { emailId: string | number; folder: string; previousFolder?: string; showUndo?: boolean }) => {
      const response = await apiRequest("PATCH", `/api/emails/${emailId}/folder`, { folder });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move email");
      }
      const result = await response.json();
      return { ...result, emailId, folder, previousFolder, showUndo };
    },
    onMutate: async ({ emailId, folder, previousFolder, showUndo = true }) => {
      // Optimistically remove email from list immediately
      setOptimisticRemovals(prev => new Set(prev).add(emailId));
      setSelectedEmailId(null);
      setGeneratedDraft(null);
      
      // Show undo toast immediately
      if (showUndo && (folder === "trash" || folder === "archived")) {
        const actionLabel = folder === "trash" ? "deleted" : "archived";
        const undoFolder = previousFolder || "inbox";
        
        toast({
          title: `Email ${actionLabel}`,
          description: "Click undo to restore",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                restoreEmailMutation.mutate({ emailId, folder: undoFolder });
              }}
              data-testid="undo-email-action"
            >
              Undo
            </Button>
          ),
          duration: 5000,
        });
      }
      
      return { emailId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/response-time", activeFolder] });
    },
    onError: (error: Error, variables) => {
      // Remove from optimistic removals on error (show it again)
      setOptimisticRemovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.emailId);
        return newSet;
      });
      toast({
        title: "Failed to move email",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: (_, __, variables) => {
      // Clear from optimistic removals after cache invalidation
      setTimeout(() => {
        setOptimisticRemovals(prev => {
          const newSet = new Set(prev);
          newSet.delete(variables.emailId);
          return newSet;
        });
      }, 1000);
    },
  });

  const handleSelectEmail = (email: EmailWithNylasId) => {
    const emailId = getEmailId(email);
    setSelectedEmailId(emailId);
    const threadEmails = email.threadEmails || [email];
    setSelectedThreadEmails(threadEmails);
    setGeneratedDraft(null);
    if (screen.isMobile) {
      setShowMobileDetail(true);
    }
    // Mark all unread emails in the thread as read
    threadEmails.forEach(threadEmail => {
      if (!threadEmail.isRead) {
        markAsReadMutation.mutate(getEmailId(threadEmail));
      }
    });
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  const handleAiReply = () => {
    if (selectedEmail) {
      if (!hasPro) {
        setShowUpgradeModal(true);
      } else {
        setShowAiDialog(true);
      }
    }
  };

  const handleAiReplyMultiple = (selectedEmails: EmailWithNylasId[]) => {
    if (!hasPro) {
      setShowUpgradeModal(true);
    } else {
      setMultiEmailSelection(selectedEmails);
      setShowMultiEmailModal(true);
    }
  };

  const handleDraftAccepted = (draft: Draft) => {
    setGeneratedDraft(draft);
    queryClient.invalidateQueries({ queryKey: ["/api/drafts", selectedEmail?.id] });
  };

  const handleTrashEmail = () => {
    console.log("[DEBUG handleTrashEmail] selectedEmail:", selectedEmail);
    if (selectedEmail) {
      const emailId = getEmailId(selectedEmail);
      console.log("[DEBUG handleTrashEmail] calling mutation with emailId:", emailId);
      moveEmailMutation.mutate({ emailId, folder: "trash", previousFolder: activeFolder });
    }
  };

  const handleArchiveEmail = () => {
    console.log("[DEBUG handleArchiveEmail] selectedEmail:", selectedEmail);
    if (selectedEmail) {
      const emailId = getEmailId(selectedEmail);
      console.log("[DEBUG handleArchiveEmail] calling mutation with emailId:", emailId);
      moveEmailMutation.mutate({ emailId, folder: "archived", previousFolder: activeFolder });
    }
  };

  const handleTrashMultipleEmails = async (emailIds: (string | number)[]) => {
    for (const id of emailIds) {
      await moveEmailMutation.mutateAsync({ emailId: id, folder: "trash", previousFolder: activeFolder });
    }
  };

  const handleArchiveMultipleEmails = async (emailIds: (string | number)[]) => {
    for (const id of emailIds) {
      await moveEmailMutation.mutateAsync({ emailId: id, folder: "archived", previousFolder: activeFolder });
    }
  };

  const handleTrashSingleEmail = (emailId: string | number) => {
    moveEmailMutation.mutate({ emailId, folder: "trash", previousFolder: activeFolder });
  };

  const handleArchiveSingleEmail = (emailId: string | number) => {
    moveEmailMutation.mutate({ emailId, folder: "archived", previousFolder: activeFolder });
  };

  const handleRestoreSingleEmail = (emailId: string | number) => {
    restoreEmailMutation.mutate({ emailId, folder: "inbox" });
  };

  const handleReplyEmail = (email: EmailWithNylasId) => {
    handleSelectEmail(email);
  };

  const handleForwardEmail = (email: EmailWithNylasId) => {
    handleSelectEmail(email);
  };

  const handleMoveToFolder = (emailId: string | number) => {
    // Select the email so user can use move to folder in email detail
    const email = emails.find(e => getEmailId(e) === emailId);
    if (email) {
      handleSelectEmail(email);
    }
  };

  const handleToggleFlag = (emailId: string | number) => {
    // Flag feature - coming soon
    toast({
      title: "Coming soon",
      description: "Email flagging will be available soon",
      duration: 2000,
    });
  };

  const handlePermanentDeleteSingleEmail = async (emailId: string | number) => {
    // Optimistically remove from list
    setOptimisticRemovals(prev => new Set(prev).add(emailId));
    setSelectedEmailId(null);
    
    try {
      const response = await apiRequest("DELETE", `/api/emails/${emailId}`);
      if (!response.ok) {
        throw new Error("Failed to delete email permanently");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({
        title: "Email permanently deleted",
        duration: 3000,
      });
    } catch (error) {
      // Remove from optimistic removals on error
      setOptimisticRemovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(emailId);
        return newSet;
      });
      toast({
        title: "Failed to delete email",
        variant: "destructive",
      });
    }
  };

  const handleStarEmail = () => {
    if (selectedEmail) {
      handleToggleStar(getEmailId(selectedEmail));
    }
  };

  // Check if email detail is fully loaded (has to/cc arrays from server)
  const isEmailDetailReady = selectedEmail && !isLoadingEmail && Array.isArray(selectedEmail.to);

  const handleReply = () => {
    if (isEmailDetailReady) {
      setComposeMode("reply");
      setShowComposeDialog(true);
    }
  };

  const handleReplyAll = () => {
    if (isEmailDetailReady) {
      setComposeMode("replyAll");
      setShowComposeDialog(true);
    }
  };

  const handleForward = () => {
    if (isEmailDetailReady) {
      setComposeMode("forward");
      setShowComposeDialog(true);
    }
  };

  // When dialog opens from sidebar (without reply/forward context), reset to new mode
  useEffect(() => {
    if (showComposeDialog && composeMode !== "new" && !selectedEmail) {
      setComposeMode("new");
    }
  }, [showComposeDialog, composeMode, selectedEmail]);

  // Memoize compose email to prevent unnecessary re-renders and reinitializations
  const composeEmail = useMemo(() => {
    if (!selectedEmail || composeMode === "new") return undefined;
    return {
      id: String(getEmailId(selectedEmail)),
      subject: selectedEmail.subject,
      from: selectedEmail.sender,
      fromEmail: selectedEmail.senderEmail,
      to: selectedEmail.to || [],
      cc: selectedEmail.cc || [],
      body: selectedEmail.body,
      date: new Date(selectedEmail.receivedAt),
    };
  }, [selectedEmail, composeMode]);

  return (
    <div className="email-layout">
      {/* Email List Panel - hidden on mobile when viewing detail */}
      <div className={`email-list-panel overflow-x-hidden ${screen.isMobile && showMobileDetail ? 'hidden' : ''}`}>
        {/* Mobile header - only show on mobile in list view */}
        {screen.isMobile && !showMobileDetail && (
          <header className="flex items-center justify-between gap-2 h-14 px-4 border-b border-border/20 bg-background sticky top-0 z-50 flex-shrink-0">
            <h1 className="text-xl font-semibold capitalize tracking-tight">{activeFolder}</h1>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:opacity-80 transition-opacity outline-none" data-testid="button-profile-mobile">
                    <Avatar className="w-8 h-8 ring-2 ring-border/30">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b border-border/30">
                    <p className="text-sm font-medium truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    <div className="mt-2">{getPlanBadge()}</div>
                  </div>
                  <DropdownMenuItem className="gap-2" onClick={() => setLocation("/profile")}>
                    <User className="w-4 h-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={() => setLocation("/settings")}>
                    <Settings className="w-4 h-4" />
                    Settings
                  </DropdownMenuItem>
                  {hasPremium && (
                    <DropdownMenuItem className="gap-2" onClick={() => setLocation("/campaigns")} data-testid="menu-campaigns">
                      <Megaphone className="w-4 h-4" />
                      Email Campaigns
                    </DropdownMenuItem>
                  )}
                  {!userData?.user?.connectedEmail && (
                    <DropdownMenuItem className="gap-2" onClick={() => setLocation("/connect-email")}>
                      <Link className="w-4 h-4" />
                      Connect Email
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2" onClick={() => {
                    logoutMutation.mutate();
                  }} data-testid="menu-switch-account-mobile">
                    <RefreshCw className="w-4 h-4" />
                    Switch Account
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive" onClick={() => logoutMutation.mutate()}>
                    <LogOut className="w-4 h-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}
        
        {activeFolder.toLowerCase() === "drafts" ? (
          <DraftsList />
        ) : (
          <EmailList
            emails={emails
              .filter(email => !optimisticRemovals.has(getEmailId(email)))
              .map(email => {
                const emailId = getEmailId(email);
                if (optimisticStars.has(emailId)) {
                  return { ...email, isStarred: optimisticStars.get(emailId)! };
                }
                return email;
              })}
            selectedEmailId={selectedEmailId}
            onSelectEmail={handleSelectEmail}
            onAiReply={handleAiReply}
            onAiReplyMultiple={handleAiReplyMultiple}
            onTrashEmail={handleTrashEmail}
            onArchiveEmail={handleArchiveEmail}
            onTrashMultipleEmails={handleTrashMultipleEmails}
            onArchiveMultipleEmails={handleArchiveMultipleEmails}
            onToggleStar={handleToggleStar}
            onToggleFlag={handleToggleFlag}
            onTrashSingleEmail={handleTrashSingleEmail}
            onArchiveSingleEmail={handleArchiveSingleEmail}
            onRestoreSingleEmail={handleRestoreSingleEmail}
            onPermanentDeleteSingleEmail={handlePermanentDeleteSingleEmail}
            onMoveToFolder={handleMoveToFolder}
            onReplyEmail={handleReplyEmail}
            onForwardEmail={handleForwardEmail}
            isAiLoading={false}
            isMoving={moveEmailMutation.isPending}
            isLoading={isLoadingEmails || isLoadingCustomFolder}
            isSyncing={isSyncing}
            activeFolder={activeFolder}
            hasConnectedAccount={!!userData?.user?.connectedEmail}
            onConnectAccount={() => setLocation("/connect-email")}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/emails", "fresh"] });
            }}
            isRefreshing={isFetchingFresh}
          />
        )}
      </div>
      
      {/* Email Detail Panel - full screen overlay on mobile, side panel on desktop */}
      {(!screen.isMobile || showMobileDetail) && (
        <div className={`email-detail-panel ${screen.isMobile && showMobileDetail ? 'show-mobile' : ''}`}>
          <header className={`flex items-center justify-between gap-2 ${screen.isMobile ? 'h-12 px-3' : 'h-14 px-6'} border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0`}>
            {/* Mobile back button */}
            {screen.isMobile && showMobileDetail && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleBackToList}
                className="mr-auto"
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className={`flex items-center gap-2 ${screen.isMobile && showMobileDetail ? '' : 'ml-auto'}`}>
              {!userData?.user?.connectedEmail && !screen.isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setLocation("/connect-email")}
                  data-testid="button-connect-account"
                >
                  <Link className="w-4 h-4" />
                  Connect Account
                </Button>
              )}
              {!screen.isMobile && hasPremium && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 h-9"
                  onClick={() => setLocation("/campaigns")}
                  data-testid="button-campaigns-header"
                >
                  <Megaphone className="w-4 h-4" />
                  <span className="hidden lg:inline">Campaigns</span>
                </Button>
              )}
              {!screen.isMobile && <NotificationBell />}
              {!screen.isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover:opacity-80 transition-opacity outline-none" data-testid="button-profile">
                      <Avatar className="w-9 h-9 ring-2 ring-border/30">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-3 py-3 border-b border-border/30">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 ring-2 ring-border/30">
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-medium">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{userName}</p>
                          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                        </div>
                      </div>
                      {currentUserEmail && (
                        <div className="flex items-center gap-2 mt-3 px-2 py-1.5 rounded-md bg-muted/50">
                          {getProviderIcon()}
                          <span className="text-xs text-muted-foreground truncate flex-1">{currentUserEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {getPlanBadge()}
                      </div>
                    </div>
                    <DropdownMenuItem 
                      className="gap-2 mt-1" 
                      data-testid="menu-profile"
                      onClick={() => setLocation("/profile")}
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2" 
                      data-testid="menu-settings"
                      onClick={() => setLocation("/settings")}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="gap-2" 
                      data-testid="menu-switch-account"
                      onClick={() => logoutMutation.mutate()}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Switch Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 text-destructive" 
                      data-testid="menu-logout"
                      onClick={() => logoutMutation.mutate()}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
        <div className="flex-1 overflow-auto">
          <EmailDetail 
            email={selectedEmail ?? null}
            threadEmails={selectedThreadEmails}
            generatedDraft={generatedDraft} 
            onClearDraft={() => setGeneratedDraft(null)}
            onDraftUpdate={(draft) => setGeneratedDraft(draft)}
            isLoading={isLoadingEmail}
            onArchive={handleArchiveEmail}
            onTrash={handleTrashEmail}
            onStar={handleStarEmail}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            onAiDraft={handleAiReply}
            hasPro={hasPro}
            onUpgradeNeeded={() => setShowUpgradeModal(true)}
          />
        </div>
        </div>
      )}

      <AIDraftDialog
        email={selectedEmail ?? null}
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        onDraftAccepted={handleDraftAccepted}
      />

      <ComposeDialog
        open={showComposeDialog}
        onOpenChange={setShowComposeDialog}
        mode={composeMode}
        originalEmail={composeEmail}
        currentUserEmail={currentUserEmail}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        requiredPlan="pro"
        feature="AI Draft Generator"
      />

      <MultiEmailResponseModal
        emails={multiEmailSelection}
        open={showMultiEmailModal}
        onOpenChange={(open) => {
          setShowMultiEmailModal(open);
          if (!open) {
            setMultiEmailSelection([]);
          }
        }}
        onComplete={() => {
          setMultiEmailSelection([]);
          queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        }}
      />
    </div>
  );
}
