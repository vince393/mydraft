import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        return <Badge variant="outline">Draft</Badge>;
      case "sending":
        return <Badge className="bg-blue-500 text-white">Sending</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case "paused":
        return <Badge className="bg-yellow-500 text-white">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/inbox")}
              data-testid="button-back-inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Email Campaigns</h1>
              <p className="text-muted-foreground text-sm">Send bulk emails for marketing and outreach</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-campaign">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first email campaign to start reaching your audience
              </p>
              <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-campaign">
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover-elevate" data-testid={`campaign-card-${campaign.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <CardDescription className="truncate">{campaign.subject}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{campaign.totalRecipients}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {campaign.status === "completed" && (
                        <>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{campaign.sentCount} sent</span>
                          </div>
                          {campaign.failedCount > 0 && (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span>{campaign.failedCount} failed</span>
                            </div>
                          )}
                        </>
                      )}
                      {campaign.status === "sending" && (
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending in progress...</span>
                        </div>
                      )}
                      {campaign.status === "draft" && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRecipients(campaign)}
                            data-testid={`button-manage-recipients-${campaign.id}`}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Recipients
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowEditDialog(true);
                            }}
                            data-testid={`button-edit-campaign-${campaign.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`button-delete-campaign-${campaign.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowSendConfirmDialog(true);
                            }}
                            disabled={campaign.totalRecipients === 0}
                            data-testid={`button-send-campaign-${campaign.id}`}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>Set up your email campaign details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Campaign Name</label>
                <Input
                  placeholder="e.g., January Newsletter"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  data-testid="input-campaign-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email Subject</label>
                <Input
                  placeholder="Subject line for your email"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  data-testid="input-campaign-subject"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email Body (HTML supported)</label>
                <Textarea
                  placeholder="Write your email content here..."
                  value={newCampaign.body}
                  onChange={(e) => setNewCampaign({ ...newCampaign, body: e.target.value })}
                  rows={8}
                  data-testid="input-campaign-body"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newCampaign)}
                disabled={!newCampaign.name || !newCampaign.subject || !newCampaign.body || createMutation.isPending}
                data-testid="button-confirm-create-campaign"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>Update your campaign details</DialogDescription>
            </DialogHeader>
            {selectedCampaign && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Campaign Name</label>
                  <Input
                    value={selectedCampaign.name}
                    onChange={(e) => setSelectedCampaign({ ...selectedCampaign, name: e.target.value })}
                    data-testid="input-edit-campaign-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email Subject</label>
                  <Input
                    value={selectedCampaign.subject}
                    onChange={(e) => setSelectedCampaign({ ...selectedCampaign, subject: e.target.value })}
                    data-testid="input-edit-campaign-subject"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email Body</label>
                  <Textarea
                    value={selectedCampaign.body}
                    onChange={(e) => setSelectedCampaign({ ...selectedCampaign, body: e.target.value })}
                    rows={8}
                    data-testid="input-edit-campaign-body"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
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
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRecipientsDialog} onOpenChange={setShowRecipientsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Manage Recipients</DialogTitle>
              <DialogDescription>
                {selectedCampaign?.name} - {selectedCampaign?.totalRecipients || 0} recipients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 flex-1 overflow-auto">
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Add Recipients Manually</label>
                  <p className="text-xs text-muted-foreground mb-2">One per line: email,name (name is optional)</p>
                  <Textarea
                    placeholder="john@example.com,John Doe&#10;jane@example.com,Jane Smith&#10;bob@example.com"
                    value={newRecipients}
                    onChange={(e) => setNewRecipients(e.target.value)}
                    rows={4}
                    data-testid="input-recipients-manual"
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleAddRecipients}
                    disabled={!newRecipients.trim() || addRecipientsMutation.isPending}
                  >
                    {addRecipientsMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Add Recipients
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-1.5 block">Or Upload CSV File</label>
                  <p className="text-xs text-muted-foreground mb-2">CSV with columns: email, name (optional)</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="flex-1"
                      data-testid="input-csv-file"
                    />
                    <Button
                      size="sm"
                      onClick={handleCsvUpload}
                      disabled={!csvFile || addRecipientsMutation.isPending}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Upload
                    </Button>
                  </div>
                </div>
              </div>

              {selectedCampaign?.recipients && selectedCampaign.recipients.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Current Recipients ({selectedCampaign.recipients.length})</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedCampaign && clearRecipientsMutation.mutate(selectedCampaign.id)}
                      disabled={clearRecipientsMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                    {selectedCampaign.recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/30"
                        data-testid={`recipient-${recipient.id}`}
                      >
                        <div>
                          <span className="text-sm">{recipient.email}</span>
                          {recipient.name && (
                            <span className="text-xs text-muted-foreground ml-2">({recipient.name})</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {recipient.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRecipientsDialog(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedCampaign?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedCampaign && deleteMutation.mutate(selectedCampaign.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSendConfirmDialog} onOpenChange={setShowSendConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                You're about to send "{selectedCampaign?.name}" to {selectedCampaign?.totalRecipients} recipients. 
                This action cannot be undone. Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedCampaign && sendCampaignMutation.mutate(selectedCampaign.id)}
                disabled={sendCampaignMutation.isPending}
              >
                {sendCampaignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Campaign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
