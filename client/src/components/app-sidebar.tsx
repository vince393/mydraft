import { useState, useRef } from "react";
import { Inbox, Send, FileText, Trash2, PenSquare, FolderPlus, ChevronLeft, ChevronRight, Archive, AlertCircle } from "lucide-react";
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

interface FolderItem {
  title: string;
  icon: typeof Inbox;
  isCustom?: boolean;
}

const defaultItems: FolderItem[] = [
  { title: "Inbox", icon: Inbox },
  { title: "Sent", icon: Send },
  { title: "Drafts", icon: FileText },
  { title: "Archived", icon: Archive },
  { title: "Junk", icon: AlertCircle },
  { title: "Trash", icon: Trash2 },
];

interface AppSidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  unreadCount: number;
}

export function AppSidebar({ activeFolder, onFolderChange, unreadCount }: AppSidebarProps) {
  const [folders, setFolders] = useState<FolderItem[]>(defaultItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const justCollapsedRef = useRef(false);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: FolderItem = {
        title: newFolderName.trim(),
        icon: FileText,
        isCustom: true,
      };
      setFolders([...folders, newFolder]);
      setNewFolderName("");
      setIsCreateOpen(false);
    }
  };

  const handleMouseEnter = () => {
    if (isCollapsed && !justCollapsedRef.current) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHoverExpanded(true);
      }, 1000);
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
        <Sidebar collapsible="none" className={`border-r border-border/30 transition-all duration-300 ${isExpanded ? "w-[11rem]" : "w-[3.5rem]"}`}>
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
                  const isActive = activeFolder.toLowerCase() === item.title.toLowerCase();
                  const showCount = item.title === "Inbox" && unreadCount > 0;
                  
                  if (!showText) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton 
                              onClick={(e) => {
                                e.stopPropagation();
                                onFolderChange(item.title.toLowerCase());
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
                            {item.title}{showCount ? ` (${unreadCount})` : ""}
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  }
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          onFolderChange(item.title.toLowerCase());
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
                        </div>
                        {showCount && (
                          <Badge variant="secondary" className="text-xs min-w-[24px] h-6 justify-center rounded-lg bg-muted text-foreground border-0">
                            {unreadCount}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className={`${isExpanded ? "p-4" : "p-2"} transition-all duration-300`}>
          {showText ? (
            <Button 
              size="lg"
              className="w-full justify-center gap-2 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0" 
              data-testid="button-compose"
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
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
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
              data-testid="input-folder-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
