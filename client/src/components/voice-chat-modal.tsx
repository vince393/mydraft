import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, X, Volume2, VolumeX, Loader2, Phone, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

type ConversationState = "idle" | "listening" | "processing" | "speaking";

export function VoiceChatModal({ open, onOpenChange }: VoiceChatModalProps) {
  const [conversationState, setConversationState] = useState<ConversationState>("idle");
  const [transcript, setTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  
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
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const SILENCE_THRESHOLD = 0.025;
  const SPEECH_THRESHOLD = 0.04;
  const SILENCE_DURATION = 1200;
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

  useEffect(() => {
    if (open) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory, transcript]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const resumeListening = useCallback(() => {
    if (openRef.current) {
      setTimeout(() => {
        startListeningRef.current();
      }, 300);
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
        
        setTranscript("");
        
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
            setConversationState("idle");
            resumeListening();
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.requiredPlan) {
            setError("Voice features require a Premium plan");
          } else {
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
    setConversationHistory([]);
    setCallDuration(0);
    setAudioLevel(0);
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
      }, 500);
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
        return "Thinking...";
      case "speaking":
        return "Speaking...";
      default:
        return "Tap mic to speak";
    }
  };

  const getStatusColor = () => {
    switch (conversationState) {
      case "listening":
        return "text-green-400";
      case "processing":
        return "text-amber-400";
      case "speaking":
        return "text-blue-400";
      default:
        return "text-white/40";
    }
  };

  const ringScale = 1 + audioLevel * 0.6;
  const outerRingScale = 1 + audioLevel * 1.0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 overflow-hidden border-0"
        style={{
          background: "rgba(10, 10, 16, 0.95)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          maxHeight: "90vh",
        }}
        data-testid="modal-voice-chat"
        hideCloseButton
      >
        <div className="flex flex-col h-[600px]">
          {/* Header */}
          <div 
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-white">Vince</p>
                <p className="text-[11px] text-white/30">{formatDuration(callDuration)}</p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white/40 hover:text-white/70"
              onClick={endCall}
              data-testid="button-close-voice"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Conversation Transcript */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-5 py-4">
            {conversationHistory.length === 0 && !transcript && conversationState === "idle" && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                  }}
                >
                  <Mic className="w-7 h-7 text-indigo-300/70" />
                </div>
                <p className="text-sm text-white/50 mb-1">Voice Call with Vince</p>
                <p className="text-xs text-white/25 max-w-[200px]">
                  Just start talking. Vince will listen and respond naturally.
                </p>
              </div>
            )}

            {conversationHistory.length > 0 && (
              <div className="space-y-4">
                {conversationHistory.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" && "items-end")}>
                    <p className="text-[10px] text-white/25 px-1">
                      {msg.role === "user" ? "You" : "Vince"}
                    </p>
                    <div
                      className="text-[13px] leading-relaxed rounded-2xl px-4 py-2.5 max-w-[85%]"
                      style={
                        msg.role === "user"
                          ? {
                              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(79, 70, 229, 0.45))",
                              color: "rgba(255, 255, 255, 0.9)",
                              border: "1px solid rgba(129, 140, 248, 0.15)",
                            }
                          : {
                              background: "rgba(255, 255, 255, 0.04)",
                              color: "rgba(255, 255, 255, 0.75)",
                              border: "1px solid rgba(255, 255, 255, 0.06)",
                            }
                      }
                      data-testid={`voice-message-${msg.role}-${i}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Live transcript of what user is saying */}
            {transcript && (
              <div className={cn("flex flex-col items-end gap-1", conversationHistory.length > 0 && "mt-4")}>
                <p className="text-[10px] text-white/25 px-1">You</p>
                <div
                  className="text-[13px] leading-relaxed rounded-2xl px-4 py-2.5 max-w-[85%]"
                  style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.35))",
                    color: "rgba(255, 255, 255, 0.7)",
                    border: "1px solid rgba(129, 140, 248, 0.1)",
                  }}
                  data-testid="voice-transcript-live"
                >
                  {transcript}
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {conversationState === "processing" && (
              <div className={cn("flex flex-col gap-1", conversationHistory.length > 0 && "mt-4")}>
                <p className="text-[10px] text-white/25 px-1">Vince</p>
                <div
                  className="rounded-2xl px-4 py-2.5 max-w-[85%]"
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
                  </div>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Status + Visualizer */}
          <div className="shrink-0 flex flex-col items-center py-4 px-5 gap-3"
            style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            {/* Audio visualizer ring */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full transition-transform duration-75"
                style={{ 
                  transform: `scale(${outerRingScale})`,
                  background: conversationState === "listening" 
                    ? `radial-gradient(circle, rgba(34, 197, 94, ${0.05 + audioLevel * 0.15}) 0%, transparent 70%)`
                    : conversationState === "speaking"
                    ? `radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)`
                    : "transparent",
                }}
              />
              <div 
                className="absolute inset-2 rounded-full transition-transform duration-75"
                style={{ 
                  transform: `scale(${ringScale})`,
                  border: conversationState === "listening" 
                    ? `2px solid rgba(34, 197, 94, ${0.3 + audioLevel * 0.5})`
                    : conversationState === "speaking"
                    ? "2px solid rgba(99, 102, 241, 0.3)"
                    : "2px solid rgba(255, 255, 255, 0.08)",
                }}
              />
              <div 
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all",
                )}
                style={{
                  background: conversationState === "listening"
                    ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3))"
                    : conversationState === "speaking"
                    ? "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.3))"
                    : conversationState === "processing"
                    ? "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.2))"
                    : "rgba(255, 255, 255, 0.05)",
                  border: conversationState === "listening"
                    ? "1px solid rgba(34, 197, 94, 0.3)"
                    : conversationState === "speaking"
                    ? "1px solid rgba(99, 102, 241, 0.2)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                }}
                onClick={() => {
                  if (conversationState === "idle") startListening();
                  else if (conversationState === "listening") stopListening();
                  else if (conversationState === "speaking") {
                    stopAudioPlayback();
                    setConversationState("idle");
                    resumeListening();
                  }
                }}
                data-testid="button-mic-toggle"
              >
                {conversationState === "processing" ? (
                  <Loader2 className="w-5 h-5 text-amber-400/70 animate-spin" />
                ) : conversationState === "listening" ? (
                  <Mic className="w-5 h-5 text-green-400" />
                ) : conversationState === "speaking" ? (
                  <Volume2 className="w-5 h-5 text-indigo-300" />
                ) : (
                  <Mic className="w-5 h-5 text-white/40" />
                )}
              </div>
            </div>

            <p className={cn("text-xs font-medium transition-colors", getStatusColor())}>
              {getStatusText()}
            </p>

            {error && (
              <p className="text-xs text-red-400/70">{error}</p>
            )}

            {/* Call Controls */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-opacity"
                style={{
                  background: isMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  border: isMuted ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(255, 255, 255, 0.06)",
                }}
                onClick={toggleMute}
                data-testid="button-toggle-mute"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400/70" /> : <Volume2 className="w-4 h-4 text-white/40" />}
              </div>

              <div
                className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-opacity"
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
                onClick={endCall}
                data-testid="button-end-call"
              >
                <Phone className="w-5 h-5 text-red-400 rotate-[135deg]" />
              </div>

              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-opacity",
                  conversationState === "speaking" ? "cursor-pointer opacity-100" : "opacity-30 cursor-not-allowed"
                )}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
                onClick={() => {
                  if (conversationState === "speaking") {
                    stopAudioPlayback();
                    setConversationState("idle");
                    resumeListening();
                  }
                }}
                data-testid="button-skip-response"
              >
                <SkipForward className="w-4 h-4 text-white/40" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}