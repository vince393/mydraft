import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send,
  User,
  Loader2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantMessage, AssistantSettings } from "@shared/schema";

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
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<AssistantMessage[]>({
    queryKey: ["/api/assistant/messages"],
    queryFn: async () => {
      const response = await fetch("/api/assistant/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: open,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { selectedVoice?: string; voiceOutputEnabled?: boolean }) => {
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/messages"] });
      if (voiceOutputEnabled && data.response) {
        speakResponse(data.response);
      }
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

  const currentVoice = ASSISTANT_VOICES.find(v => v.id === selectedVoice);
  const currentVoiceName = currentVoice?.name || "Vince";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md md:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0"
        data-testid="modal-assistant"
      >
        <DialogHeader className="px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-base font-semibold">
                  {currentVoiceName}
                </DialogTitle>
                <span className="text-xs text-muted-foreground">Personal Assistant</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select 
                value={selectedVoice} 
                onValueChange={(value: VoiceId) => updateSettingsMutation.mutate({ selectedVoice: value })}
              >
                <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-assistant-voice">
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
              
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => updateSettingsMutation.mutate({ voiceOutputEnabled: !voiceOutputEnabled })}
                data-testid="button-toggle-voice-output"
              >
                {voiceOutputEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
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
                <div
                  key={msg.id}
                  className={cn(
                    "text-sm rounded-xl px-4 py-3 max-w-[85%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted/60 border border-border/30"
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

        <div className="p-4 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant={isRecording ? "default" : "outline"}
              className={cn("h-10 w-10 shrink-0 rounded-xl", isRecording && "bg-red-500 hover:bg-red-600")}
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onMouseLeave={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
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
    </Dialog>
  );
}
