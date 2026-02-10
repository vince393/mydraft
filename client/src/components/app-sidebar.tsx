import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Inbox, Send, FileText, Trash2, PenSquare, FolderPlus, ChevronLeft, ChevronRight, Menu, Archive, AlertCircle, User, Lock, Pencil, Sparkles, Folder, Star, Heart, Bookmark, Flag, Tag, Zap, Bell, Mail, MessageSquare, Users, Briefcase, ShoppingCart, DollarSign, Calendar, Clock, Image as ImageIcon, MoreVertical, Megaphone, Settings, LogOut, RefreshCw, Link, Crown, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notification-bell";
import { AccountSwitcher } from "@/components/account-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmailCategory } from "@/lib/email-categories";
import { usePlan } from "@/hooks/use-plan";
import { UpgradeModal } from "./upgrade-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CustomFolder } from "@shared/schema";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

// Icon map for custom folder icons
const iconMap: Record<string, LucideIcon> = {
  folder: Folder,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  flag: Flag,
  tag: Tag,
  zap: Zap,
  bell: Bell,
  mail: Mail,
  message: MessageSquare,
  users: Users,
  briefcase: Briefcase,
  cart: ShoppingCart,
  dollar: DollarSign,
  calendar: Calendar,
  clock: Clock,
  image: ImageIcon,
  inbox: Inbox,
  send: Send,
  file: FileText,
  archive: Archive,
  trash: Trash2,
};

const availableIcons = [
  { name: "folder", icon: Folder },
  { name: "star", icon: Star },
  { name: "heart", icon: Heart },
  { name: "bookmark", icon: Bookmark },
  { name: "flag", icon: Flag },
  { name: "tag", icon: Tag },
  { name: "zap", icon: Zap },
  { name: "bell", icon: Bell },
  { name: "mail", icon: Mail },
  { name: "message", icon: MessageSquare },
  { name: "users", icon: Users },
  { name: "briefcase", icon: Briefcase },
  { name: "cart", icon: ShoppingCart },
  { name: "dollar", icon: DollarSign },
  { name: "calendar", icon: Calendar },
  { name: "clock", icon: Clock },
];

interface FolderItem {
  id?: number;
  title: string;
  icon: LucideIcon;
  iconName?: string;
  isCustom?: boolean;
  aiDescription?: string; // AI sorting description for Pro+ users
}

const defaultItems: FolderItem[] = [
  { title: "Inbox", icon: Inbox },
  { title: "Sent", icon: Send },
  { title: "Drafts", icon: FileText },
  { title: "Archived", icon: Archive },
  { title: "Junk", icon: AlertCircle },
  { title: "Trash", icon: Trash2 },
];

interface UnreadCounts {
  inbox: number;
  sent: number;
  archived: number;
  trash: number;
  drafts: number;
  junk: number;
}

interface CategoryCounts {
  primary: number;
  promotions: number;
  updates: number;
}

interface AppSidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  unreadCount: number;
  unreadCounts?: UnreadCounts;
  categoryCounts?: CategoryCounts;
  onCompose?: () => void;
  onDropEmail?: (emailId: string, targetFolder: string, targetFolderId?: number) => void;
}

