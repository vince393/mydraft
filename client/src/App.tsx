import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
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
          <header className="flex items-center h-16 px-6 border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-sidebar-toggle" />
            <div className="ml-5">
              <h1 className="text-base font-medium capitalize tracking-tight">{activeFolder}</h1>
            </div>
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
