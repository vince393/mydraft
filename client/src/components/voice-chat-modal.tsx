import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, X, Volume2, VolumeX, Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
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
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const openRef = useRef(open);
  const isMutedRef = useRef(isMuted);
  const hasSpokenRef = useRef(false);
  const speechStartTimeRef = useRef<number | null>(null);
  const conversationStateRef = useRef<ConversationState>("idle");

  const SILENCE_THRESHOLD = 0.025;
  const SPEECH_THRESHOLD = 0.04;
  const SILENCE_DURATION = 1000;
  const MIN_SPEECH_DURATION = 150;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  const currentVoice = VINCE;

  const resumeListening = useCallback(() => {
    if (openRef.current) {
      setTimeout(() => {
        startListeningRef.current();
      }, 200);
    }
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
      audioPlayerRef.current = null;
    }
  }, []);

  const playAudioResponse = useCallback((audioBase64: string) => {
    if (isMutedRef.current) {
      setConversationState("idle");
      resumeListening();
      return;
    }

    setConversationState("speaking");
    
    try {
      const audioData = atob(audioBase64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setConversationState("idle");
        resumeListening();
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setConversationState("idle");
        resumeListening();
      };
      
      audio.play().catch(() => {
        setConversationState("idle");
        resumeListening();
      });
    } catch (err) {
      console.error("Error playing audio:", err);
      setConversationState("idle");
      resumeListening();
    }
  }, [resumeListening]);

  const sendVoiceMessage = useCallback(async (userMessage: string) => {
    setConversationState("processing");
    
    try {
      const response = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        setConversationHistory(prev => [
          ...prev,
          { role: "user", content: userMessage },
          { role: "assistant", content: data.response },
        ]);
        
        setLastResponse(data.response);
        
        if (data.audio) {
          playAudioResponse(data.audio);
        } else {
          setConversationState("idle");
          resumeListening();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to get response");
        setConversationState("idle");
        resumeListening();
      }
    } catch (err) {
      console.error("Voice chat error:", err);
      setError("Failed to connect");
      setConversationState("idle");
      resumeListening();
    }
  }, [conversationHistory, playAudioResponse, resumeListening]);

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

  const transcribeAndRespond = useCallback(async (audioBlob: Blob) => {
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
            sendVoiceMessage(transcribedText);
          } else {
            // Silently restart listening - no error message
            setConversationState("idle");
            resumeListening();
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.requiredPlan) {
            setError("Voice features require a Premium plan");
          } else {
            // Silently restart listening instead of showing error
            setConversationState("idle");
            resumeListening();
          }
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      console.error("Transcription error:", err);
      setError("Processing failed, please try again");
      setConversationState("idle");
      resumeListening();
    }
  }, [sendVoiceMessage, resumeListening]);

  const checkAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255;
    setAudioLevel(normalizedLevel);
    
    if (normalizedLevel > SPEECH_THRESHOLD) {
      if (conversationStateRef.current === "speaking") {
        stopAudioPlayback();
        setConversationState("idle");
        setTimeout(() => startListeningRef.current(), 100);
        return;
      }
      
      if (!speechStartTimeRef.current) {
        speechStartTimeRef.current = Date.now();
      }
      
      const speechDuration = Date.now() - speechStartTimeRef.current;
      if (speechDuration >= MIN_SPEECH_DURATION) {
        hasSpokenRef.current = true;
      }
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      // If audio drops below speech threshold and user has spoken, start silence timer
      if (hasSpokenRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
        }, SILENCE_DURATION);
      }
      speechStartTimeRef.current = null;
    }
    
    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  }, [stopListening, stopAudioPlayback]);

  const startListening = useCallback(async () => {
    // Use ref to check latest state, not stale closure value
    if (conversationStateRef.current !== "idle") return;
    
    setError(null);
    setTranscript("");
    hasSpokenRef.current = false;
    speechStartTimeRef.current = null;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      });
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
        
        if (audioChunksRef.current.length > 0 && hasSpokenRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          transcribeAndRespond(audioBlob);
        } else {
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
  }, [transcribeAndRespond, checkAudioLevel, resumeListening]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const endCall = useCallback(() => {
    stopAudioPlayback();
    stopListening();
    setConversationState("idle");
    setTranscript("");
    setLastResponse("");
    setConversationHistory([]);
    onOpenChange(false);
  }, [stopListening, stopAudioPlayback, onOpenChange]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (!isMuted) {
      stopAudioPlayback();
    }
  }, [isMuted, stopAudioPlayback]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopListening();
      stopAudioPlayback();
      setConversationState("idle");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopListening();
      stopAudioPlayback();
    };
  }, [stopListening, stopAudioPlayback]);

  const getStatusText = () => {
    switch (conversationState) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Vince is thinking...";
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
                  "w-32 h-32 ring-4 ring-white/[0.06] cursor-pointer transition-all",
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
              <div className="bg-white/[0.03] rounded-xl p-3 max-w-sm text-center">
                <p className="text-xs text-muted-foreground mb-1">You said:</p>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

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
