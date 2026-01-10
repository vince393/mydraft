import { Inbox, Send, FileText, Star, Trash2, Settings, PenSquare, Mail } from "lucide-react";
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

const mainItems = [
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
  return (
    <Sidebar className="border-r border-border/30">
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">MailFlow</span>
        </div>
        <Button 
          size="lg"
          className="w-full justify-center gap-2 rounded-xl font-medium" 
          data-testid="button-compose"
        >
          <PenSquare className="w-4 h-4" />
          Compose
        </Button>
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => {
                const isActive = activeFolder.toLowerCase() === item.title.toLowerCase();
                const showCount = item.title === "Inbox" && unreadCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => onFolderChange(item.title.toLowerCase())}
                      className={`
                        w-full justify-between h-11 rounded-xl transition-all duration-200
                        ${isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }
                      `}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-primary" : ""}`} />
                        <span className={`text-sm ${isActive ? "font-medium" : ""}`}>{item.title}</span>
                      </div>
                      {showCount && (
                        <Badge variant="secondary" className="text-xs min-w-[24px] h-6 justify-center rounded-lg bg-primary/15 text-primary border-0">
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
        <SidebarMenuButton 
          className="w-full justify-start gap-3 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200" 
          data-testid="nav-settings"
        >
          <Settings className="w-[18px] h-[18px]" />
          <span className="text-sm">Settings</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
