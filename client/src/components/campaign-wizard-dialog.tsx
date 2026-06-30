import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Megaphone,
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
  Upload,
  FlaskConical,
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  Paperclip,
  FileText,
  X,
} from "lucide-react";

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const CAMPAIGN_WIZARD_SKIP_INTRO_KEY = "mydraft:campaignWizardSkipIntro";

const PERSONALIZATION_VARS = ["{name}", "{first_name}", "{last_name}", "{email}", "{company}"];

type Step = "intro" | "details" | "recipients" | "test" | "review" | "done";

const FLOW: Step[] = ["details", "recipients", "test", "review", "done"];

interface CampaignWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignWizardDialog({ open, onOpenChange }: CampaignWizardDialogProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("intro");
  const [dontShowIntro, setDontShowIntro] = useState(false);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [recipientsText, setRecipientsText] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);
  const [testSent, setTestSent] = useState(false);

  const [campaignId, setCampaignId] = useState<number | null>(null);

  const [attachments, setAttachments] = useState<
    { filename: string; size: number; content: string; contentType: string; uploaded: boolean; serverId?: number }[]
  >([]);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const attachRef = useRef<HTMLInputElement | null>(null);

  // Reset everything when the wizard is (re)opened. Skip the intro if the user
  // previously opted out — they jump straight to the details step.
  useEffect(() => {
    if (!open) return;
    const skipIntro = localStorage.getItem(CAMPAIGN_WIZARD_SKIP_INTRO_KEY) === "1";
    setStep(skipIntro ? "details" : "intro");
    setDontShowIntro(false);
    setName("");
    setSubject("");
    setBody("");
    setRecipientsText("");
    setRecipientCount(0);
    setTestSent(false);
    setCampaignId(null);
    setAttachments([]);
  }, [open]);

  // Upload any not-yet-uploaded attachments to the given campaign.
  const uploadPendingAttachments = async (id: number) => {
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      if (att.uploaded) continue;
      try {
        const res = await apiRequest("POST", `/api/campaigns/${id}/attachments`, {
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        });
        const created = await res.json();
        setAttachments((prev) =>
          prev.map((a, idx) => (idx === i ? { ...a, uploaded: true, serverId: created?.id } : a)),
        );
      } catch (error: any) {
        toast({ title: `Couldn't attach "${att.filename}"`, description: error.message, variant: "destructive" });
      }
    }
  };

  const saveCampaignMutation = useMutation({
    mutationFn: async () => {
      if (campaignId) {
        const res = await apiRequest("PATCH", `/api/campaigns/${campaignId}`, { name, subject, body });
        return res.json();
      }
      const res = await apiRequest("POST", "/api/campaigns", { name, subject, body });
      return res.json();
    },
    onSuccess: (campaign: { id: number }) => {
      if (campaign?.id) setCampaignId(campaign.id);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
  });

  const addRecipientsMutation = useMutation({
    mutationFn: async (recipients: { email: string; name?: string }[]) => {
      if (!campaignId) throw new Error("Campaign not created yet");
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/recipients`, { recipients });
      return res.json();
    },
    onSuccess: (data: { added: number }) => {
      setRecipientCount((prev) => prev + (data.added || 0));
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: `Added ${data.added} recipient${data.added === 1 ? "" : "s"}` });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't add recipients", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Campaign not created yet");
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/test`);
      return res.json();
    },
    onSuccess: () => {
      setTestSent(true);
      toast({ title: "Test email sent!", description: "Check your own inbox for the preview." });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't send test", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Campaign not created yet");
      const res = await apiRequest("POST", `/api/campaigns/${campaignId}/send`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setStep("done");
    },
    onError: (error: any) => {
      toast({ title: "Couldn't send campaign", description: error.message, variant: "destructive" });
    },
  });

  const insertVariable = useCallback((variable: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + variable);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setBody((b) => b.substring(0, start) + variable + b.substring(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    });
  }, []);

  const parseRecipientLines = (text: string): { email: string; name?: string }[] =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        return { email: parts[0], name: parts[1] };
      })
      .filter((r) => r.email);

  const handleAddManual = () => {
    const recipients = parseRecipientLines(recipientsText);
    if (recipients.length === 0) {
      toast({ title: "Add at least one email address", variant: "destructive" });
      return;
    }
    addRecipientsMutation.mutate(recipients, { onSuccess: () => setRecipientsText("") });
  };

  const handleCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const recipients: { email: string; name?: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && (line.toLowerCase().includes("email") || line.toLowerCase().includes("name"))) continue;
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts[0]) recipients.push({ email: parts[0], name: parts[1] });
    }
    if (recipients.length === 0) {
      toast({ title: "No valid rows found in that file", variant: "destructive" });
      return;
    }
    addRecipientsMutation.mutate(recipients);
  };

  const goNext = async () => {
    if (step === "intro") {
      if (dontShowIntro) localStorage.setItem(CAMPAIGN_WIZARD_SKIP_INTRO_KEY, "1");
      setStep("details");
      return;
    }
    if (step === "details") {
      if (!name.trim() || !subject.trim() || !body.trim()) {
        toast({ title: "Fill in the name, subject and message first", variant: "destructive" });
        return;
      }
      try {
        const campaign = await saveCampaignMutation.mutateAsync();
        const id = campaign?.id ?? campaignId;
        if (id) await uploadPendingAttachments(id);
        setStep("recipients");
      } catch (error: any) {
        toast({ title: "Couldn't save campaign", description: error.message, variant: "destructive" });
      }
      return;
    }
    if (step === "recipients") {
      if (recipientCount === 0) {
        toast({ title: "Add at least one recipient to continue", variant: "destructive" });
        return;
      }
      setStep("test");
      return;
    }
    if (step === "test") {
      setStep("review");
      return;
    }
    if (step === "review") {
      sendMutation.mutate();
      return;
    }
  };

  const goBack = () => {
    if (step === "details") setStep("intro");
    else if (step === "recipients") setStep("details");
    else if (step === "test") setStep("recipients");
    else if (step === "review") setStep("test");
  };

  const flowIndex = FLOW.indexOf(step as Step);
  const showStepper = step !== "intro" && step !== "done";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-campaign-wizard">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15 border border-primary/25">
              <Megaphone className="w-4 h-4 text-primary" />
            </span>
            Email Campaign
          </DialogTitle>
          <DialogDescription>
            {step === "intro" && "Send a personalized email to many people at once."}
            {step === "details" && "Step 1 — Write your campaign."}
            {step === "recipients" && "Step 2 — Add who receives it."}
            {step === "test" && "Step 3 — Send yourself a test (optional)."}
            {step === "review" && "Step 4 — Review and send."}
            {step === "done" && "Your campaign is on its way."}
          </DialogDescription>
        </DialogHeader>

        {showStepper && (
          <div className="flex items-center gap-1.5 mb-1">
            {FLOW.slice(0, 4).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= flowIndex ? "bg-primary" : "bg-foreground/10"
                }`}
                data-testid={`wizard-progress-${i}`}
              />
            ))}
          </div>
        )}

        <div className="py-1 space-y-4">
          {step === "intro" && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {[
                  { icon: Sparkles, text: "Write one message with personalization like {first_name}." },
                  { icon: Users, text: "Add recipients by typing them or uploading a CSV file." },
                  { icon: FlaskConical, text: "Send yourself a test, then send to everyone." },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-foreground/70">
                    <row.icon className="w-4 h-4 text-primary/70 mt-0.5 flex-shrink-0" />
                    <span>{row.text}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground/50 cursor-pointer pt-1">
                <Checkbox
                  checked={dontShowIntro}
                  onCheckedChange={(v) => setDontShowIntro(v === true)}
                  data-testid="checkbox-dont-show-intro"
                />
                Don't show this intro again
              </label>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-foreground/50 mb-1.5 block">Campaign name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. October Newsletter"
                  data-testid="input-campaign-name"
                />
              </div>
              <div>
                <label className="text-xs text-foreground/50 mb-1.5 block">Subject line</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Hi {first_name}, a quick update"
                  data-testid="input-campaign-subject"
                />
              </div>
              <div>
                <label className="text-xs text-foreground/50 mb-1.5 block">Message</label>
                <Textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email here..."
                  className="min-h-[140px]"
                  data-testid="textarea-campaign-body"
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-foreground/30">Insert:</span>
                  {PERSONALIZATION_VARS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-primary/20 text-primary/70 hover:text-primary hover:border-primary/40 transition-all"
                      data-testid={`wizard-chip-${v.replace(/[{}]/g, "")}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-foreground/50 mb-1.5 block">Attachments (optional)</label>
                {attachments.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-foreground/10 px-2.5 py-1.5 bg-foreground/[0.02]"
                        data-testid={`wizard-attachment-${i}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-foreground/40 flex-shrink-0" />
                        <span className="text-xs truncate flex-1" data-testid={`wizard-attachment-name-${i}`}>{att.filename}</span>
                        <span className="text-[10px] text-foreground/30 tabular-nums">{formatFileSize(att.size)}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            // If already uploaded to the server, delete it there too
                            // so a "removed" file is never actually sent.
                            if (att.uploaded && att.serverId && campaignId) {
                              try {
                                await apiRequest(
                                  "DELETE",
                                  `/api/campaigns/${campaignId}/attachments/${att.serverId}`,
                                );
                              } catch (error: any) {
                                toast({ title: `Couldn't remove "${att.filename}"`, description: error.message, variant: "destructive" });
                                return;
                              }
                            }
                            setAttachments((prev) => prev.filter((_, idx) => idx !== i));
                          }}
                          className="text-foreground/30 hover:text-red-400 transition-colors cursor-pointer"
                          data-testid={`button-remove-wizard-attachment-${i}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => attachRef.current?.click()}
                  data-testid="button-add-wizard-attachment"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Add file
                </Button>
                <p className="text-[10px] text-foreground/30 mt-1.5">Sent to every recipient · max 10MB each, 25MB total</p>
                <input
                  ref={attachRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    for (const file of files) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast({ title: `"${file.name}" is too large`, description: "Max 10MB per file", variant: "destructive" });
                        continue;
                      }
                      const content = await fileToBase64(file);
                      setAttachments((prev) => [
                        ...prev,
                        { filename: file.name, size: file.size, content, contentType: file.type || "application/octet-stream", uploaded: false },
                      ]);
                    }
                  }}
                  data-testid="input-wizard-attachment-file"
                />
              </div>
            </div>
          )}

          {step === "recipients" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/50">Added so far</span>
                <span className="text-sm font-medium tabular-nums flex items-center gap-1.5" data-testid="text-recipient-count">
                  <Users className="w-3.5 h-3.5 text-foreground/40" />
                  {recipientCount}
                </span>
              </div>
              <Textarea
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                placeholder={"One per line:\njohn@example.com, John Doe\njane@example.com, Jane"}
                className="min-h-[110px] font-mono text-xs"
                data-testid="textarea-recipients"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddManual}
                  disabled={addRecipientsMutation.isPending}
                  data-testid="button-add-recipients"
                >
                  {addRecipientsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                  Add typed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={addRecipientsMutation.isPending}
                  data-testid="button-upload-csv"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload CSV
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsv(file);
                    e.target.value = "";
                  }}
                  data-testid="input-csv-file"
                />
              </div>
            </div>
          )}

          {step === "test" && (
            <div className="space-y-3">
              <p className="text-sm text-foreground/60">
                Send a copy to your own inbox to check how it looks before sending to everyone.
              </p>
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                data-testid="button-send-test"
              >
                {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                Send test to myself
              </Button>
              {testSent && (
                <div className="flex items-center gap-2 text-xs text-emerald-400" data-testid="text-test-sent">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Test sent — check your inbox.
                </div>
              )}
            </div>
          )}

          {step === "review" && (
            <div className="space-y-2.5 text-sm">
              <div className="rounded-xl border border-foreground/10 p-3.5 space-y-2">
                <div className="flex justify-between gap-3">
                  <span className="text-foreground/40 text-xs">Name</span>
                  <span className="text-right truncate" data-testid="review-name">{name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-foreground/40 text-xs">Subject</span>
                  <span className="text-right truncate" data-testid="review-subject">{subject}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-foreground/40 text-xs">Recipients</span>
                  <span className="text-right font-medium" data-testid="review-recipients">{recipientCount}</span>
                </div>
              </div>
              <p className="text-xs text-foreground/40">
                This sends your message to all {recipientCount} recipients. This can't be undone.
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center py-4 space-y-3">
              <span className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/25">
                <Check className="w-6 h-6 text-emerald-400" />
              </span>
              <p className="text-sm text-foreground/70">
                Your campaign is sending to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/campaigns");
                }}
                data-testid="button-view-dashboard"
              >
                View campaign dashboard
              </Button>
              <label className="flex items-center gap-2 text-xs text-foreground/50 cursor-pointer pt-1">
                <Checkbox
                  checked={dontShowIntro}
                  onCheckedChange={(v) => {
                    const skip = v === true;
                    setDontShowIntro(skip);
                    if (skip) localStorage.setItem(CAMPAIGN_WIZARD_SKIP_INTRO_KEY, "1");
                    else localStorage.removeItem(CAMPAIGN_WIZARD_SKIP_INTRO_KEY);
                  }}
                  data-testid="checkbox-dont-show-intro-done"
                />
                Skip this walkthrough next time
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {step !== "intro" && step !== "done" ? (
            <Button variant="ghost" size="sm" onClick={goBack} data-testid="button-wizard-back">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <span />
          )}

          {step === "done" ? (
            <Button size="sm" onClick={() => onOpenChange(false)} data-testid="button-wizard-close">
              Done
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={goNext}
              disabled={saveCampaignMutation.isPending || sendMutation.isPending}
              data-testid="button-wizard-next"
            >
              {saveCampaignMutation.isPending || sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step === "review" ? (
                <>
                  <Send className="w-4 h-4" />
                  Send campaign
                </>
              ) : step === "intro" ? (
                <>
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
