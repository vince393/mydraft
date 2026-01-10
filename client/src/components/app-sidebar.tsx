import { useState } from "react";
import { Inbox, Send, FileText, Star, Trash2, PenSquare, FolderPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem className="mb-2">
                  <button 
                    onClick={() => setIsCreateOpen(true)}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-200"
                    data-testid="button-create-folder"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span className="text-sm">New Folder</span>
                  </button>
                </SidebarMenuItem>
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
