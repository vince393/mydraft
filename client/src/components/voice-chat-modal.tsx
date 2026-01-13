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

const VINCE = { id: "vince", name: "Vince", color: "from-blue-500 to-purple-600" };

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
  const hasSpokenRef = useRef(false);
  const speechStartTimeRef = useRef<number | null>(null);
  const conversationStateRef = useRef<ConversationState>("idle");
  const interruptVadRef = useRef<{ stream: MediaStream; context: AudioContext; analyser: AnalyserNode; frameId: number } | null>(null);

  const SILENCE_THRESHOLD = 0.03;
  const SPEECH_THRESHOLD = 0.05;
  const SILENCE_DURATION = 1200;
  const MIN_SPEECH_DURATION = 300;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  const stopInterruptVad = useCallback(() => {
    if (interruptVadRef.current) {
      cancelAnimationFrame(interruptVadRef.current.frameId);
      interruptVadRef.current.stream.getTracks().forEach(t => t.stop());
      interruptVadRef.current.context.close();
      interruptVadRef.current = null;
    }
  }, []);

  const interruptSpeaking = useCallback(() => {
    if (conversationStateRef.current === "speaking") {
      window.speechSynthesis.cancel();
      stopInterruptVad();
      setConversationState("idle");
      // Immediately start listening again
      setTimeout(() => {
        startListeningRef.current();
      }, 100);
    }
  }, [stopInterruptVad]);

  const startInterruptVad = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const checkForInterrupt = () => {
        if (conversationStateRef.current !== "speaking") {
          stopInterruptVad();
          return;
        }
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = average / 255;
        
        if (level > SPEECH_THRESHOLD) {
          interruptSpeaking();
          return;
        }
        
        interruptVadRef.current!.frameId = requestAnimationFrame(checkForInterrupt);
      };

      const frameId = requestAnimationFrame(checkForInterrupt);
      interruptVadRef.current = { stream, context, analyser, frameId };
    } catch (err) {
      console.error("Failed to start interrupt VAD:", err);
    }
  }, [interruptSpeaking, stopInterruptVad]);

  const { data: settings } = useQuery<AssistantSettings>({
    queryKey: ["/api/assistant/settings"],
    enabled: open,
  });

  const selectedVoice = "vince";
  const currentVoice = VINCE;

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
    
    // Start interrupt VAD to detect if user speaks during TTS
    startInterruptVad();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.toLowerCase().includes("google uk english male") ||
      v.name.toLowerCase().includes("daniel") ||
      v.name.toLowerCase().includes("james") ||
      v.name.toLowerCase().includes("google us english") ||
      (v.lang.startsWith("en") && v.name.toLowerCase().includes("male"))
    ) || voices.find(v => v.lang.startsWith("en-"));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.95;
    utterance.pitch = 0.85;
    
    utterance.onend = () => {
      stopInterruptVad();
      setConversationState("idle");
      resumeListening();
    };
    
    utterance.onerror = () => {
      stopInterruptVad();
      setConversationState("idle");
      resumeListening();
    };
    
    window.speechSynthesis.speak(utterance);
  }, [resumeListening, startInterruptVad, stopInterruptVad]);

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
    
    // Detect if user is speaking (above speech threshold)
    if (normalizedLevel > SPEECH_THRESHOLD) {
      // If AI is speaking and user starts talking, interrupt
      if (conversationStateRef.current === "speaking") {
        interruptSpeaking();
      }
      
      // Track when speech started
      if (!speechStartTimeRef.current) {
        speechStartTimeRef.current = Date.now();
      }
      
      // Mark as spoken after minimum speech duration
      const speechDuration = Date.now() - speechStartTimeRef.current;
      if (speechDuration >= MIN_SPEECH_DURATION) {
        hasSpokenRef.current = true;
      }
      
      // Clear any silence timer while speaking
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else if (normalizedLevel <= SILENCE_THRESHOLD) {
      // Only start silence timer if user has actually spoken something
      if (hasSpokenRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
        }, SILENCE_DURATION);
      }
      // Reset speech start time when quiet
      speechStartTimeRef.current = null;
    }
    
    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  }, [stopListening, interruptSpeaking]);

  const startListening = useCallback(async () => {
    if (conversationState !== "idle") return;
    
    setError(null);
    setTranscript("");
    hasSpokenRef.current = false;
    speechStartTimeRef.current = null;
    
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
        
        // Only transcribe if user actually spoke something
        if (audioChunksRef.current.length > 0 && hasSpokenRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          transcribeAudio(audioBlob);
        } else {
          // No speech detected, go back to idle and resume listening
          setConversationState("idle");
          resumeListening();
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
    stopInterruptVad();
    setConversationState("idle");
    setTranscript("");
    setLastResponse("");
    onOpenChange(false);
  }, [stopListening, stopInterruptVad, onOpenChange]);

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
      stopInterruptVad();
      window.speechSynthesis.cancel();
    };
  }, [stopListening, stopInterruptVad]);

  const getStatusText = () => {
    switch (conversationState) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Thinking...";
      case "speaking":
        return "Vince is speaking...";
      default:
        return "Tap to speak";
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

            {lastResponse && conversationState === "speaking" && (
              <div className="bg-primary/10 rounded-xl p-4 max-w-sm text-center">
                <p className="text-sm line-clamp-4">{lastResponse}</p>
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
