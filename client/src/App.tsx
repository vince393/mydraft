import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
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
        "--sidebar-width-icon": "3rem",
      } as React.CSSProperties}
    >
      <div className="flex h-screen w-full bg-background">
        <AppSidebar
          activeFolder={activeFolder}
          onFolderChange={setActiveFolder}
          unreadCount={unreadCount}
        />
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
