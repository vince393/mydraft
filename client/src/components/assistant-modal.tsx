import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePlan } from "@/hooks/use-plan";
import { UpgradeModal } from "./upgrade-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  Mic, 
  Send,
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
  Plus,
  History,
  Settings,
  Sparkles,
  Eye,
  PenLine,
  SendHorizonal,
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
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
      setShowHistory(false);
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

  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

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
    if (!open) {
      setShowSettings(false);
      setShowHistory(false);
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
        className="sm:max-w-md md:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 border-0 shadow-2xl shadow-black/40"
        style={{
          background: "rgba(18, 18, 24, 0.82)",
          backdropFilter: "blur(40px) saturate(1.6)",
          WebkitBackdropFilter: "blur(40px) saturate(1.6)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
        data-testid="modal-assistant"
        hideCloseButton
      >
        {/* Header */}
        <div 
          className="px-5 py-4 shrink-0"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(139, 92, 246, 0.7))",
                  boxShadow: "0 0 20px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white leading-tight">{currentVoiceName}</h2>
                <p className="text-[11px] text-white/40 leading-tight">AI Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white/50 hover:text-white/80"
                onClick={() => createSessionMutation.mutate()}
                disabled={createSessionMutation.isPending}
                data-testid="button-new-chat"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-8 w-8 text-white/50 hover:text-white/80",
                  showHistory && "text-white/90"
                )}
                onClick={() => { setShowHistory(!showHistory); setShowSettings(false); }}
                data-testid="button-history"
                title="Chat history"
              >
                <History className="w-4 h-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-8 w-8 text-white/50 hover:text-white/80",
                  showSettings && "text-white/90"
                )}
                onClick={() => { setShowSettings(!showSettings); setShowHistory(false); }}
                data-testid="button-settings"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white/50 hover:text-white/80"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-assistant"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div 
            className="px-5 py-4 shrink-0 space-y-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-3">Voice</p>
              <div className="grid grid-cols-2 gap-2">
                {ASSISTANT_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => updateSettingsMutation.mutate({ selectedVoice: voice.id })}
                    className={cn(
                      "px-3 py-2 rounded-xl text-left transition-all duration-200",
                      selectedVoice === voice.id
                        ? "text-white"
                        : "text-white/50 hover:text-white/70"
                    )}
                    style={{
                      background: selectedVoice === voice.id 
                        ? "rgba(99, 102, 241, 0.2)" 
                        : "rgba(255, 255, 255, 0.03)",
                      border: selectedVoice === voice.id 
                        ? "1px solid rgba(99, 102, 241, 0.3)" 
                        : "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                    data-testid={`voice-option-${voice.id}`}
                  >
                    <span className="text-xs font-medium">{voice.name}</span>
                    <span className="text-[10px] block text-white/30 mt-0.5">{voice.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-3">Permissions</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-white/40" />
                    <Label htmlFor="perm-read" className="text-xs text-white/60 cursor-pointer">Read emails</Label>
                  </div>
                  <Switch
                    id="perm-read"
                    checked={canReadEmails}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ canReadEmails: checked })}
                    data-testid="switch-permission-read"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PenLine className="w-3.5 h-3.5 text-white/40" />
                    <Label htmlFor="perm-draft" className="text-xs text-white/60 cursor-pointer">Draft emails</Label>
                  </div>
                  <Switch
                    id="perm-draft"
                    checked={canDraftEmails}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ canDraftEmails: checked })}
                    data-testid="switch-permission-draft"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SendHorizonal className="w-3.5 h-3.5 text-white/40" />
                    <Label htmlFor="perm-send" className="text-xs text-white/60 cursor-pointer">Send emails</Label>
                  </div>
                  <Switch
                    id="perm-send"
                    checked={canSendEmails}
                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ canSendEmails: checked })}
                    data-testid="switch-permission-send"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && sessions.length > 0 && (
          <div 
            className="px-5 py-3 shrink-0 max-h-[200px] overflow-y-auto scrollbar-thin"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-2">History</p>
            <div className="space-y-1">
              {sessions.slice(0, 10).map((session) => (
                <div 
                  key={session.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150",
                    session.isActive ? "text-white" : "text-white/50 hover:text-white/70"
                  )}
                  style={{
                    background: session.isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  }}
                  onClick={() => switchSessionMutation.mutate(session.id)}
                  data-testid={`session-${session.id}`}
                >
                  <span className="text-xs truncate flex-1 min-w-0">{session.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {session.isActive && <Check className="w-3 h-3 text-indigo-400" />}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 invisible group-hover:visible text-white/30 hover:text-white/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSessionMutation.mutate(session.id);
                      }}
                      data-testid={`delete-session-${session.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <div className="px-5 py-4 space-y-4 h-full">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))",
                    border: "1px solid rgba(99, 102, 241, 0.15)",
                  }}
                >
                  <Sparkles className="w-7 h-7 text-indigo-400/70" />
                </div>
                <p className="text-sm text-white/60 font-medium mb-1">
                  Hi, I'm {currentVoiceName}
                </p>
                <p className="text-xs text-white/30 text-center max-w-[240px]">
                  Ask me about your emails, draft replies, or manage your inbox.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1.5", msg.role === "user" && "items-end")}>
                  <div
                    className={cn(
                      "text-[13px] leading-relaxed rounded-2xl px-4 py-3 max-w-[85%] break-words",
                    )}
                    style={
                      msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.45), rgba(79, 70, 229, 0.55))",
                            color: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid rgba(129, 140, 248, 0.2)",
                          }
                        : {
                            background: "rgba(255, 255, 255, 0.04)",
                            color: "rgba(255, 255, 255, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                          }
                    }
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>

                  {/* Feedback row for assistant messages */}
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-0.5 px-1">
                      <button
                        className="p-1 rounded-md text-white/20 hover:text-white/50 transition-colors"
                        onClick={() => feedbackMutation.mutate({ messageId: msg.id, rating: "positive" })}
                        disabled={feedbackMutation.isPending}
                        data-testid={`button-feedback-up-${msg.id}`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 rounded-md text-white/20 hover:text-white/50 transition-colors"
                        onClick={() => setFeedbackMessageId(feedbackMessageId === msg.id ? null : msg.id)}
                        disabled={feedbackMutation.isPending}
                        data-testid={`button-feedback-down-${msg.id}`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                      {feedbackMessageId === msg.id && (
                        <div className="flex items-center gap-1 ml-1">
                          {FEEDBACK_TAGS.filter(t => t.id !== "great").map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => feedbackMutation.mutate({ 
                                messageId: msg.id, 
                                rating: "negative", 
                                tags: [tag.id] 
                              })}
                              className="text-[10px] px-2 py-0.5 rounded-full text-white/40 hover:text-white/70 transition-colors"
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                              }}
                              data-testid={`feedback-tag-${tag.id}`}
                            >
                              {tag.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex flex-col gap-1">
                <div 
                  className="rounded-2xl px-4 py-3 max-w-[85%]"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[11px] text-white/30">{currentVoiceName} is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pending Actions */}
            {pendingActions.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Pending Actions</p>
                {pendingActions.map((action) => {
                  const ActionIcon = ACTION_ICONS[action.actionType] || Mail;
                  const isEditing = editingAction?.id === action.id;
                  
                  return (
                    <div 
                      key={action.id} 
                      className="rounded-xl p-3.5"
                      style={{
                        background: "rgba(99, 102, 241, 0.08)",
                        border: "1px solid rgba(99, 102, 241, 0.15)",
                      }}
                      data-testid={`action-card-${action.id}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: "rgba(99, 102, 241, 0.15)",
                          }}
                        >
                          <ActionIcon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-white/80 capitalize">{action.actionType}</span>
                            {action.metadata?.to && (
                              <span className="text-[10px] text-white/30 truncate">
                                to {action.metadata.to.join(", ")}
                              </span>
                            )}
                          </div>
                          {action.metadata?.subject && (
                            <p className="text-[11px] text-white/40 mb-2">
                              Subject: {action.metadata.subject}
                            </p>
                          )}
                          {isEditing ? (
                            <Textarea
                              value={editedBody}
                              onChange={(e) => setEditedBody(e.target.value)}
                              className="text-xs min-h-[100px] mb-2 bg-black/20 border-white/10 text-white/80 rounded-lg"
                              data-testid="textarea-edit-draft"
                            />
                          ) : (
                            action.metadata?.body && (
                              <p className="text-[11px] text-white/50 line-clamp-3 mb-2 whitespace-pre-wrap">
                                {action.metadata.body}
                              </p>
                            )
                          )}
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1 rounded-lg"
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
                                  variant="ghost"
                                  className="h-7 text-xs text-white/50 rounded-lg"
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
                                  className="h-7 text-xs gap-1 rounded-lg"
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
                                  variant="ghost"
                                  className="h-7 text-xs gap-1 text-white/50 rounded-lg"
                                  onClick={() => {
                                    setEditingAction(action);
                                    setEditedBody(action.metadata?.body || "");
                                  }}
                                  data-testid={`button-edit-action-${action.id}`}
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </Button>
                                <button
                                  className="h-7 px-2 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                                  onClick={() => cancelActionMutation.mutate(action.id)}
                                  disabled={cancelActionMutation.isPending}
                                  data-testid={`button-cancel-action-${action.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div 
          className="px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
        >
          <div 
            className="flex items-end gap-2 rounded-2xl px-3 py-2"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 shrink-0 rounded-xl text-white/30 hover:text-white/60",
                !hasPremium && "opacity-40"
              )}
              onClick={handleOpenVoiceChat}
              data-testid="button-voice-input"
              title={hasPremium ? "Voice chat" : "Voice chat (Premium)"}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${currentVoiceName}...`}
              className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/25 resize-none outline-none min-h-[32px] max-h-[120px] py-1.5 leading-relaxed"
              disabled={sendMessageMutation.isPending}
              rows={1}
              data-testid="input-assistant-message"
            />
            <button
              className={cn(
                "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200",
                message.trim() && !sendMessageMutation.isPending
                  ? "text-white"
                  : "text-white/20"
              )}
              style={{
                background: message.trim() && !sendMessageMutation.isPending
                  ? "linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(79, 70, 229, 0.8))"
                  : "transparent",
              }}
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
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
