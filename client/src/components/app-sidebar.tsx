import { Inbox, Send, FileText, Star, Trash2, Settings, Sparkles, Search, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const mainItems = [
  { title: "Inbox", icon: Inbox, count: 12, active: true },
  { title: "Sent", icon: Send, count: 0, active: false },
  { title: "Drafts", icon: FileText, count: 3, active: false },
  { title: "Starred", icon: Star, count: 5, active: false },
  { title: "Trash", icon: Trash2, count: 0, active: false },
];

const aiItems = [
  { title: "AI Suggestions", icon: Sparkles, count: 4 },
];

interface AppSidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  unreadCount: number;
}

export function AppSidebar({ activeFolder, onFolderChange, unreadCount }: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">MailFlow</span>
        </div>
        <Button 
          className="w-full justify-start gap-2" 
          data-testid="button-compose"
        >
          <Plus className="w-4 h-4" />
          Compose
        </Button>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <div className="px-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search emails..." 
              className="pl-9 bg-sidebar-accent border-0"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="px-3 py-2 mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/10 rounded-md px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Est. response time: 6 min</span>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = activeFolder.toLowerCase() === item.title.toLowerCase();
                const displayCount = item.title === "Inbox" ? unreadCount : item.count;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => onFolderChange(item.title.toLowerCase())}
                      className={`w-full justify-between ${isActive ? "bg-sidebar-accent" : ""}`}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={isActive ? "font-medium" : ""}>{item.title}</span>
                      </div>
                      {displayCount > 0 && (
                        <Badge variant="secondary" className="text-xs min-w-[20px] justify-center">
                          {displayCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground px-3">AI Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="w-full justify-between" data-testid="nav-ai-suggestions">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-primary" />
                      <span>{item.title}</span>
                    </div>
                    {item.count > 0 && (
                      <Badge className="bg-primary/20 text-primary border-0 text-xs">
                        {item.count}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenuButton className="w-full justify-start gap-3" data-testid="nav-settings">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span>Settings</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
