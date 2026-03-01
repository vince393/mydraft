import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isCategoryFolder } from "@/lib/email-categories";
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
import { Settings, LogOut, User, Mail, Crown, Link, ArrowLeft, RefreshCw, Megaphone, Menu } from "lucide-react";
import { SiGmail } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { useScreenSize } from "@/hooks/use-screen-size";
import { NotificationBell } from "@/components/notification-bell";
import { AccountSwitcher } from "@/components/account-switcher";
import { useSidebar } from "@/components/ui/sidebar";
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
  onFolderChange?: (folder: string) => void;
  showComposeDialog: boolean;
  setShowComposeDialog: (show: boolean) => void;
  composeMode: "new" | "reply" | "replyAll" | "forward";
  setComposeMode: (mode: "new" | "reply" | "replyAll" | "forward") => void;
  onOpenAssistant?: () => void;
  onCompose?: () => void;
  isAIChatEnabled?: boolean;
}

function getEmailId(email: EmailWithNylasId): string | number {
  return email.nylasId || email.id;
}

export default function Inbox({ activeFolder, onFolderChange, showComposeDialog, setShowComposeDialog, composeMode, setComposeMode, onOpenAssistant, onCompose, isAIChatEnabled = true }: InboxProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | number | null>(null);
  const [selectedThreadEmails, setSelectedThreadEmails] = useState<EmailWithNylasId[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showMultiEmailModal, setShowMultiEmailModal] = useState(false);
  const [multiEmailSelection, setMultiEmailSelection] = useState<EmailWithNylasId[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [hidingDetail, setHidingDetail] = useState(false);
  const [optimisticStars, setOptimisticStars] = useState<Map<string | number, boolean>>(new Map());
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string | number>>(new Set());
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasPro, hasPremium } = usePlan();
  const screen = useScreenSize();
  const { toggleSidebar } = useSidebar();

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
      case "premium":
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

  // Check if we're viewing a custom folder or category folder
  const isCustomFolder = activeFolder.startsWith("custom-");
  const customFolderId = isCustomFolder ? parseInt(activeFolder.replace("custom-", "")) : null;
  const isCategoryView = isCategoryFolder(activeFolder);
  const effectiveFolder = isCategoryView ? "inbox" : activeFolder;

  // Validate custom folder still exists - redirect to inbox if deleted
  interface FoldersResponse { folders: { id: number; title: string; }[]; }
  const { data: foldersData } = useQuery<FoldersResponse>({
    queryKey: ["/api/folders"],
    enabled: isCustomFolder,
  });

  useEffect(() => {
    if (isCustomFolder && customFolderId && foldersData?.folders) {
      const folderExists = foldersData.folders.some(f => f.id === customFolderId);
      if (!folderExists) {
        onFolderChange?.("inbox");
      }
    }
  }, [isCustomFolder, customFolderId, foldersData, onFolderChange]);

  // Step 1: Fetch cached emails from DB for instant display
  const { data: cachedEmails = [], isFetching: isFetchingCached, isSuccess: hasCachedData } = useQuery<EmailWithNylasId[]>({
    queryKey: ["/api/emails", "cached"],
    queryFn: async () => {
      const response = await fetch(`/api/emails?allFolders=true&cached=true`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userData?.user && !isCustomFolder,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Step 2: Fetch fresh emails from provider in background
  const { data: freshEmails, isFetching: isFetchingFresh, isSuccess: hasFreshData, isLoading: isFreshInitialLoading } = useQuery<EmailWithNylasId[]>({
    queryKey: ["/api/emails", "fresh"],
    queryFn: async () => {
      const response = await fetch(`/api/emails?allFolders=true`);
      if (!response.ok) throw new Error("Failed to fetch emails");
      return response.json();
    },
    enabled: !!userData?.user && !isCustomFolder,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    retry: 2,
    retryDelay: 500,
  });
  
  // Show fresh emails once available, otherwise show cached
  const allEmails = hasFreshData && freshEmails ? freshEmails : cachedEmails;
  
  // Show loading skeleton when:
  // 1. Neither cache nor fresh data has resolved yet
  // 2. Cache is empty (no cached emails) and fresh data hasn't arrived yet
  const isLoadingEmails = (!hasCachedData && !hasFreshData) || 
                          (cachedEmails.length === 0 && !hasFreshData);
  
  // Show subtle syncing banner when we have cached data displaying and are fetching fresh
  const isSyncing = isFetchingFresh && cachedEmails.length > 0 && !isLoadingEmails;

  useEffect(() => {
    if (!isFetchingFresh && isManualRefresh) {
      setIsManualRefresh(false);
    }
  }, [isFetchingFresh, isManualRefresh]);

  // Fetch emails from custom folder when viewing a custom folder
  const { data: customFolderData, isLoading: isLoadingCustomFolder } = useQuery<{ emails: EmailWithNylasId[] }>({
    queryKey: ["/api/folders", customFolderId, "emails"],
    queryFn: async () => {
      const response = await fetch(`/api/folders/${customFolderId}/emails`);
      if (!response.ok) throw new Error("Failed to fetch folder emails");
      return response.json();
    },
    enabled: !!userData?.user && isCustomFolder && !!customFolderId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
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
      const emailFolder = email.folder || "inbox";
      const matchesFolder = emailFolder === effectiveFolder || 
        (effectiveFolder === "inbox" && emailFolder === "inbox");
      
      if (matchesFolder && email.threadId && !seenThreadIds.has(email.threadId)) {
        const threadEmails = threadMap.get(email.threadId);
        if (threadEmails && threadEmails.length > 0) {
          filteredThreads.push(threadEmails);
          seenThreadIds.add(email.threadId);
        }
      }
    }
    
    for (const email of noThreadEmails) {
      const emailFolder = email.folder || "inbox";
      if (emailFolder === effectiveFolder) {
        filteredThreads.push([email]);
      }
    }
    
    const getRepresentative = (thread: EmailWithNylasId[]) => {
      const folderEmails = thread.filter(e => (e.folder || "inbox") === effectiveFolder);
      if (folderEmails.length > 0) {
        return folderEmails.reduce((latest, e) => 
          new Date(e.receivedAt).getTime() > new Date(latest.receivedAt).getTime() ? e : latest
        );
      }
      return thread[0];
    };
    
    filteredThreads.sort((a, b) => 
      new Date(getRepresentative(b).receivedAt).getTime() - new Date(getRepresentative(a).receivedAt).getTime()
    );
    
    const flatEmails = filteredThreads.map(thread => {
      const folderEmails = thread.filter(e => (e.folder || "inbox") === effectiveFolder);
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
  }, [emailsSource, effectiveFolder, isCustomFolder]);

  useEffect(() => {
    setSelectedEmailId(null);
    setSelectedThreadEmails([]);
    setGeneratedDraft(null);
    setShowDetail(false);
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


  const handleMarkUnread = async (emailId: string | number) => {
    try {
      await apiRequest("PATCH", `/api/emails/${emailId}/unread`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      queryClient.invalidateQueries({ queryKey: ["/api/emails/unread-counts"] });
      toast({ title: "Marked as unread" });
    } catch (error) {
      console.error("Failed to mark as unread:", error);
      toast({ title: "Failed to mark as unread", variant: "destructive" });
    }
  };

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
      setOptimisticRemovals(prev => new Set(prev).add(emailId));
      setSelectedEmailId(null);
      setShowDetail(false);
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
    setShowDetail(true);
    threadEmails.forEach(threadEmail => {
      if (!threadEmail.isRead) {
        markAsReadMutation.mutate(getEmailId(threadEmail));
      }
    });
  };

  const handleBackToList = () => {
    if (screen.isMobile) {
      setHidingDetail(true);
      setTimeout(() => {
        setShowDetail(false);
        setHidingDetail(false);
        setSelectedEmailId(null);
      }, 220);
    } else {
      setShowDetail(false);
      setSelectedEmailId(null);
    }
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
    if (selectedEmail) {
      const emailId = getEmailId(selectedEmail);
      moveEmailMutation.mutate({ emailId, folder: "trash", previousFolder: activeFolder });
    }
  };

  const handleArchiveEmail = () => {
    if (selectedEmail) {
      const emailId = getEmailId(selectedEmail);
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
    setOptimisticRemovals(prev => new Set(prev).add(emailId));
    setSelectedEmailId(null);
    setShowDetail(false);
    
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
      {/* Email List Panel - hidden when viewing email detail */}
      <div className={`email-list-panel overflow-x-hidden ${showDetail ? 'hide-for-detail' : ''}`}>
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
            onMarkUnread={handleMarkUnread}
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
              setIsManualRefresh(true);
              queryClient.refetchQueries({ queryKey: ["/api/emails", "fresh"] });
              queryClient.refetchQueries({ queryKey: ["/api/emails/unread-counts"] });
            }}
            isRefreshing={isManualRefresh && isFetchingFresh}
            onCompose={onCompose}
            onOpenAssistant={onOpenAssistant}
            mobileNavLeft={
              <button
                onClick={toggleSidebar}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-md cursor-pointer transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.1)"
                }}
                data-testid="button-sidebar-toggle"
              >
                <Menu className="w-6 h-6 text-foreground/80" />
              </button>
            }
          />
        )}
      </div>
      
      {/* Email Detail Panel - split view on tablet/desktop, slide-over on mobile */}
      {(showDetail || hidingDetail || screen.isTablet || screen.isDesktop) && (
        <div className={`email-detail-panel ${showDetail && !hidingDetail ? 'show-detail' : ''} ${hidingDetail ? 'hide-detail' : ''}`}>
          {selectedEmailId ? (
            <>
              <header className={`flex items-center justify-between gap-2 ${screen.isMobile ? 'h-12 px-3' : 'h-14 px-4 sm:px-6'} border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50 flex-shrink-0`}>
                {screen.isMobile && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleBackToList}
                    className="flex-shrink-0"
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
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
                  <NotificationBell />
                </div>
              </header>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <EmailDetail 
                  email={selectedEmail ?? null}
                  threadEmails={selectedThreadEmails}
                  currentUserEmail={currentUserEmail}
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-[280px]">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/20 flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-7 h-7 text-muted-foreground/25" />
                </div>
                <p className="text-sm font-medium text-muted-foreground/40 mb-1">No email selected</p>
                <p className="text-xs text-muted-foreground/25 leading-relaxed">Choose an email from the list to read, reply, or draft a response</p>
              </div>
            </div>
          )}
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

      <AccountSwitcher
        open={showAccountSwitcher}
        onOpenChange={setShowAccountSwitcher}
      />
    </div>
  );
}
