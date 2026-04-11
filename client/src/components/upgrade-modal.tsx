import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Mic } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredPlan: "pro" | "premium";
  feature: string;
}

export function UpgradeModal({ open, onOpenChange, requiredPlan, feature }: UpgradeModalProps) {
  const planDetails = {
    pro: {
      name: "Pro",
      icon: Sparkles,
      color: "from-blue-500 to-cyan-500",
      features: [
        "AI email summaries",
        "AI draft composition",
        "Smart reply suggestions",
        "Draft review & improvement",
        "Learning & personalization",
      ],
    },
    premium: {
      name: "Premium",
      icon: Crown,
      color: "from-purple-500 to-pink-500",
      features: [
        "Everything in Pro",
        "Voice assistant (Vince)",
        "Voice input & output",
        "Multiple voice options",
        "Highest AI limits",
        "Priority support",
      ],
    },
  };

  const details = planDetails[requiredPlan];
  const Icon = details.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${details.color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl">Upgrade to {details.name}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            <span className="font-medium text-foreground">{feature}</span> requires a {details.name} plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground font-medium">
            {details.name} includes:
          </p>
          <ul className="space-y-2">
            {details.features.map((feat, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${details.color}`} />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button 
            className={`bg-gradient-to-r ${details.color} text-white border-0`}
            onClick={() => {
              window.location.href = "/pricing?upgrade=true";
            }}
          >
            View Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
