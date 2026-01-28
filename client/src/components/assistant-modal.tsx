import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePlan } from "@/hooks/use-plan";
import { UpgradeModal } from "./upgrade-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Mic, 
  Send,
  User,
  Loader2,
  X,
  ThumbsUp,
  ThumbsDown,
  Check,
  Pencil,
  Trash2,
  Mail,
  Archive,
  Forward,
  Reply,
  ChevronDown,
  Plus,
  History,
  MessageSquare,
  Settings,
  Eye,
  FileEdit,
  SendHorizonal,
  Shield
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AssistantMessage, AssistantSettings, ChatSession } from "@shared/schema";
import { VoiceChatModal } from "./voice-chat-modal";

interface ProposedAction {
  id: number;
  actionType: string;
  status: string;
  metadata: {
    to?: string[];
    cc?: string[];
    subject?: string;
    body?: string;
    messageId?: string;
  };
  createdAt: string;
}

const FEEDBACK_TAGS = [
  { id: "too_long", label: "Too long" },
  { id: "too_short", label: "Too short" },
  { id: "too_formal", label: "Too formal" },
  { id: "too_casual", label: "Too casual" },
  { id: "wrong_intent", label: "Wrong intent" },
  { id: "hallucinated", label: "Made things up" },
  { id: "great", label: "Great!" },
] as const;

const ACTION_ICONS: Record<string, typeof Mail> = {
  send: Mail,
  reply: Reply,
  "reply-all": Reply,
  forward: Forward,
  trash: Trash2,
  archive: Archive,
};


const ASSISTANT_VOICES = [
  { id: "vince", name: "Vince", description: "Professional and calm" },
  { id: "alex", name: "Alex", description: "Friendly and helpful" },
  { id: "leo", name: "Leo", description: "Concise and direct" },
  { id: "max", name: "Max", description: "Warm and conversational" },
] as const;

type VoiceId = typeof ASSISTANT_VOICES[number]["id"];

