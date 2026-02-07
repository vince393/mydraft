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
  X,
  FileSpreadsheet,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="border-white/[0.1] text-muted-foreground">Draft</Badge>;
      case "sending":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Sending</Badge>;
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</Badge>;
      case "paused":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/inbox")}
              data-testid="button-back-inbox"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
              <p className="text-muted-foreground/60 text-xs mt-0.5">Bulk email outreach</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            data-testid="button-create-campaign"
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
              <Mail className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-medium mb-1.5">No campaigns yet</h3>
            <p className="text-muted-foreground/50 text-sm mb-6 text-center max-w-sm">
              Create your first email campaign to start reaching your audience
            </p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-campaign">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4"
                data-testid={`campaign-card-${campaign.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="text-sm font-medium truncate">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-xs text-muted-foreground/50 truncate">{campaign.subject}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/40">
                    <Users className="w-3.5 h-3.5" />
                    <span>{campaign.totalRecipients}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/40">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenRecipients(campaign)}
                        data-testid={`button-manage-recipients-${campaign.id}`}
                        className="text-xs h-7 px-2 gap-1"
                      >
                        <Users className="w-3 h-3" />
                        Recipients
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowEditDialog(true);
                        }}
                        data-testid={`button-edit-campaign-${campaign.id}`}
                        className="h-7 w-7"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowDeleteDialog(true);
                        }}
                        data-testid={`button-delete-campaign-${campaign.id}`}
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowSendConfirmDialog(true);
                        }}
                        disabled={campaign.totalRecipients === 0}
                        data-testid={`button-send-campaign-${campaign.id}`}
                        className="text-xs h-7 px-3 gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </Button>
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
                    className="mt-2 text-xs h-7 gap-1"
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
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="flex-1 text-xs"
                      data-testid="input-csv-file"
                    />
                    <Button
                      size="sm"
                      className="text-xs h-7 gap-1"
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground/70">
                      Recipients ({selectedCampaign.recipients.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectedCampaign && clearRecipientsMutation.mutate(selectedCampaign.id)}
                      disabled={clearRecipientsMutation.isPending}
                      className="text-xs h-6 px-2 gap-1 text-muted-foreground/50 hover:text-red-400"
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
                        <Badge variant="outline" className="text-[10px] border-white/[0.08] text-muted-foreground/50 h-5">
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
