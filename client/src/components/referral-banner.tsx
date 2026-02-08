import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Copy, Users, Trophy, ArrowRight, X, Sparkles, CheckCircle2 } from "lucide-react";
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
  proCreditsUntil: string | null;
  progressToNextReward: number;
  subscribedNeeded: number;
}

export function ReferralBanner({ collapsed }: { collapsed?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  const { data } = useQuery<ReferralData>({
    queryKey: ["/api/referrals/stats"],
  });

  if (isDismissed || !data) return null;

  const progress = (data.progressToNextReward / 2) * 100;
  const creditsActive = data.proCreditsUntil && new Date(data.proCreditsUntil) > new Date();

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
              <p>Earn free Pro months</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <ReferralModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          data={data}
          progress={progress}
          creditsActive={!!creditsActive}
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
            <span className="text-xs font-semibold text-foreground">Free Pro Month</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
            Invite 2 friends who subscribe and get a free month of Pro.
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-1.5">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-muted-foreground">
              {data.progressToNextReward}/2 subscribed
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
        progress={progress}
        creditsActive={!!creditsActive}
        onCopyLink={copyLink}
      />
    </>
  );
}

function ReferralModal({
  open,
  onOpenChange,
  data,
  progress,
  creditsActive,
  onCopyLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReferralData;
  progress: number;
  creditsActive: boolean;
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
            Give Pro, Get Pro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Love MyDraft? Share it with people you know. When 2 of your referrals become paying members, you'll get a full month of Pro for free. No limit on how many you can earn.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <StepCard
              icon={<Copy className="w-4 h-4" />}
              title="Share"
              description="Send your link"
            />
            <StepCard
              icon={<Users className="w-4 h-4" />}
              title="They Join"
              description="Friends sign up"
            />
            <StepCard
              icon={<Trophy className="w-4 h-4" />}
              title="You Earn"
              description="Get free Pro"
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
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Progress</span>
              <Badge variant="secondary">
                {data.progressToNextReward} / 2
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                }}
              />
            </div>
            {data.subscribedNeeded > 0 ? (
              <p className="text-xs text-muted-foreground">
                {data.subscribedNeeded === 1
                  ? "Just 1 more friend away from your free Pro month."
                  : `${data.subscribedNeeded} friends away from your free Pro month.`}
              </p>
            ) : (
              <p className="text-xs text-primary font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Reward earned! Keep inviting for more free months.
              </p>
            )}
          </div>

          {creditsActive && (
            <div className="p-3 rounded-lg border border-primary/20" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))" }}>
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Pro credit active until {new Date(data.proCreditsUntil!).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xl font-bold" data-testid="text-total-referrals-modal">{data.stats.total}</p>
              <p className="text-xs text-muted-foreground">Friends Invited</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xl font-bold" data-testid="text-subscribed-referrals-modal">{data.stats.subscribed}</p>
              <p className="text-xs text-muted-foreground">Became Members</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Referrals count when your friend signs up with your link and starts a paid subscription. Free trials don't count toward rewards.
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
