import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Copy, Users, Trophy, ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ReferralData {
  referralCode: string;
  stats: { total: number; subscribed: number };
}

export function ReferralBanner({ collapsed }: { collapsed?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  const { data } = useQuery<ReferralData>({
    queryKey: ["/api/referrals/stats"],
  });

  if (isDismissed || !data) return null;

  const copyLink = () => {
    const link = `https://mydraft.io/login?mode=register&ref=${data.referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Invite link copied to clipboard." });
  };

  if (collapsed) {
    return (
      <>
        <div className="px-2 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsModalOpen(true)}
                data-testid="button-referral-collapsed"
              >
                <Gift className="w-5 h-5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Earn 25 credits per friend</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <ReferralModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={data}
          onCopyLink={copyLink}
        />
      </>
    );
  }

  return (
    <>
      <div className="mx-2 mb-2 relative">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsModalOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setIsModalOpen(true); }}
          className="w-full text-left rounded-lg p-3 border border-primary/20 cursor-pointer hover-elevate transition-all"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))" }}
          data-testid="button-referral-banner"
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-1 right-1 w-6 h-6"
            onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
            data-testid="button-dismiss-referral"
          >
            <X className="w-3 h-3 text-muted-foreground/40" />
          </Button>
          <div className="flex items-center gap-2 mb-1.5">
            <Gift className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold text-foreground">Free Credits</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
            Invite a friend — you both get 25 credits when they connect their inbox.
          </p>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-muted-foreground">
              {data.stats.subscribed} joined · {data.stats.subscribed * 25} credits earned
            </span>
            <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              Learn more <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
      <ReferralModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        data={data}
        onCopyLink={copyLink}
      />
    </>
  );
}

function ReferralModal({
  open,
  onOpenChange,
  data,
  onCopyLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReferralData;
  onCopyLink: () => void;
}) {
  const referralLink = `https://mydraft.io/login?mode=register&ref=${data.referralCode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 rounded-lg" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))" }}>
              <Gift className="w-5 h-5 text-primary" />
            </div>
            Give 25, Get 25
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Love MyDraft? Share it with people you know. When a friend signs up with your link and connects their inbox, you both get 25 credits — automatically. No limit on how many you can earn.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <StepCard
              icon={<Copy className="w-4 h-4" />}
              title="Share"
              description="Send your link"
            />
            <StepCard
              icon={<Users className="w-4 h-4" />}
              title="They Connect"
              description="Friend links inbox"
            />
            <StepCard
              icon={<Trophy className="w-4 h-4" />}
              title="You Both Earn"
              description="25 credits each"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Invite Link</Label>
            <div className="flex items-center gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-xs"
                data-testid="input-referral-link-modal"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={onCopyLink}
                data-testid="button-copy-referral-modal"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Credits Earned</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {data.stats.subscribed * 25}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              You've earned {data.stats.subscribed * 25} credits from referrals. Keep inviting — there's no limit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xl font-bold" data-testid="text-total-referrals-modal">{data.stats.total}</p>
              <p className="text-xs text-muted-foreground">Friends Invited</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xl font-bold" data-testid="text-subscribed-referrals-modal">{data.stats.subscribed}</p>
              <p className="text-xs text-muted-foreground">Connected Inbox</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Credits are added automatically when your friend signs up with your link and connects their inbox. One reward per new friend.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/30 text-center">
      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-xs font-semibold">{title}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
    </div>
  );
}
