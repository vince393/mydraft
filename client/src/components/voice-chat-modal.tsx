import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, X, Volume2, VolumeX, Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VoiceChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AssistantSettings {
  selectedVoice: string;
  voiceOutputEnabled: boolean;
}

const ASSISTANT_VOICES = [
  { id: "vince", name: "Vince", color: "from-blue-500 to-purple-600" },
  { id: "alex", name: "Alex", color: "from-green-500 to-teal-600" },
  { id: "leo", name: "Leo", color: "from-orange-500 to-red-600" },
  { id: "max", name: "Max", color: "from-pink-500 to-rose-600" },
] as const;

type ConversationState = "idle" | "listening" | "processing" | "speaking";

export function VoiceChatModal({ open, onOpenChange }: VoiceChatModalProps) {
  const [conversationState, setConversationState] = useState<ConversationState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const openRef = useRef(open);
  const isMutedRef = useRef(isMuted);

  const SILENCE_THRESHOLD = 0.02;
  const SILENCE_DURATION = 1500;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const { data: settings } = useQuery<AssistantSettings>({
    queryKey: ["/api/assistant/settings"],
    enabled: open,
  });

  const selectedVoice = settings?.selectedVoice || "vince";
  const currentVoice = ASSISTANT_VOICES.find(v => v.id === selectedVoice) || ASSISTANT_VOICES[0];

  const resumeListening = useCallback(() => {
    if (openRef.current) {
      setTimeout(() => {
        startListeningRef.current();
      }, 500);
    }
  }, []);

  const speakResponse = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || isMutedRef.current) {
      setConversationState("idle");
      resumeListening();
      return;
    }

    window.speechSynthesis.cancel();
    setConversationState("speaking");
    
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.toLowerCase().includes("male") || 
      v.name.toLowerCase().includes("david") ||
      v.name.toLowerCase().includes("google uk english male")
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1;
    utterance.pitch = 0.9;
    
    utterance.onend = () => {
      setConversationState("idle");
      resumeListening();
    };
    
    utterance.onerror = () => {
      setConversationState("idle");
      resumeListening();
    };
    
    window.speechSynthesis.speak(utterance);
  }, [resumeListening]);

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
      if (data.response) {
        setLastResponse(data.response);
        speakResponse(data.response);
      }
    },
    onError: () => {
      setError("Failed to get response");
      setConversationState("idle");
      resumeListening();
    },
  });

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setConversationState("processing");
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        
        const response = await fetch("/api/assistant/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ audio: base64Audio, mimeType: "audio/webm" }),
        });
        
        if (response.ok) {
          const { transcript: transcribedText } = await response.json();
          if (transcribedText && transcribedText.trim()) {
            setTranscript(transcribedText);
            sendMessageMutation.mutate(transcribedText);
          } else {
            setConversationState("idle");
            resumeListening();
          }
        } else {
          setError("Failed to transcribe");
          setConversationState("idle");
          resumeListening();
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      console.error("Transcription error:", err);
      setError("Transcription failed");
      setConversationState("idle");
      resumeListening();
    }
  }, [sendMessageMutation, resumeListening]);

  const checkAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255;
    setAudioLevel(normalizedLevel);
    
    if (normalizedLevel > SILENCE_THRESHOLD) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else if (!silenceTimerRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, SILENCE_DURATION);
    }
    
    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  }, [stopListening]);

  const startListening = useCallback(async () => {
    if (conversationState !== "idle") return;
    
    setError(null);
    setTranscript("");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          transcribeAudio(audioBlob);
        }
      };
      
      mediaRecorder.start(100);
      setConversationState("listening");
      
      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Could not access microphone");
    }
  }, [conversationState, transcribeAudio, checkAudioLevel]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const endCall = useCallback(() => {
    window.speechSynthesis.cancel();
    stopListening();
    setConversationState("idle");
    setTranscript("");
    setLastResponse("");
    onOpenChange(false);
  }, [stopListening, onOpenChange]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (!isMuted) {
      window.speechSynthesis.cancel();
    }
  }, [isMuted]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      stopListening();
      window.speechSynthesis.cancel();
      setConversationState("idle");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis.cancel();
    };
  }, [stopListening]);

  const getStatusText = () => {
    switch (conversationState) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "speaking":
        return `${currentVoice.name} is speaking...`;
      default:
        return "Tap to start";
    }
  };

  const pulseScale = 1 + audioLevel * 0.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 bg-gradient-to-b from-background to-muted/50 overflow-hidden"
        data-testid="modal-voice-chat"
        hideCloseButton
      >
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 h-8 w-8 rounded-full"
            onClick={endCall}
            data-testid="button-close-voice"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div className="relative">
              <div 
                className={cn(
                  "absolute inset-0 rounded-full bg-gradient-to-br opacity-30 blur-xl transition-transform duration-100",
                  currentVoice.color
                )}
                style={{ transform: `scale(${pulseScale})` }}
              />
              <div 
                className={cn(
                  "absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-md transition-transform duration-100",
                  currentVoice.color
                )}
                style={{ transform: `scale(${1 + pulseScale * 0.2})` }}
              />
              <Avatar 
                className={cn(
                  "w-32 h-32 ring-4 ring-border/50 cursor-pointer transition-all",
                  conversationState === "listening" && "ring-green-500/50",
                  conversationState === "speaking" && "ring-blue-500/50"
                )}
                onClick={() => conversationState === "idle" && startListening()}
              >
                <AvatarFallback className={cn("text-4xl font-bold text-white bg-gradient-to-br", currentVoice.color)}>
                  {currentVoice.name[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">{currentVoice.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                {conversationState === "processing" && <Loader2 className="w-4 h-4 animate-spin" />}
                {getStatusText()}
              </p>
            </div>

            {transcript && (
              <div className="bg-muted/50 rounded-xl p-4 max-w-sm text-center">
                <p className="text-sm text-muted-foreground mb-1">You said:</p>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

            {lastResponse && conversationState === "speaking" && (
              <div className="bg-primary/10 rounded-xl p-4 max-w-sm text-center">
                <p className="text-sm text-primary/70 mb-1">{currentVoice.name}:</p>
                <p className="text-sm line-clamp-3">{lastResponse}</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex items-center gap-4 mt-8">
            <Button
              size="icon"
              variant="outline"
              className="h-12 w-12 rounded-full"
              onClick={toggleMute}
              data-testid="button-toggle-mute"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            <Button
              size="icon"
              variant={conversationState === "listening" ? "default" : "outline"}
              className={cn(
                "h-16 w-16 rounded-full transition-all",
                conversationState === "listening" && "bg-green-500 hover:bg-green-600 animate-pulse"
              )}
              onClick={() => {
                if (conversationState === "idle") {
                  startListening();
                } else if (conversationState === "listening") {
                  stopListening();
                }
              }}
              disabled={conversationState === "processing" || conversationState === "speaking"}
              data-testid="button-mic-toggle"
            >
              {conversationState === "listening" ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </Button>

            <Button
              size="icon"
              variant="destructive"
              className="h-12 w-12 rounded-full"
              onClick={endCall}
              data-testid="button-end-call"
            >
              <Phone className="w-5 h-5 rotate-[135deg]" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