interface AssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantModal({ open, onOpenChange }: AssistantModalProps) {
  const [message, setMessage] = useState("");
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<number | null>(null);
  const [editingAction, setEditingAction] = useState<ProposedAction | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hasPremium } = usePlan();
  
  const handleOpenVoiceChat = () => {
    if (!hasPremium) {
      setShowUpgradeModal(true);
    } else {
      setVoiceChatOpen(true);
    }
  };

  const { data: settings } = useQuery<AssistantSettings>({
    queryKey: ["/api/assistant/settings"],
    queryFn: async () => {
      const response = await fetch("/api/assistant/settings");
      if (!response.ok) {
        if (response.status === 404) {
          return { selectedVoice: "vince", voiceOutputEnabled: true } as AssistantSettings;
        }
        throw new Error("Failed to fetch settings");
      }
      return response.json();
    },
  });

  const selectedVoice = settings?.selectedVoice || "vince";
  const canReadEmails = settings?.canReadEmails ?? false;
  const canDraftEmails = settings?.canDraftEmails ?? false;
  const canSendEmails = settings?.canSendEmails ?? false;

  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["/api/assistant/sessions"],
    queryFn: async () => {
      const response = await fetch("/api/assistant/sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
    enabled: open,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<AssistantMessage[]>({
    queryKey: ["/api/assistant/messages"],
    queryFn: async () => {
      const response = await fetch("/api/assistant/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: open,
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assistant/sessions", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/messages"] });
    },
  });

  const switchSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("POST", `/api/assistant/sessions/${sessionId}/activate`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/messages"] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("DELETE", `/api/assistant/sessions/${sessionId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/messages"] });
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: async ({ sessionId, title }: { sessionId: number; title: string }) => {
      const response = await apiRequest("PATCH", `/api/assistant/sessions/${sessionId}`, { title });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/sessions"] });
      setEditingSessionId(null);
      setEditingTitle("");
    },
  });

  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const activeSession = sessions.find(s => s.isActive);

  const { data: aiContext } = useQuery<{
    pendingActions: ProposedAction[];
    capabilities: { canDraft: boolean; canSend: boolean };
  }>({
    queryKey: ["/api/ai/context"],
    queryFn: async () => {
      const response = await fetch("/api/ai/context");
      if (!response.ok) throw new Error("Failed to fetch AI context");
      return response.json();
    },
    enabled: open,
    refetchInterval: 5000,
  });

  const pendingActions = aiContext?.pendingActions?.filter(a => a.status === "pending") || [];

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { 
      selectedVoice?: string; 
      voiceOutputEnabled?: boolean;
      canReadEmails?: boolean;
      canDraftEmails?: boolean;
      canSendEmails?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/assistant/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/settings"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/assistant/chat", { 
        message: content,
        voiceId: selectedVoice 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/context"] });
    },
  });

  const confirmActionMutation = useMutation({
    mutationFn: async ({ actionId, modifications }: { actionId: number; modifications?: { body?: string } }) => {
      const response = await apiRequest("POST", "/api/ai/confirm-action", { actionId, modifications });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/context"] });
      setEditingAction(null);
      setEditedBody("");
    },
  });

  const cancelActionMutation = useMutation({
    mutationFn: async (actionId: number) => {
      const response = await apiRequest("POST", "/api/ai/cancel-action", { actionId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/context"] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ messageId, rating, tags }: { messageId: number; rating?: string; tags?: string[] }) => {
      const response = await apiRequest("POST", "/api/ai/feedback", { 
        assistantMessageId: messageId, 
        rating, 
        tags 
      });
      return response.json();
    },
    onSuccess: () => {
      setFeedbackMessageId(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentVoice = ASSISTANT_VOICES.find(v => v.id === selectedVoice);
  const currentVoiceName = currentVoice?.name || "Vince";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md md:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0"
        data-testid="modal-assistant"
        hideCloseButton
      >
        <DialogHeader className="px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <DialogTitle className="text-base font-semibold">
                  {currentVoiceName}
                </DialogTitle>
                <span className="text-xs text-muted-foreground">Personal Assistant</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => createSessionMutation.mutate()}
                disabled={createSessionMutation.isPending}
                data-testid="button-new-chat"
              >
                <Plus className="w-3 h-3" />
                New
              </Button>

              {sessions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      data-testid="button-chat-history"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Chat History</div>
                    {sessions.slice(0, 10).map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm hover-elevate",
                          session.isActive && "bg-primary/10"
                        )}
                        data-testid={`session-${session.id}`}
                      >
                        {editingSessionId === session.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="h-6 text-xs flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const trimmed = editingTitle.trim();
                                  if (trimmed) {
                                    renameSessionMutation.mutate({ sessionId: session.id, title: trimmed });
                                  }
                                } else if (e.key === "Escape") {
                                  setEditingSessionId(null);
                                  setEditingTitle("");
                                }
                              }}
                              data-testid={`input-rename-session-${session.id}`}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5"
                              onClick={() => {
                                const trimmed = editingTitle.trim();
                                if (trimmed) {
                                  renameSessionMutation.mutate({ sessionId: session.id, title: trimmed });
                                }
                              }}
                              disabled={renameSessionMutation.isPending || !editingTitle.trim()}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5"
                              onClick={() => {
                                setEditingSessionId(null);
                                setEditingTitle("");
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div 
                              className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                              onClick={() => switchSessionMutation.mutate(session.id)}
                            >
                              <MessageSquare className="w-3 h-3 shrink-0 text-muted-foreground" />
                              <span className="truncate text-sm">{session.title}</span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {session.isActive && (
                                <Check className="w-3 h-3 text-primary mr-1" />
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(session.id);
                                  setEditingTitle(session.title);
                                }}
                                data-testid={`button-rename-session-${session.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSessionMutation.mutate(session.id);
                                }}
                                disabled={deleteSessionMutation.isPending}
                                data-testid={`button-delete-session-${session.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <Select 
                value={selectedVoice} 
                onValueChange={(value: VoiceId) => updateSettingsMutation.mutate({ selectedVoice: value })}
              >
                <SelectTrigger className="w-24 h-8 text-xs" data-testid="select-assistant-voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSISTANT_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id} data-testid={`voice-option-${voice.id}`}>
                      <div className="flex flex-col">
                        <span>{voice.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 relative",
                      (canReadEmails || canDraftEmails || canSendEmails) && "text-primary"
                    )}
                    data-testid="button-assistant-permissions"
                  >
                    <Shield className="w-4 h-4" />
                    {(canReadEmails || canDraftEmails || canSendEmails) && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Email Permissions
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Label htmlFor="perm-read" className="text-sm cursor-pointer">Read emails</Label>
                      </div>
                      <Switch
                        id="perm-read"
                        checked={canReadEmails}
                        onCheckedChange={(checked) => updateSettingsMutation.mutate({ canReadEmails: checked })}
                        data-testid="switch-permission-read"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileEdit className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Label htmlFor="perm-draft" className="text-sm cursor-pointer">Draft emails</Label>
                      </div>
                      <Switch
                        id="perm-draft"
                        checked={canDraftEmails}
                        onCheckedChange={(checked) => updateSettingsMutation.mutate({ canDraftEmails: checked })}
                        data-testid="switch-permission-draft"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <SendHorizonal className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Label htmlFor="perm-send" className="text-sm cursor-pointer">Send emails</Label>
                      </div>
                      <Switch
                        id="perm-send"
                        checked={canSendEmails}
                        onCheckedChange={(checked) => updateSettingsMutation.mutate({ canSendEmails: checked })}
                        data-testid="switch-permission-send"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                    Enable permissions for Vince to help manage your inbox
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-assistant"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-3 h-full">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Hi, I'm {currentVoiceName}!
                </p>
                <p className="text-xs text-muted-foreground">
                  Ask me about your emails, account, or how to use the app.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1", msg.role === "user" && "items-end")}>
                  <div
                    className={cn(
                      "text-sm rounded-xl px-4 py-3 max-w-[85%]",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 border border-border/30"
                    )}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 px-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => feedbackMutation.mutate({ messageId: msg.id, rating: "positive" })}
                        disabled={feedbackMutation.isPending}
                        data-testid={`button-feedback-up-${msg.id}`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setFeedbackMessageId(feedbackMessageId === msg.id ? null : msg.id)}
                        disabled={feedbackMutation.isPending}
                        data-testid={`button-feedback-down-${msg.id}`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                      {feedbackMessageId === msg.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-xs gap-1">
                              What's wrong?
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {FEEDBACK_TAGS.filter(t => t.id !== "great").map((tag) => (
                              <DropdownMenuItem
                                key={tag.id}
                                onClick={() => feedbackMutation.mutate({ 
                                  messageId: msg.id, 
                                  rating: "negative", 
                                  tags: [tag.id] 
                                })}
                                data-testid={`feedback-tag-${tag.id}`}
                              >
                                {tag.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {sendMessageMutation.isPending && (
              <div className="flex flex-col gap-1">
                <div className="text-sm rounded-xl px-4 py-3 max-w-[85%] bg-muted/60 border border-border/30">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{currentVoiceName} is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {pendingActions.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground font-medium">Pending Actions</p>
                {pendingActions.map((action) => {
                  const ActionIcon = ACTION_ICONS[action.actionType] || Mail;
                  const isEditing = editingAction?.id === action.id;
                  
                  return (
                    <Card key={action.id} className="p-3 border-primary/30" data-testid={`action-card-${action.id}`}>
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <ActionIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium capitalize">{action.actionType}</span>
                            {action.metadata?.to && (
                              <span className="text-xs text-muted-foreground truncate">
                                to {action.metadata.to.join(", ")}
                              </span>
                            )}
                          </div>
                          {action.metadata?.subject && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Subject: {action.metadata.subject}
                            </p>
                          )}
                          {isEditing ? (
                            <Textarea
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              className="text-xs min-h-[100px] mb-2"
                              data-testid="textarea-edit-draft"
                            />
                          ) : (
                            action.metadata?.body && (
                              <p className="text-xs text-muted-foreground line-clamp-3 mb-2 whitespace-pre-wrap">
                                {action.metadata.body}
                              </p>
                            )
                          )}
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => confirmActionMutation.mutate({ 
                                    actionId: action.id, 
                                    modifications: { body: editedBody } 
                                  })}
                                  disabled={confirmActionMutation.isPending}
                                  data-testid="button-save-draft"
                                >
                                  <Check className="w-3 h-3" />
                                  Send
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setEditingAction(null);
                                    setEditedBody("");
                                  }}
                                  data-testid="button-cancel-edit"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => confirmActionMutation.mutate({ actionId: action.id })}
                                  disabled={confirmActionMutation.isPending}
                                  data-testid={`button-confirm-action-${action.id}`}
                                >
                                  {confirmActionMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => {
                                    setEditingAction(action);
                                    setEditedBody(action.metadata?.body || "");
                                  }}
                                  data-testid={`button-edit-action-${action.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  onClick={() => cancelActionMutation.mutate(action.id)}
                                  disabled={cancelActionMutation.isPending}
                                  data-testid={`button-cancel-action-${action.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className={cn(
                "h-10 w-10 shrink-0 rounded-xl",
                !hasPremium && "opacity-60"
              )}
              onClick={handleOpenVoiceChat}
              data-testid="button-voice-input"
              title={hasPremium ? "Voice chat" : "Voice chat (Premium)"}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${currentVoiceName}...`}
              className="h-10 rounded-xl"
              disabled={sendMessageMutation.isPending}
              data-testid="input-assistant-message"
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      <VoiceChatModal 
        open={voiceChatOpen} 
        onOpenChange={setVoiceChatOpen} 
      />
      
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        requiredPlan="premium"
        feature="Voice Chat with Vince"
      />
    </Dialog>
  );
}
