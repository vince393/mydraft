import { Inbox, Send, FileText, Trash2, Archive, PenSquare, Settings, User, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UnreadCounts {
  inbox: number;
  sent: number;
  archived: number;
  trash: number;
  drafts: number;
  junk: number;
}

interface MobileBottomNavProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  unreadCounts?: UnreadCounts;
  onCompose?: () => void;
}

const navItems = [
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "sent", icon: Send, label: "Sent" },
  { id: "archived", icon: Archive, label: "Archive" },
];

export function MobileBottomNav({ activeFolder, onFolderChange, unreadCounts, onCompose }: MobileBottomNavProps) {
  const [, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/20 safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const isActive = activeFolder.toLowerCase() === item.id;
          const count = unreadCounts?.[item.id as keyof UnreadCounts] || 0;
          
          return (
            <button
              key={item.id}
              onClick={() => onFolderChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors touch-target ${
                isActive ? "text-foreground" : "text-muted-foreground/70"
              }`}
              data-testid={`mobile-nav-${item.id}`}
            >
              <div className="relative">
                <item.icon className={`w-[22px] h-[22px] ${isActive ? "text-foreground" : ""}`} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-semibold bg-primary text-primary-foreground rounded-full px-0.5">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? "font-medium" : "font-normal"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        
        <button
          onClick={onCompose}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 touch-target"
          data-testid="mobile-nav-compose"
        >
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <PenSquare className="w-5 h-5 text-primary-foreground" />
          </div>
        </button>
      </div>
    </nav>
  );
}
