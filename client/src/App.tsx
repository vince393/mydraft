import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import Inbox from "@/pages/inbox";
import NotFound from "@/pages/not-found";
import { useQuery } from "@tanstack/react-query";
import type { Email } from "@shared/schema";

function AppContent() {
  const [activeFolder, setActiveFolder] = useState("inbox");

  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "17rem",
        "--sidebar-width-icon": "3.5rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full bg-background">
        <AppSidebar
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          unreadCount={unreadCount}
        />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex items-center justify-between h-16 px-6 border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-sidebar-toggle" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none" data-testid="button-profile">
                  <div className="text-right">
                    <p className="text-sm font-medium">John Doe</p>
                    <p className="text-xs text-muted-foreground">john@mailflow.com</p>
                  </div>
                  <Avatar className="w-9 h-9 ring-2 ring-border/30">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-medium">
                      JD
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="gap-2" data-testid="menu-profile">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" data-testid="menu-settings">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive" data-testid="menu-logout">
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/" component={Inbox} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
