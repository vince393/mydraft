import { useState } from "react";
import { useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, Loader2, Gift, Star } from "lucide-react";

export default function TestimonialRewardPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");
  const { toast } = useToast();
  const [testimonial, setTestimonial] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/testimonial-reward", {
        token,
        testimonial,
        rating,
      });
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Thank you!", description: "Your free month has been activated." });
    },
    onError: (error: Error) => {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-foreground mb-3">Invalid link</h1>
          <p className="text-sm text-muted-foreground">This testimonial link is invalid or has expired. Please check your email for the correct link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Thank you for your feedback!</h1>
          <p className="text-muted-foreground mb-6">Your free month has been applied to your account. No charges during this period.</p>
          <Button onClick={() => window.location.href = "/inbox"} data-testid="button-back-to-inbox">
            Back to Inbox
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
            <Gift className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Get a free month</h1>
          <p className="text-sm text-muted-foreground">Share your experience with MyDraft and receive a free month of your current plan.</p>
        </div>

        <div
          className="rounded-xl p-6 space-y-5"
          style={{ background: "rgba(var(--overlay-rgb), 0.02)", border: "1px solid rgba(var(--overlay-rgb), 0.06)" }}
        >
          <div>
            <label className="text-xs text-muted-foreground/60 mb-2 block">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1 transition-colors"
                  data-testid={`button-rating-${s}`}
                >
                  <Star className={`w-6 h-6 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground/60 mb-2 block">Your testimonial</label>
            <textarea
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              placeholder="What do you like most about MyDraft? How has it helped you?"
              rows={4}
              className="w-full rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
              data-testid="textarea-testimonial"
            />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!testimonial.trim() || submitMutation.isPending}
            className="w-full"
            data-testid="button-submit-testimonial"
          >
            {submitMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              "Submit & activate free month"
            )}
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground/40 mt-4">
          The free month will be applied to your current billing cycle. Normal billing resumes after.
        </p>
      </div>
    </div>
  );
}
