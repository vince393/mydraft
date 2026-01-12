import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send,
  Settings,
  User,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantMessage, AssistantSettings } from "@shared/schema";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string } } };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Voice configuration
const ASSISTANT_VOICES = [
  { id: "vince", name: "Vince", description: "Professional and calm" },
  { id: "alex", name: "Alex", description: "Friendly and helpful" },
  { id: "leo", name: "Leo", description: "Concise and direct" },
  { id: "max", name: "Max", description: "Warm and conversational" },
] as const;

type VoiceId = typeof ASSISTANT_VOICES[number]["id"];

interface AssistantPanelProps {
  className?: string;
}

export function AssistantPanel({ className }: AssistantPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch assistant settings
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
  const voiceOutputEnabled = settings?.voiceOutputEnabled ?? true;

  // Fetch conversation history
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<AssistantMessage[]>({
    queryKey: ["/api/assistant/messages"],
    queryFn: async () => {
      const response = await fetch("/api/assistant/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: isExpanded,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { selectedVoice?: string; voiceOutputEnabled?: boolean }) => {
      const response = await apiRequest("POST", "/api/assistant/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/settings"] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/assistant/chat", { 
        message: content,
        voiceId: selectedVoice 
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/messages"] });
      if (voiceOutputEnabled && data.response) {
        speakResponse(data.response);
      }
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const win = window as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
    if (typeof window !== "undefined" && (win.SpeechRecognition || win.webkitSpeechRecognition)) {
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        recognitionRef.current = new SpeechRecognitionClass();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setMessage(transcript);
          setIsRecording(false);
        };
        
        recognitionRef.current.onerror = () => {
          setIsRecording(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const speakResponse = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a male voice
    const maleVoice = voices.find(v => 
      v.name.toLowerCase().includes("male") || 
      v.name.toLowerCase().includes("david") ||
      v.name.toLowerCase().includes("james") ||
      v.name.toLowerCase().includes("daniel") ||
      v.name.toLowerCase().includes("google uk english male")
    );
    
    if (maleVoice) {
      utterance.voice = maleVoice;
    }
    
    utterance.rate = 1;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

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

  const currentVoiceName = ASSISTANT_VOICES.find(v => v.id === selectedVoice)?.name || "Vince";

  return (
    <div className={cn("border-t border-border/50", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button 
            className="w-full flex items-center justify-between px-4 py-3 hover-elevate transition-colors"
            data-testid="button-assistant-toggle"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium">{currentVoiceName}</span>
              <span className="text-xs text-muted-foreground">Assistant</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3">
            {/* Settings row */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => updateSettingsMutation.mutate({ voiceOutputEnabled: !voiceOutputEnabled })}
                  data-testid="button-toggle-voice-output"
                >
                  {voiceOutputEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setShowSettings(!showSettings)}
                  data-testid="button-assistant-settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              {showSettings && (
                <Select 
                  value={selectedVoice} 
                  onValueChange={(value: VoiceId) => updateSettingsMutation.mutate({ selectedVoice: value })}
                >
                  <SelectTrigger className="w-28 h-7 text-xs" data-testid="select-assistant-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSISTANT_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id} data-testid={`voice-option-${voice.id}`}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Messages area */}
            <ScrollArea className="h-48 rounded-lg bg-muted/30 mb-2">
              <div className="p-3 space-y-3">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">
                      Ask {currentVoiceName} about your emails, account, or how to use the app.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "text-sm rounded-lg px-3 py-2 max-w-[90%]",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-background border border-border/50"
                      )}
                      data-testid={`message-${msg.role}-${msg.id}`}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant={isRecording ? "default" : "outline"}
                className={cn("h-9 w-9 shrink-0", isRecording && "bg-red-500 hover:bg-red-600")}
                onMouseDown={handleStartRecording}
                onMouseUp={handleStopRecording}
                onMouseLeave={handleStopRecording}
                disabled={!recognitionRef.current}
                data-testid="button-voice-input"
              >
                {isRecording ? (
                  <Mic className="w-4 h-4 animate-pulse" />
                ) : recognitionRef.current ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </Button>
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${currentVoiceName}...`}
                className="h-9 text-sm"
                disabled={sendMessageMutation.isPending}
                data-testid="input-assistant-message"
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

