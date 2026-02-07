import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Send,
  Trash2,
  Edit,
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Upload,
  Sparkles,
  Target,
  TrendingUp,
  Lightbulb,
  Zap,
} from "lucide-react";
import type { EmailCampaign, CampaignRecipient } from "@shared/schema";

interface CampaignWithRecipients extends EmailCampaign {
  recipients?: CampaignRecipient[];
}

export default function CampaignsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRecipientsDialog, setShowRecipientsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendConfirmDialog, setShowSendConfirmDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithRecipients | null>(null);
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", body: "" });
  const [newRecipients, setNewRecipients] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowCreateDialog(false);
      setNewCampaign({ name: "", subject: "", body: "" });
      toast({ title: "Campaign created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create campaign", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; subject?: string; body?: string }) => {
      const res = await apiRequest("PATCH", `/api/campaigns/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowEditDialog(false);
      toast({ title: "Campaign updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update campaign", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/campaigns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowDeleteDialog(false);
      setSelectedCampaign(null);
      toast({ title: "Campaign deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete campaign", description: error.message, variant: "destructive" });
    },
  });

  const addRecipientsMutation = useMutation({
    mutationFn: async ({ id, recipients }: { id: number; recipients: { email: string; name?: string }[] }) => {
      const res = await apiRequest("POST", `/api/campaigns/${id}/recipients`, { recipients });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setNewRecipients("");
      setCsvFile(null);
      toast({ title: `Added ${data.added} recipients` });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add recipients", description: error.message, variant: "destructive" });
    },
  });

  const clearRecipientsMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/campaigns/${id}/recipients`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "All recipients cleared" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to clear recipients", description: error.message, variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/campaigns/${id}/send`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowSendConfirmDialog(false);
      setSelectedCampaign(null);
      toast({ title: "Campaign started!", description: `Sending to ${data.totalRecipients} recipients` });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send campaign", description: error.message, variant: "destructive" });
    },
  });

  const fetchCampaignDetails = async (id: number) => {
    const res = await apiRequest("GET", `/api/campaigns/${id}`);
    return res.json();
  };

  const handleOpenRecipients = async (campaign: EmailCampaign) => {
    try {
      const details = await fetchCampaignDetails(campaign.id);
      setSelectedCampaign(details);
      setShowRecipientsDialog(true);
    } catch (error) {
      toast({ title: "Failed to load recipients", variant: "destructive" });
    }
  };

  const handleAddRecipients = () => {
    if (!selectedCampaign) return;
    const lines = newRecipients.split("\n").filter((line) => line.trim());
    const recipients = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return { email: parts[0], name: parts[1] };
    });
    if (recipients.length > 0) {
      addRecipientsMutation.mutate({ id: selectedCampaign.id, recipients });
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile || !selectedCampaign) return;
    const text = await csvFile.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const recipients: { email: string; name?: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && (line.toLowerCase().includes("email") || line.toLowerCase().includes("name"))) {
        continue;
      }
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts[0]) {
        recipients.push({ email: parts[0], name: parts[1] });
      }
    }
    if (recipients.length > 0) {
      addRecipientsMutation.mutate({ id: selectedCampaign.id, recipients });
    }
  };

  const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.totalRecipients || 0), 0);
  const draftCount = campaigns.filter(c => c.status === "draft").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/inbox")}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 text-foreground/60 hover:text-foreground transition-all cursor-pointer"
              data-testid="button-back-inbox"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Campaigns</h1>
              <p className="text-foreground/40 text-xs mt-0.5">Bulk email outreach</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="h-9 px-4 rounded-full text-xs font-medium border border-primary/25 text-white transition-all cursor-pointer flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,51,234,0.3))" }}
            data-testid="button-create-campaign"
          >
            <Plus className="w-3.5 h-3.5" />
            New Campaign
          </button>
        </div>

        {/* Stats row */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Campaigns", value: campaigns.length, icon: Mail, color: "from-blue-500/15 to-blue-600/10", borderColor: "border-blue-500/15" },
              { label: "Emails Sent", value: totalSent, icon: Send, color: "from-emerald-500/15 to-emerald-600/10", borderColor: "border-emerald-500/15" },
              { label: "Recipients", value: totalRecipients, icon: Users, color: "from-purple-500/15 to-purple-600/10", borderColor: "border-purple-500/15" },
              { label: "Drafts Ready", value: draftCount, icon: Clock, color: "from-amber-500/15 to-amber-600/10", borderColor: "border-amber-500/15" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border ${stat.borderColor} backdrop-blur-sm p-3.5`}
                style={{ background: "rgba(255,255,255,0.02)" }}
                data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${stat.color}`}
                  >
                    <stat.icon className="w-3.5 h-3.5 text-foreground/60" />
                  </div>
                </div>
                <div className="text-xl font-semibold tabular-nums">{stat.value}</div>
                <div className="text-[10px] text-foreground/40 font-medium uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="space-y-6">
            {/* Empty state hero */}
            <div 
              className="flex flex-col items-center justify-center py-16 rounded-2xl border border-white/10 backdrop-blur-sm"
              style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" }}
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border border-primary/15"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1))" }}
              >
                <Mail className="w-7 h-7 text-primary/60" />
              </div>
              <h3 className="text-base font-medium mb-1.5">No campaigns yet</h3>
              <p className="text-foreground/40 text-sm mb-6 text-center max-w-sm">
                Create your first email campaign to reach your audience at scale
              </p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="h-9 px-5 rounded-full text-xs font-medium border border-primary/25 text-white transition-all cursor-pointer flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(147,51,234,0.3))" }}
                data-testid="button-create-first-campaign"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Your First Campaign
              </button>
            </div>

            {/* Campaign ideas */}
            <div>
              <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">Campaign Ideas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { 
                    icon: Sparkles, 
                    title: "Welcome Series", 
                    desc: "Onboard new subscribers with a warm introduction and key resources",
                    color: "from-blue-500/15 to-cyan-500/10",
                    borderColor: "border-blue-500/10"
                  },
                  { 
                    icon: TrendingUp, 
                    title: "Monthly Newsletter", 
                    desc: "Share updates, insights, and curated content with your audience",
                    color: "from-emerald-500/15 to-green-500/10",
                    borderColor: "border-emerald-500/10"
                  },
                  { 
                    icon: Target, 
                    title: "Product Launch", 
                    desc: "Build excitement and drive early adoption for new features or products",
                    color: "from-purple-500/15 to-pink-500/10",
                    borderColor: "border-purple-500/10"
                  },
                ].map((idea) => (
                  <button
                    key={idea.title}
                    onClick={() => {
                      setNewCampaign({ name: idea.title, subject: "", body: "" });
                      setShowCreateDialog(true);
                    }}
                    className={`rounded-xl border ${idea.borderColor} backdrop-blur-sm p-4 text-left transition-all hover:border-white/15 cursor-pointer group`}
                    style={{ background: "rgba(255,255,255,0.02)" }}
                    data-testid={`idea-${idea.title.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${idea.color} mb-3`}>
                      <idea.icon className="w-4 h-4 text-foreground/60" />
                    </div>
                    <h4 className="text-sm font-medium mb-1 group-hover:text-foreground/90 transition-colors">{idea.title}</h4>
                    <p className="text-[11px] text-foreground/35 leading-relaxed">{idea.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div 
              className="rounded-xl border border-white/8 backdrop-blur-sm p-4"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400/60" />
                <span className="text-xs font-medium text-foreground/50">Quick Tips</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Personalize subject lines for 26% higher open rates",
                  "Send campaigns between 9-11 AM for best engagement",
                  "Keep emails under 200 words for better click-through",
                  "A/B test subject lines with small batches first",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/35">
                    <Zap className="w-3 h-3 text-amber-400/40 flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="group rounded-xl border border-white/[0.06] backdrop-blur-sm transition-all hover:border-white/10 p-4"
                style={{ background: "rgba(255,255,255,0.02)" }}
                data-testid={`campaign-card-${campaign.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <h3 className="text-sm font-medium truncate">{campaign.name}</h3>
                      {campaign.status === "draft" && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 text-foreground/40" style={{ background: "rgba(255,255,255,0.03)" }}>Draft</span>
                      )}
                      {campaign.status === "sending" && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-blue-500/20 text-blue-400" style={{ background: "rgba(59,130,246,0.1)" }}>Sending</span>
                      )}
                      {campaign.status === "completed" && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400" style={{ background: "rgba(16,185,129,0.1)" }}>Completed</span>
                      )}
                      {campaign.status === "paused" && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-500/20 text-amber-400" style={{ background: "rgba(245,158,11,0.1)" }}>Paused</span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/35 truncate">{campaign.subject}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-foreground/30">
                    <Users className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{campaign.totalRecipients}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-3 text-xs text-foreground/30">
                    {campaign.status === "completed" && (
                      <>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70" />
                          <span>{campaign.sentCount} sent</span>
                        </div>
                        {campaign.failedCount > 0 && (
                          <div className="flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-red-400/70" />
                            <span>{campaign.failedCount} failed</span>
                          </div>
                        )}
                      </>
                    )}
                    {campaign.status === "sending" && (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Sending...</span>
                      </div>
                    )}
                    {campaign.status === "draft" && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {campaign.status === "draft" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenRecipients(campaign)}
                        className="h-7 px-2.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-foreground/50 hover:bg-white/10 hover:text-foreground/70 transition-all cursor-pointer flex items-center gap-1"
                        data-testid={`button-manage-recipients-${campaign.id}`}
                      >
                        <Users className="w-3 h-3" />
                        Recipients
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowEditDialog(true);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-foreground/50 hover:bg-white/10 hover:text-foreground/70 transition-all cursor-pointer"
                        data-testid={`button-edit-campaign-${campaign.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowDeleteDialog(true);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-foreground/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
                        data-testid={`button-delete-campaign-${campaign.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowSendConfirmDialog(true);
                        }}
                        disabled={campaign.totalRecipients === 0}
                        className="h-7 px-3 rounded-full text-[11px] font-medium border border-primary/20 text-primary hover:bg-primary/10 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ background: "rgba(59,130,246,0.08)" }}
                        data-testid={`button-send-campaign-${campaign.id}`}
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Campaign Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base">New Campaign</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground/50">
                Set up your email campaign details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Campaign Name</label>
                <Input
                  placeholder="e.g., January Newsletter"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  data-testid="input-campaign-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Subject Line</label>
                <Input
                  placeholder="Subject line for your email"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  data-testid="input-campaign-subject"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Email Body</label>
                <Textarea
                  placeholder="Write your email content here..."
                  value={newCampaign.body}
                  onChange={(e) => setNewCampaign({ ...newCampaign, body: e.target.value })}
                  rows={6}
                  data-testid="input-campaign-body"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newCampaign)}
                disabled={!newCampaign.name || !newCampaign.subject || !newCampaign.body || createMutation.isPending}
                data-testid="button-confirm-create-campaign"
                className="text-xs gap-1.5"
              >
                {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Edit Campaign</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground/50">
                Update your campaign details
              </DialogDescription>
            </DialogHeader>
            {selectedCampaign && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Campaign Name</label>
                  <Input
                    value={selectedCampaign.name}
                    onChange={(e) => setSelectedCampaign({ ...selectedCampaign, name: e.target.value })}
                    data-testid="input-edit-campaign-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Subject Line</label>
                  <Input
                    value={selectedCampaign.subject}
                    onChange={(e) => setSelectedCampaign({ ...selectedCampaign, subject: e.target.value })}
                    data-testid="input-edit-campaign-subject"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Email Body</label>
                  <Textarea
                    value={selectedCampaign.body}
                    onChange={(e) => setSelectedCampaign({ ...selectedCampaign, body: e.target.value })}
                    rows={6}
                    data-testid="input-edit-campaign-body"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedCampaign &&
                  updateMutation.mutate({
                    id: selectedCampaign.id,
                    name: selectedCampaign.name,
                    subject: selectedCampaign.subject,
                    body: selectedCampaign.body,
                  })
                }
                disabled={updateMutation.isPending}
                data-testid="button-confirm-edit-campaign"
                className="text-xs gap-1.5"
              >
                {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recipients Dialog */}
        <Dialog open={showRecipientsDialog} onOpenChange={setShowRecipientsDialog}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base">Manage Recipients</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground/50">
                {selectedCampaign?.name} &middot; {selectedCampaign?.totalRecipients || 0} recipients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2 flex-1 overflow-auto">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Add Manually</label>
                  <p className="text-[10px] text-muted-foreground/40 mb-2">One per line: email, name (name optional)</p>
                  <Textarea
                    placeholder={"john@example.com, John Doe\njane@example.com, Jane Smith"}
                    value={newRecipients}
                    onChange={(e) => setNewRecipients(e.target.value)}
                    rows={3}
                    data-testid="input-recipients-manual"
                  />
                  <Button
                    size="sm"
                    className="mt-2 text-xs gap-1"
                    onClick={handleAddRecipients}
                    disabled={!newRecipients.trim() || addRecipientsMutation.isPending}
                  >
                    {addRecipientsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Add Recipients
                  </Button>
                </div>

                <div className="border-t border-white/[0.04] pt-4">
                  <label className="text-xs font-medium text-muted-foreground/70 mb-1.5 block">Upload CSV</label>
                  <p className="text-[10px] text-muted-foreground/40 mb-2">CSV columns: email, name (optional)</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="flex-1 text-xs"
                      data-testid="input-csv-file"
                    />
                    <Button
                      size="sm"
                      className="text-xs gap-1"
                      onClick={handleCsvUpload}
                      disabled={!csvFile || addRecipientsMutation.isPending}
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </Button>
                  </div>
                </div>
              </div>

              {selectedCampaign?.recipients && selectedCampaign.recipients.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-xs font-medium text-muted-foreground/70">
                      Recipients ({selectedCampaign.recipients.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectedCampaign && clearRecipientsMutation.mutate(selectedCampaign.id)}
                      disabled={clearRecipientsMutation.isPending}
                      className="text-xs gap-1 text-muted-foreground/50 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
                    {selectedCampaign.recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.02]"
                        data-testid={`recipient-${recipient.id}`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs">{recipient.email}</span>
                          {recipient.name && (
                            <span className="text-[10px] text-muted-foreground/40 ml-2">({recipient.name})</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] border-white/[0.08] text-muted-foreground/50">
                          {recipient.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setShowRecipientsDialog(false)} className="text-xs">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground/50">
                Are you sure you want to delete "{selectedCampaign?.name}"? This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedCampaign && deleteMutation.mutate(selectedCampaign.id)}
                className="bg-red-500/80 hover:bg-red-500 border-red-500/30 text-xs"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Send Confirm */}
        <AlertDialog open={showSendConfirmDialog} onOpenChange={setShowSendConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">Send Campaign</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground/50">
                Send "{selectedCampaign?.name}" to {selectedCampaign?.totalRecipients} recipients? This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedCampaign && sendCampaignMutation.mutate(selectedCampaign.id)}
                disabled={sendCampaignMutation.isPending}
                className="text-xs gap-1.5"
              >
                {sendCampaignMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Send Campaign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