export function AppSidebar({ activeFolder, onFolderChange, unreadCount, unreadCounts, categoryCounts, onCompose, onDropEmail }: AppSidebarProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderAiDescription, setNewFolderAiDescription] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  
  // Rename/Delete/Icon folder state
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const selectedFolderRef = useRef<FolderItem | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);
  const [deleteFolderTitle, setDeleteFolderTitle] = useState<string>("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [folderActionMenuOpen, setFolderActionMenuOpen] = useState<string | null>(null);
  
  // AI folder suggestion state
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestedEmails, setSuggestedEmails] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [suggestionFolderId, setSuggestionFolderId] = useState<number | null>(null);
  const [suggestionFolderName, setSuggestionFolderName] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);
  const justCollapsedRef = useRef(false);
  const { hasPro, hasPremium } = usePlan();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const userEmail = userData?.user?.email || "";
  const sidebarUserName = userEmail.split("@")[0] || "User";
  const sidebarUserInitials = sidebarUserName.slice(0, 2).toUpperCase();
  const sidebarUserPlan = userData?.user?.plan || "free";

  // Fetch custom folders from API
  const { data: customFoldersData } = useQuery<{ folders: CustomFolder[] }>({
    queryKey: ["/api/folders"],
  });

  // Combine default folders with custom folders from API
  const folders: FolderItem[] = [
    ...defaultItems,
    ...(customFoldersData?.folders || []).map(f => ({
      id: f.id,
      title: f.name,
      icon: iconMap[f.icon || "folder"] || Folder,
      iconName: f.icon || "folder",
      isCustom: true,
      aiDescription: f.aiDescription || undefined,
    })),
  ];

  // Mutation to create folder
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, aiDescription }: { name: string; aiDescription?: string }) => {
      const response = await apiRequest("POST", "/api/folders", { name, aiDescription });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    },
  });

  // Mutation to rename folder
  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest("PATCH", `/api/folders/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    },
  });

  // Mutation to delete folder
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/folders/${id}`);
      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({ error: "Failed to delete folder" }));
        throw new Error(error.error || "Failed to delete folder");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder deleted",
        description: "The folder has been removed.",
      });
    },
    onError: (error: Error) => {
      console.error("Delete folder error:", error);
      toast({
        title: "Failed to delete folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update folder icon
  const updateIconMutation = useMutation({
    mutationFn: async ({ id, icon }: { id: number; icon: string }) => {
      const response = await apiRequest("PATCH", `/api/folders/${id}`, { icon });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    },
  });

  // Mutation to get AI suggestions for a folder
  const getAiSuggestionsMutation = useMutation({
    mutationFn: async (folderId: number) => {
      const response = await apiRequest("POST", `/api/folders/${folderId}/ai-suggest`);
      return response.json();
    },
  });

  // Mutation to bulk assign emails to folder
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ folderId, messageIds }: { folderId: number; messageIds: string[] }) => {
      const response = await apiRequest("POST", `/api/folders/${folderId}/bulk-assign`, { messageIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
    },
  });

  // Function to fetch AI suggestions for a newly created folder
  const fetchAiSuggestions = useCallback(async (folderId: number, folderName: string) => {
    setIsLoadingSuggestions(true);
    setSuggestionFolderId(folderId);
    setSuggestionFolderName(folderName);
    setIsSuggestionOpen(true);
    
    try {
      const result = await getAiSuggestionsMutation.mutateAsync(folderId);
      setSuggestedEmails(result.suggestions || []);
      setSelectedSuggestions(new Set((result.suggestions || []).map((e: any) => e.id)));
    } catch (error) {
      console.error("Failed to get AI suggestions:", error);
      setSuggestedEmails([]);
      toast({
        title: "Could not analyze emails",
        description: "We couldn't find matching emails. You can still add emails manually later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [getAiSuggestionsMutation, toast]);

  // Handle confirming AI suggestions
  const handleConfirmSuggestions = useCallback(async () => {
    if (suggestionFolderId && selectedSuggestions.size > 0) {
      try {
        await bulkAssignMutation.mutateAsync({
          folderId: suggestionFolderId,
          messageIds: Array.from(selectedSuggestions),
        });
        toast({
          title: "Emails added",
          description: `${selectedSuggestions.size} email${selectedSuggestions.size !== 1 ? "s" : ""} added to ${suggestionFolderName}`,
        });
      } catch (error) {
        console.error("Failed to assign emails:", error);
        toast({
          title: "Failed to add emails",
          description: "Some emails could not be added to the folder. Please try again.",
          variant: "destructive",
        });
      }
    }
    setIsSuggestionOpen(false);
    setSuggestedEmails([]);
    setSelectedSuggestions(new Set());
    setSuggestionFolderId(null);
    setSuggestionFolderName("");
  }, [suggestionFolderId, selectedSuggestions, bulkAssignMutation, suggestionFolderName, toast]);

  // Toggle email selection in suggestions
  const toggleSuggestionSelection = useCallback((emailId: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  }, []);

  // Long press handlers for folder actions (0.5 seconds for responsive feel)
  const handleFolderTouchStart = useCallback((folder: FolderItem) => {
    if (!folder.isCustom) return;
    longPressTriggeredRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setFolderActionMenuOpen(folder.title);
    }, 500); // 0.5 second long press for responsive feel
  }, []);

  const handleFolderTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleFolderClick = useCallback((folderId: string) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onFolderChange(folderId);
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [onFolderChange, isMobile, setOpenMobile]);
  
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      const folderName = newFolderName.trim();
      const aiDesc = hasPro && newFolderAiDescription.trim() ? newFolderAiDescription.trim() : undefined;
      
      try {
        const result = await createFolderMutation.mutateAsync({
          name: folderName,
          aiDescription: aiDesc,
        });
        
        setNewFolderName("");
        setNewFolderAiDescription("");
        setIsCreateOpen(false);
        
        // If folder has AI description and Pro plan, fetch AI suggestions
        if (aiDesc && result.folder?.id && hasPro) {
          fetchAiSuggestions(result.folder.id, folderName);
        }
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
    }
  };

  const handleOpenRename = useCallback((folder: FolderItem) => {
    setSelectedFolder(folder);
    selectedFolderRef.current = folder;
    setRenameFolderName(folder.title);
    setIsRenameOpen(true);
  }, []);

  const handleRenameFolder = useCallback(() => {
    const folder = selectedFolderRef.current;
    if (folder && renameFolderName.trim() && folder.id) {
      renameFolderMutation.mutate({ id: folder.id, name: renameFolderName.trim() });
      setIsRenameOpen(false);
      setSelectedFolder(null);
      selectedFolderRef.current = null;
      setRenameFolderName("");
    }
  }, [renameFolderName, renameFolderMutation]);

  const handleOpenDelete = useCallback((folder: FolderItem) => {
    if (folder.id !== undefined) {
      setDeleteFolderId(folder.id);
      setDeleteFolderTitle(folder.title);
      setSelectedFolder(folder);
      selectedFolderRef.current = folder;
      setIsDeleteOpen(true);
    }
  }, []);

  const handleDeleteFolder = useCallback(() => {
    if (deleteFolderId !== null) {
      deleteFolderMutation.mutate(deleteFolderId);
      if (activeFolder.toLowerCase() === deleteFolderTitle.toLowerCase()) {
        onFolderChange("inbox");
      }
      setIsDeleteOpen(false);
      setSelectedFolder(null);
      selectedFolderRef.current = null;
      setDeleteFolderId(null);
      setDeleteFolderTitle("");
    }
  }, [deleteFolderId, deleteFolderTitle, activeFolder, onFolderChange, deleteFolderMutation]);

  const handleOpenIconPicker = useCallback((folder: FolderItem) => {
    setSelectedFolder(folder);
    selectedFolderRef.current = folder;
    setIsIconPickerOpen(true);
  }, []);

  const handleSelectIcon = useCallback((iconName: string) => {
    const folder = selectedFolderRef.current;
    if (folder && folder.id) {
      updateIconMutation.mutate({ id: folder.id, icon: iconName });
      setIsIconPickerOpen(false);
      setSelectedFolder(null);
      selectedFolderRef.current = null;
    }
  }, [updateIconMutation]);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folderId);
  }, []);

  const handleFolderDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverFolder(null);
    }
  }, []);

  const handleFolderDrop = useCallback((e: React.DragEvent, targetFolder: string, targetFolderId?: number) => {
    e.preventDefault();
    setDragOverFolder(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.emailId && onDropEmail) {
        onDropEmail(data.emailId, targetFolder, targetFolderId);
      }
    } catch {
    }
  }, [onDropEmail]);

  const handleMouseEnter = () => {
    if (isCollapsed && !justCollapsedRef.current) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHoverExpanded(true);
      }, 250);
    }
  };

  const handleMouseLeave = () => {
    justCollapsedRef.current = false;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (isCollapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHoverExpanded(false);
      }, 150);
    }
  };

  const handleSidebarClick = () => {
    if (isCollapsed && isHoverExpanded) {
      setIsCollapsed(false);
      setIsHoverExpanded(false);
    }
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCollapsed) {
      setIsCollapsed(false);
      setIsHoverExpanded(false);
    } else {
      setIsCollapsed(true);
      setIsHoverExpanded(false);
      justCollapsedRef.current = true;
    }
  };

  const isExpanded = !isCollapsed || isHoverExpanded;
  const showText = isExpanded;

  const handleFolderChangeWithClose = (folderId: string) => {
    onFolderChange(folderId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const effectiveShowText = isMobile ? true : showText;
  const effectiveExpanded = isMobile ? true : isExpanded;

  const folderContent = (
    <>
      <SidebarContent className={`${effectiveShowText ? "px-3" : "px-1.5"} transition-all duration-300`}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {!isMobile && (
                <SidebarMenuItem className="mb-2">
                  <div className={`flex ${effectiveExpanded ? "flex-row items-center gap-2" : "flex-col gap-1"}`}>
                    {effectiveShowText ? (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCreateOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200"
                          data-testid="button-create-folder"
                        >
                          <FolderPlus className="w-4 h-4" />
                          <span className="text-sm">Folder</span>
                        </button>
                        <button
                          onClick={handleToggleCollapse}
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200"
                          data-testid="button-toggle-sidebar"
                        >
                          <Menu className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleToggleCollapse}
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200"
                          data-testid="button-toggle-sidebar"
                        >
                          <Menu className="w-4 h-4" />
                        </button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateOpen(true);
                              }}
                              className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200"
                              data-testid="button-create-folder"
                            >
                              <FolderPlus className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">New Folder</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </SidebarMenuItem>
              )}
              {isMobile && (
                <SidebarMenuItem className="mb-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreateOpen(true);
                    }}
                    className="w-full flex items-center gap-2 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200"
                    data-testid="button-create-folder-mobile"
                  >
                    <FolderPlus className="w-4 h-4 ml-3" />
                    <span className="text-sm">New Folder</span>
                  </button>
                </SidebarMenuItem>
              )}
              {folders.map((item, itemIndex) => {
                const folderId = item.isCustom && item.id ? `custom-${item.id}` : item.title.toLowerCase();
                const isActive = activeFolder === folderId || activeFolder.toLowerCase() === item.title.toLowerCase();
                const folderKey = item.title.toLowerCase() as keyof UnreadCounts;
                const folderCount = unreadCounts?.[folderKey] || (item.title === "Inbox" ? unreadCount : 0);
                const showCount = folderCount > 0 && item.title.toLowerCase() !== "trash";
                
                if (!effectiveShowText) {
                  return (
                    <SidebarMenuItem 
                      key={item.title}
                      onDragOver={(e) => handleFolderDragOver(e, folderId)}
                      onDragLeave={handleFolderDragLeave}
                      onDrop={(e) => handleFolderDrop(e, item.title.toLowerCase(), item.id)}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFolderChangeWithClose(folderId);
                            }}
                            className={`
                              w-full justify-center h-11 rounded-xl transition-all duration-200
                              ${dragOverFolder === folderId
                                ? "ring-2 ring-primary bg-primary/15 text-foreground scale-105"
                                : isActive 
                                  ? "bg-muted/60 text-foreground" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                              }
                            `}
                            data-testid={`nav-${item.title.toLowerCase()}`}
                          >
                            <div className="relative">
                              <item.icon className="w-[18px] h-[18px]" />
                              {showCount && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.title}{showCount ? ` (${folderCount})` : ""}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }
                
                const folderButton = (
                  <SidebarMenuButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFolderChangeWithClose(folderId);
                    }}
                    className={`
                      w-full justify-between h-11 rounded-xl transition-all duration-200
                      ${dragOverFolder === folderId
                        ? "ring-2 ring-primary bg-primary/15 text-foreground scale-105"
                        : isActive 
                          ? "bg-muted/60 text-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }
                    `}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-[18px] h-[18px]" />
                      <span className={`text-sm ${isActive ? "font-medium" : ""}`}>{item.title}</span>
                      {item.aiDescription && (
                        <Sparkles className="w-3 h-3 text-primary/60" />
                      )}
                    </div>
                    {showCount && (
                      <Badge variant="secondary" className="text-xs min-w-[24px] h-6 justify-center rounded-lg bg-muted text-foreground border-0">
                        {folderCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                );

                if (item.isCustom) {
                  return (
                    <SidebarMenuItem 
                      key={item.title} 
                      className="group/folder"
                      onDragOver={(e) => handleFolderDragOver(e, folderId)}
                      onDragLeave={handleFolderDragLeave}
                      onDrop={(e) => handleFolderDrop(e, item.title.toLowerCase(), item.id)}
                    >
                      <SidebarMenuButton 
                        onClick={() => {
                          handleFolderClick(folderId);
                          if (isMobile) setOpenMobile(false);
                        }}
                        className={`
                          w-full justify-between h-11 rounded-xl transition-all duration-200
                          ${dragOverFolder === folderId
                            ? "ring-2 ring-primary bg-primary/15 text-foreground scale-105"
                            : isActive 
                              ? "bg-muted/60 text-foreground" 
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }
                        `}
                        data-testid={`nav-${item.title.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-[18px] h-[18px]" />
                          <span className={`text-sm ${isActive ? "font-medium" : ""}`}>{item.title}</span>
                          {item.aiDescription && (
                            <Sparkles className="w-3 h-3 text-primary/60" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {showCount && (
                            <Badge variant="secondary" className="text-xs min-w-[24px] h-6 justify-center rounded-lg bg-muted text-foreground border-0">
                              {folderCount}
                            </Badge>
                          )}
                          <Popover 
                            open={folderActionMenuOpen === item.title} 
                            onOpenChange={(open) => setFolderActionMenuOpen(open ? item.title : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFolderActionMenuOpen(folderActionMenuOpen === item.title ? null : item.title);
                                }}
                                className="p-1 rounded-md opacity-0 group-hover/folder:opacity-100 hover:bg-background/50 transition-all text-muted-foreground hover:text-foreground"
                                data-testid={`button-folder-menu-${item.title.toLowerCase()}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-1" align="start" side="right">
                              <button
                                onClick={() => {
                                  setFolderActionMenuOpen(null);
                                  handleOpenRename(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                                data-testid={`button-rename-${item.title.toLowerCase()}`}
                              >
                                <Pencil className="w-4 h-4" />
                                Rename
                              </button>
                              <button
                                onClick={() => {
                                  setFolderActionMenuOpen(null);
                                  handleOpenIconPicker(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                                data-testid={`button-icon-${item.title.toLowerCase()}`}
                              >
                                <ImageIcon className="w-4 h-4" />
                                Change Icon
                              </button>
                              <button
                                onClick={() => {
                                  setFolderActionMenuOpen(null);
                                  handleOpenDelete(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-destructive transition-colors"
                                data-testid={`button-delete-${item.title.toLowerCase()}`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                
                return (
                  <SidebarMenuItem 
                    key={item.title}
                    onDragOver={(e) => handleFolderDragOver(e, folderId)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, item.title.toLowerCase(), item.id)}
                  >
                    {folderButton}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className={`flex items-center gap-2 px-1 py-1 ${!effectiveShowText && !isMobile ? "flex-col" : ""}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {effectiveShowText ? (
                <button className="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors outline-none" data-testid="button-profile-sidebar">
                  <Avatar className="w-8 h-8 ring-2 ring-border/30 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-medium">
                      {sidebarUserInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium truncate max-w-[120px]">{sidebarUserName}</span>
                    <span className="text-[10px] text-muted-foreground/60 capitalize">{sidebarUserPlan}</span>
                  </div>
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted/50 transition-colors outline-none" data-testid="button-profile-sidebar">
                      <Avatar className="w-8 h-8 ring-2 ring-border/30">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-medium">
                          {sidebarUserInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{sidebarUserName}</TooltipContent>
                </Tooltip>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <div className="px-3 py-2 border-b border-border/30">
                <p className="text-sm font-medium truncate">{sidebarUserName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
              <DropdownMenuItem className="gap-2" onClick={() => { if (isMobile) setOpenMobile(false); setLocation("/profile"); }}>
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => { if (isMobile) setOpenMobile(false); setLocation("/settings"); }}>
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>
              {hasPremium && (
                <DropdownMenuItem className="gap-2" onClick={() => { if (isMobile) setOpenMobile(false); setLocation("/campaigns"); }} data-testid="menu-campaigns-sidebar">
                  <Megaphone className="w-4 h-4" />
                  Email Campaigns
                </DropdownMenuItem>
              )}
              {!userData?.user?.connectedEmail && (
                <DropdownMenuItem className="gap-2" onClick={() => { if (isMobile) setOpenMobile(false); setLocation("/connect-email"); }}>
                  <Link className="w-4 h-4" />
                  Connect Email
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onClick={() => { if (isMobile) setOpenMobile(false); setShowAccountSwitcher(true); }} data-testid="menu-switch-account">
                <RefreshCw className="w-4 h-4" />
                Switch Account
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive" onClick={() => logoutMutation.mutate()}>
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isMobile && <NotificationBell />}
        </div>
      </SidebarFooter>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Sidebar className="border-r border-border/20">
          {folderContent}
        </Sidebar>
      ) : (
        <div 
          className={`
            flex-shrink-0 transition-all duration-300 ease-in-out overflow-visible relative
            ${isExpanded ? "w-[11rem]" : "w-[3.5rem]"}
          `}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleSidebarClick}
        >
          <Sidebar collapsible="none" className={`border-r border-border/20 transition-all duration-300 ${isExpanded ? "w-[11rem]" : "w-[3.5rem]"}`}>
            {folderContent}
          </Sidebar>
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="folder-name" className="text-sm font-medium">
                Folder Name
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !hasPro) {
                    handleCreateFolder();
                  }
                }}
                data-testid="input-folder-name"
              />
            </div>
            
            {/* AI Auto-Sort Description - Pro+ only */}
            {hasPro && (
              <div>
                <Label htmlFor="folder-ai-description" className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Auto-Sort (Optional)
                </Label>
                <Textarea
                  id="folder-ai-description"
                  value={newFolderAiDescription}
                  onChange={(e) => setNewFolderAiDescription(e.target.value)}
                  placeholder="Describe what emails should go here, e.g. 'Newsletters and marketing emails'"
                  className="mt-2 min-h-[80px] resize-none"
                  data-testid="input-folder-ai-description"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  AI will automatically sort matching emails into this folder.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setNewFolderAiDescription(""); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-folder-name" className="text-sm font-medium">
              Folder Name
            </Label>
            <Input
              id="rename-folder-name"
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              placeholder="Enter folder name..."
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameFolder();
                }
              }}
              data-testid="input-rename-folder-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder} disabled={!renameFolderName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => {
        setIsDeleteOpen(open);
        if (!open) {
          setDeleteFolderId(null);
          setDeleteFolderTitle("");
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteFolderTitle}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFolder}
              disabled={deleteFolderMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteFolderMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Icon Picker Dialog */}
      <Dialog open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Choose Icon</DialogTitle>
            <DialogDescription>
              Select an icon for "{selectedFolder?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-4">
            {availableIcons.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => handleSelectIcon(name)}
                className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors hover:bg-muted ${
                  selectedFolder?.iconName === name ? "bg-primary/20 ring-2 ring-primary" : "bg-white/[0.03]"
                }`}
                data-testid={`icon-option-${name}`}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Email Suggestions Dialog */}
      <Dialog open={isSuggestionOpen} onOpenChange={(open) => {
        if (!open) {
          setIsSuggestionOpen(false);
          setSuggestedEmails([]);
          setSelectedSuggestions(new Set());
          setSuggestionFolderId(null);
          setSuggestionFolderName("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Found Matching Emails
            </DialogTitle>
            <DialogDescription>
              {isLoadingSuggestions 
                ? "Analyzing your emails..."
                : suggestedEmails.length > 0
                  ? `These emails match your "${suggestionFolderName}" folder criteria. Select which ones to add.`
                  : "No matching emails were found in your inbox."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-2 space-y-2">
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : suggestedEmails.length > 0 ? (
              suggestedEmails.map((email) => (
                <div 
                  key={email.id}
                  onClick={() => toggleSuggestionSelection(email.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedSuggestions.has(email.id)
                      ? "bg-primary/10 border-primary/50"
                      : "bg-white/[0.03] border-transparent hover:bg-white/[0.06]"
                  }`}
                  data-testid={`suggestion-email-${email.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      selectedSuggestions.has(email.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/50"
                    }`}>
                      {selectedSuggestions.has(email.id) && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{email.sender}</div>
                      <div className="text-sm text-foreground truncate">{email.subject}</div>
                      <div className="text-xs text-muted-foreground truncate mt-1">{email.preview}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No matching emails found. New emails that match this folder's criteria will be suggested in the future.
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsSuggestionOpen(false)}>
              {suggestedEmails.length > 0 ? "Skip" : "Close"}
            </Button>
            {suggestedEmails.length > 0 && (
              <Button 
                onClick={handleConfirmSuggestions}
                disabled={selectedSuggestions.size === 0 || bulkAssignMutation.isPending}
              >
                {bulkAssignMutation.isPending ? "Adding..." : `Add ${selectedSuggestions.size} Email${selectedSuggestions.size !== 1 ? "s" : ""}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountSwitcher
        open={showAccountSwitcher}
        onOpenChange={setShowAccountSwitcher}
      />
    </>
  );
}
