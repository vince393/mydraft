import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
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
        "--sidebar-width": "11rem",
        "--sidebar-width-icon": "0rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full bg-background">
        <AppSidebar
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          unreadCount={unreadCount}
        />
        <SidebarOpenButton />
        <SidebarInset className="flex flex-1">
          <Switch>
            <Route path="/" component={Inbox} />
            <Route component={NotFound} />
          </Switch>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SidebarOpenButton() {
  const { open, toggleSidebar } = useSidebar();
  
  if (open) return null;
  
  return (
    <button
      onClick={toggleSidebar}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-6 h-12 bg-muted/80 hover:bg-muted rounded-r-lg border border-l-0 border-border/30 text-muted-foreground hover:text-foreground transition-all"
      data-testid="button-open-sidebar"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
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
