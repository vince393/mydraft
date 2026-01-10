import { useState } from "react";
import { Inbox, Send, FileText, Star, Trash2, PenSquare, FolderPlus, Search, SlidersHorizontal } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FolderItem {
  title: string;
  icon: typeof Inbox;
  isCustom?: boolean;
}

const defaultItems: FolderItem[] = [
  { title: "Inbox", icon: Inbox },
  { title: "Sent", icon: Send },
  { title: "Drafts", icon: FileText },
  { title: "Starred", icon: Star },
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

  return (
    <>
      <Sidebar className="border-r border-border/30">
        
        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="mb-3">
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input 
                      type="search"
                      placeholder="Search emails..." 
                      className="pl-9 bg-muted/30 border-0 h-9 rounded-lg focus:bg-muted/50 transition-colors text-sm"
                      data-testid="input-search"
                    />
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                    data-testid="button-filter"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <SidebarMenu className="space-y-1">
                {folders.map((item) => {
                  const isActive = activeFolder.toLowerCase() === item.title.toLowerCase();
                  const showCount = item.title === "Inbox" && unreadCount > 0;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        onClick={() => onFolderChange(item.title.toLowerCase())}
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

                <SidebarMenuItem className="mt-2">
                  <Button 
                    variant="outline"
                    onClick={() => setIsCreateOpen(true)}
                    className="w-full justify-center gap-2 h-9 rounded-lg border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-200"
                    data-testid="button-create-folder"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span className="text-sm">Folder</span>
                  </Button>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4">
          <Button 
            size="lg"
            className="w-full justify-center gap-2 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0" 
            data-testid="button-compose"
          >
            <PenSquare className="w-4 h-4" />
            Compose
          </Button>
        </SidebarFooter>
      </Sidebar>

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
