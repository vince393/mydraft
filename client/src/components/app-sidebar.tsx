import { useState, useRef, useCallback, useEffect } from "react";
import { Inbox, Send, FileText, Trash2, PenSquare, FolderPlus, ChevronLeft, ChevronRight, Archive, AlertCircle, User, Lock, Pencil, Sparkles, Folder, Star, Heart, Bookmark, Flag, Tag, Zap, Bell, Mail, MessageSquare, Users, Briefcase, ShoppingCart, DollarSign, Calendar, Clock, Image as ImageIcon, MoreVertical, type LucideIcon } from "lucide-react";
import { usePlan } from "@/hooks/use-plan";
import { UpgradeModal } from "./upgrade-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { AssistantModal } from "./assistant-modal";

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

interface AppSidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  unreadCount: number;
  unreadCounts?: UnreadCounts;
  onCompose?: () => void;
}

export function AppSidebar({ activeFolder, onFolderChange, unreadCount, unreadCounts, onCompose }: AppSidebarProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderAiDescription, setNewFolderAiDescription] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Rename/Delete/Icon folder state
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [folderActionMenuOpen, setFolderActionMenuOpen] = useState<string | null>(null);
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);
  const justCollapsedRef = useRef(false);
  const { hasPro } = usePlan();

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
      await apiRequest("DELETE", `/api/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
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
    // Don't navigate if long press was triggered or menu is open
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onFolderChange(folderId);
  }, [onFolderChange]);
  
  const handleOpenAssistant = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPro) {
      setShowUpgradeModal(true);
    } else {
      setIsAssistantOpen(true);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate({
        name: newFolderName.trim(),
        aiDescription: hasPro && newFolderAiDescription.trim() ? newFolderAiDescription.trim() : undefined,
      });
      setNewFolderName("");
      setNewFolderAiDescription("");
      setIsCreateOpen(false);
    }
  };

  const handleOpenRename = useCallback((folder: FolderItem) => {
    setSelectedFolder(folder);
    setRenameFolderName(folder.title);
    setIsRenameOpen(true);
  }, []);

  const handleRenameFolder = useCallback(() => {
    if (selectedFolder && renameFolderName.trim() && selectedFolder.id) {
      renameFolderMutation.mutate({ id: selectedFolder.id, name: renameFolderName.trim() });
      setIsRenameOpen(false);
      setSelectedFolder(null);
      setRenameFolderName("");
    }
  }, [selectedFolder, renameFolderName, renameFolderMutation]);

  const handleOpenDelete = useCallback((folder: FolderItem) => {
    setSelectedFolder(folder);
    setIsDeleteOpen(true);
  }, []);

  const handleDeleteFolder = useCallback(() => {
    if (selectedFolder && selectedFolder.id) {
      deleteFolderMutation.mutate(selectedFolder.id);
      if (activeFolder.toLowerCase() === selectedFolder.title.toLowerCase()) {
        onFolderChange("inbox");
      }
      setIsDeleteOpen(false);
      setSelectedFolder(null);
    }
  }, [selectedFolder, activeFolder, onFolderChange, deleteFolderMutation]);

  const handleOpenIconPicker = useCallback((folder: FolderItem) => {
    setSelectedFolder(folder);
    setIsIconPickerOpen(true);
  }, []);

  const handleSelectIcon = useCallback((iconName: string) => {
    if (selectedFolder && selectedFolder.id) {
      updateIconMutation.mutate({ id: selectedFolder.id, icon: iconName });
      setIsIconPickerOpen(false);
      setSelectedFolder(null);
    }
  }, [selectedFolder, updateIconMutation]);

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

  return (
    <>
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
        <SidebarContent className={`${isExpanded ? "px-3" : "px-1.5"} transition-all duration-300`}>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem className="mb-2">
                  <div className={`flex ${isExpanded ? "flex-row items-center gap-2" : "flex-col gap-1"}`}>
                    {showText ? (
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
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleToggleCollapse}
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200"
                          data-testid="button-toggle-sidebar"
                        >
                          <ChevronRight className="w-4 h-4" />
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
                {folders.map((item) => {
                  // For custom folders, use a special identifier like "custom-{id}"
                  const folderId = item.isCustom && item.id ? `custom-${item.id}` : item.title.toLowerCase();
                  const isActive = activeFolder === folderId || activeFolder.toLowerCase() === item.title.toLowerCase();
                  const folderKey = item.title.toLowerCase() as keyof UnreadCounts;
                  const folderCount = unreadCounts?.[folderKey] || (item.title === "Inbox" ? unreadCount : 0);
                  const showCount = folderCount > 0;
                  
                  if (!showText) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton 
                              onClick={(e) => {
                                e.stopPropagation();
                                onFolderChange(folderId);
                              }}
                              className={`
                                w-full justify-center h-11 rounded-xl transition-all duration-200
                                ${isActive 
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
                        onFolderChange(folderId);
                      }}
                      className={`
                        w-full justify-between h-11 rounded-xl transition-all duration-200
                        ${isActive 
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

                  // Custom folders get a visible menu button for rename/delete/icon
                  if (item.isCustom) {
                    return (
                      <SidebarMenuItem key={item.title} className="group/folder">
                        <div className="flex items-center w-full">
                          <SidebarMenuButton 
                            onClick={() => handleFolderClick(folderId)}
                            className={`
                              flex-1 justify-between h-11 rounded-xl transition-all duration-200
                              ${isActive 
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
                          
                          {/* Visible menu button for custom folders */}
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
                                className="ml-1 p-1.5 rounded-lg opacity-0 group-hover/folder:opacity-100 hover:bg-muted/60 transition-all text-muted-foreground hover:text-foreground"
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
                      </SidebarMenuItem>
                    );
                  }
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      {folderButton}
                    </SidebarMenuItem>
                  );
                })}

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className={`${isExpanded ? "p-3" : "p-2"} transition-all duration-300 space-y-2`}>
          {/* Assistant Button - Plan gated */}
          {showText ? (
            <button
              onClick={handleOpenAssistant}
              className={`w-full flex items-center gap-3 px-3 h-10 rounded-xl transition-colors ${
                hasPro 
                  ? "bg-muted/40 hover:bg-muted/60" 
                  : "bg-muted/20 opacity-60"
              }`}
              data-testid="button-open-assistant"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                hasPro 
                  ? "bg-gradient-to-br from-blue-500 to-purple-600" 
                  : "bg-muted"
              }`}>
                {hasPro ? (
                  <User className="w-3 h-3 text-white" />
                ) : (
                  <Lock className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {hasPro ? "Vince" : "Vince (Pro)"}
              </span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenAssistant}
                  className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-colors ${
                    hasPro 
                      ? "bg-muted/40 hover:bg-muted/60" 
                      : "bg-muted/20 opacity-60"
                  }`}
                  data-testid="button-open-assistant"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    hasPro 
                      ? "bg-gradient-to-br from-blue-500 to-purple-600" 
                      : "bg-muted"
                  }`}>
                    {hasPro ? (
                      <User className="w-3 h-3 text-white" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {hasPro ? "Vince - Assistant" : "Vince (Upgrade to Pro)"}
              </TooltipContent>
            </Tooltip>
          )}
          {showText ? (
            <Button 
              size="lg"
              className="w-full justify-center gap-2 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0" 
              data-testid="button-compose"
              onClick={onCompose}
            >
              <PenSquare className="w-4 h-4" />
              Compose
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon"
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0" 
                  data-testid="button-compose"
                  onClick={onCompose}
                >
                  <PenSquare className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Compose</TooltipContent>
            </Tooltip>
          )}
        </SidebarFooter>
        </Sidebar>
      </div>

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
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFolder?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              Delete
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
                  selectedFolder?.iconName === name ? "bg-primary/20 ring-2 ring-primary" : "bg-muted/30"
                }`}
                data-testid={`icon-option-${name}`}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AssistantModal open={isAssistantOpen} onOpenChange={setIsAssistantOpen} />
      
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        requiredPlan="pro"
        feature="AI Assistant (Vince)"
      />
    </>
  );
}
