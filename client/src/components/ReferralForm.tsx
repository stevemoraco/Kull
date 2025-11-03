import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Gift, Mail, Check, Users } from "lucide-react";
import type { Referral } from "@shared/schema";

export function ReferralForm() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const { data: referrals = [], isLoading } = useQuery<Referral[]>({
    queryKey: ['/api/referrals'],
  });

  const createReferralMutation = useMutation({
    mutationFn: async (referredEmail: string) => {
      const response = await apiRequest("POST", "/api/referrals", { referredEmail });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
      setEmail("");
      toast({
        title: "Referral Sent!",
        description: "Your photographer friend will receive an invitation to try Kull AI.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Referral",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    createReferralMutation.mutate(email);
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const bonusUnlocked = completedReferrals >= 10 ? '3 months free' :
                        completedReferrals >= 5 ? 'Priority support' :
                        completedReferrals >= 3 ? '1 month free' :
                        completedReferrals >= 1 ? 'Bonus features' :
                        'None yet';

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-6 text-center">
          <Users className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-3xl font-black text-foreground">{referrals.length}</div>
          <div className="text-sm text-muted-foreground">Total Invited</div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 text-center">
          <Check className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-3xl font-black text-foreground">{completedReferrals}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 text-center">
          <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-lg font-bold text-foreground">{bonusUnlocked}</div>
          <div className="text-sm text-muted-foreground">Bonus Unlocked</div>
        </div>
      </div>

      {/* Referral form */}
      {referrals.length < 10 && (
        <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4 text-card-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Invite a Photographer
          </h3>
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="photographer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              data-testid="input-referral-email"
            />
            <Button
              type="submit"
              disabled={createReferralMutation.isPending}
              data-testid="button-send-referral"
            >
              {createReferralMutation.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {10 - referrals.length} referrals remaining to reach maximum bonuses
          </p>
        </form>
      )}

      {referrals.length >= 10 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center">
          <Gift className="w-12 h-12 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-xl mb-2 text-foreground">Maximum Reached!</h3>
          <p className="text-muted-foreground">
            You've unlocked all referral bonuses. Amazing work spreading the word about Kull AI!
          </p>
        </div>
      )}

      {/* Referral list */}
      {referrals.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4 text-card-foreground">Your Referrals</h3>
          <div className="space-y-2">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                data-testid={`referral-item-${referral.id}`}
              >
                <span className="text-sm text-foreground">{referral.referredEmail}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  referral.status === 'completed' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {referral.status === 'completed' ? 'Joined' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
