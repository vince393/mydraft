import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, X, ChevronDown, ChevronUp, Undo2 } from "lucide-react";

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "new" | "reply" | "replyAll" | "forward";
  originalEmail?: {
    id: string;
    subject: string;
    from: string;
    fromEmail: string;
    to?: string[];
    cc?: string[];
    body: string;
    date: Date;
  };
  currentUserEmail?: string;
}

export function ComposeDialog({ 
  open, 
  onOpenChange, 
  mode = "new",
  originalEmail,
  currentUserEmail = ""
}: ComposeDialogProps) {
  const { toast } = useToast();
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  
  // Track if form has been initialized to prevent overwriting user edits
  const initializedRef = useRef(false);
  const lastEmailIdRef = useRef<string | undefined>(undefined);

  // Reset form when dialog opens with new content
  useEffect(() => {
    if (!open) return;
    
    // For new messages, always initialize with empty fields
    if (mode === "new") {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setTo("");
        setCc("");
        setBcc("");
        setSubject("");
        setBody("");
        setShowCcBcc(false);
      }
      return;
    }
    
    // For reply/replyAll/forward, wait until we have valid originalEmail data
    // Skip initialization if originalEmail is undefined or doesn't have the required fields
    if (!originalEmail || !originalEmail.id) return;
    
    // Only initialize if this is a new dialog opening or different email
    const currentEmailId = originalEmail.id;
    const shouldInitialize = !initializedRef.current || lastEmailIdRef.current !== currentEmailId;
    
    if (!shouldInitialize) return;
    
    initializedRef.current = true;
    lastEmailIdRef.current = currentEmailId;
    
    // Reset showCcBcc based on mode
    setShowCcBcc(mode === "replyAll");
    setBcc("");
    
    if (mode === "reply") {
      setTo(originalEmail.fromEmail);
      setCc("");
      setSubject(originalEmail.subject.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      setBody(`\n\n---------- Original message ----------\nFrom: ${originalEmail.from} <${originalEmail.fromEmail}>\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body.replace(/<[^>]*>/g, '')}`);
    } else if (mode === "replyAll") {
      setTo(originalEmail.fromEmail);
      const allRecipients = [...(originalEmail.to || []), ...(originalEmail.cc || [])];
      const normalizedCurrentEmail = currentUserEmail.toLowerCase();
      const uniqueCc = Array.from(new Set(allRecipients)).filter(email => 
        email.toLowerCase() !== originalEmail.fromEmail.toLowerCase() && 
        email.toLowerCase() !== normalizedCurrentEmail
      );
      setCc(uniqueCc.join(", "));
      setSubject(originalEmail.subject.startsWith("Re:") ? originalEmail.subject : `Re: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      setBody(`\n\n---------- Original message ----------\nFrom: ${originalEmail.from} <${originalEmail.fromEmail}>\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body.replace(/<[^>]*>/g, '')}`);
    } else if (mode === "forward") {
      setTo("");
      setCc("");
      setSubject(originalEmail.subject.startsWith("Fwd:") ? originalEmail.subject : `Fwd: ${originalEmail.subject}`);
      const date = new Date(originalEmail.date).toLocaleString();
      setBody(`\n\n---------- Forwarded message ----------\nFrom: ${originalEmail.from} <${originalEmail.fromEmail}>\nDate: ${date}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body.replace(/<[^>]*>/g, '')}`);
    }
  }, [open, mode, originalEmail, currentUserEmail]);

  const cancelMutation = useMutation({
    mutationFn: async (pendingSendId: number) => {
      const response = await apiRequest("POST", `/api/pending-sends/${pendingSendId}/cancel`);
      return response.json();
    },
  });

  const showUndoToast = useCallback((pendingSendId: number, delaySeconds: number, toRecipients: string[]) => {
    let remaining = delaySeconds;
    const recipientText = toRecipients.length > 1 
      ? `${toRecipients[0]} and ${toRecipients.length - 1} other${toRecipients.length > 2 ? 's' : ''}`
      : toRecipients[0];
    
    const { id: toastId, dismiss, update } = toast({
      title: "Sending email...",
      description: (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">To: {recipientText} ({remaining}s)</span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              clearInterval(intervalId);
              dismiss();
              try {
                await cancelMutation.mutateAsync(pendingSendId);
                toast({
                  title: "Email cancelled",
                  description: "Your message was not sent.",
                });
              } catch {
                toast({
                  title: "Could not cancel",
                  description: "The email may have already been sent.",
                  variant: "destructive",
                });
              }
            }}
            data-testid="button-undo-send"
          >
            <Undo2 className="w-3 h-3 mr-1" />
            Undo
          </Button>
        </div>
      ),
      duration: (delaySeconds + 1) * 1000,
    });

    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(intervalId);
        update({
          id: toastId,
          title: "Email sent",
          description: `Your message to ${recipientText} was sent.`,
          duration: 3000,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
        return;
      }
      update({
        id: toastId,
        title: "Sending email...",
        description: (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">To: {recipientText} ({remaining}s)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                clearInterval(intervalId);
                dismiss();
                try {
                  await cancelMutation.mutateAsync(pendingSendId);
                  toast({
                    title: "Email cancelled",
                    description: "Your message was not sent.",
                  });
                } catch {
                  toast({
                    title: "Could not cancel",
                    description: "The email may have already been sent.",
                    variant: "destructive",
                  });
                }
              }}
              data-testid="button-undo-send"
            >
              <Undo2 className="w-3 h-3 mr-1" />
              Undo
            </Button>
          </div>
        ),
        duration: (remaining + 1) * 1000,
      });
    }, 1000);
  }, [toast, cancelMutation]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const toRecipients = to.split(",").map(e => e.trim()).filter(Boolean);
      if (toRecipients.length === 0) {
        throw new Error("Please enter at least one recipient");
      }
      
      const ccRecipients = cc ? cc.split(",").map(e => e.trim()).filter(Boolean) : [];
      const bccRecipients = bcc ? bcc.split(",").map(e => e.trim()).filter(Boolean) : [];

      const payload: Record<string, unknown> = {
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject,
        body,
        delaySeconds: 5,
      };
      
      if ((mode === "reply" || mode === "replyAll") && originalEmail) {
        payload.replyToMessageId = originalEmail.id;
      }

      const response = await apiRequest("POST", "/api/send", payload);
      const data = await response.json();
      return { ...data, toRecipients };
    },
    onSuccess: (data) => {
      onOpenChange(false);
      resetForm();
      
      if (data.pendingSendId) {
        showUndoToast(data.pendingSendId, data.delaySeconds || 5, data.toRecipients);
      } else {
        toast({
          title: "Email sent",
          description: "Your message has been sent successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    initializedRef.current = false;
    lastEmailIdRef.current = undefined;
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const getDialogTitle = () => {
    switch (mode) {
      case "reply": return "Reply";
      case "replyAll": return "Reply All";
      case "forward": return "Forward";
      default: return "New Message";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="to" className="w-12 text-right text-muted-foreground text-sm">
                To
              </Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1"
                data-testid="input-compose-to"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-muted-foreground text-xs"
              >
                Cc/Bcc
                {showCcBcc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </div>
            
            {showCcBcc && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cc" className="w-12 text-right text-muted-foreground text-sm">
                    Cc
                  </Label>
                  <Input
                    id="cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1"
                    data-testid="input-compose-cc"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="bcc" className="w-12 text-right text-muted-foreground text-sm">
                    Bcc
                  </Label>
                  <Input
                    id="bcc"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1"
                    data-testid="input-compose-bcc"
                  />
                </div>
              </>
            )}
            
            <div className="flex items-center gap-2">
              <Label htmlFor="subject" className="w-12 text-right text-muted-foreground text-sm">
                Subject
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1"
                data-testid="input-compose-subject"
              />
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="h-full min-h-[200px] resize-none"
              data-testid="textarea-compose-body"
            />
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t flex-shrink-0">
            <Button
              variant="ghost"
              onClick={handleClose}
              data-testid="button-compose-cancel"
            >
              <X className="w-4 h-4 mr-2" />
              Discard
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !to.trim()}
              data-testid="button-compose-send"
            >
              {sendMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
