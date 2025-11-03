import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Gift, Mail, Check, Users, Plus, X, AlertCircle, Calendar, HeadphonesIcon, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Referral } from "@shared/schema";

export function ReferralForm() {
  const [emails, setEmails] = useState<string[]>(["", "", ""]); // 3 fields by default
  const { toast } = useToast();

  const { data: referrals = [], isLoading } = useQuery<Referral[]>({
    queryKey: ['/api/referrals'],
  });

  const createReferralsMutation = useMutation({
    mutationFn: async (referredEmails: string[]) => {
      // Send all emails in parallel
      const promises = referredEmails.map(email =>
        apiRequest("POST", "/api/referrals", { referredEmail: email }).then(r => r.json())
      );
      const results = await Promise.all(promises);
      
      // Send confirmation email to referrer
      try {
        await apiRequest("POST", "/api/referrals/confirm", { referredEmails });
      } catch (confirmError) {
        console.error("Failed to send confirmation email:", confirmError);
        // Don't fail the whole operation if confirmation email fails
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
      setEmails(["", "", ""]);
      toast({
        title: `${results.length} Referral${results.length > 1 ? 's' : ''} Sent!`,
        description: "Your photographer friends will receive invitations. Check your email for confirmation!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Referrals",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validEmails = emails.filter(email => email && email.includes('@'));
    
    if (validEmails.length === 0) {
      toast({
        title: "No Valid Emails",
        description: "Please enter at least one valid email address",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates within the form
    const uniqueEmails = Array.from(new Set(validEmails));
    if (uniqueEmails.length !== validEmails.length) {
      toast({
        title: "Duplicate Emails",
        description: "Please remove duplicate email addresses",
        variant: "destructive",
      });
      return;
    }

    // Check if any email is already referred
    const alreadyReferred = uniqueEmails.filter(email => 
      referrals.some(r => r.referredEmail === email)
    );
    
    if (alreadyReferred.length > 0) {
      toast({
        title: "Email Already Referred",
        description: `${alreadyReferred[0]} has already been invited`,
        variant: "destructive",
      });
      return;
    }

    createReferralsMutation.mutate(uniqueEmails);
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addEmailField = () => {
    if (emails.length + referrals.length >= 10) {
      toast({
        title: "Maximum Limit",
        description: "You can only have up to 10 total referrals",
        variant: "destructive",
      });
      return;
    }
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    if (emails.length <= 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const totalSent = referrals.length;
  
  // Determine unlocked bonuses based on new tier system
  const bonusUnlocked = (totalSent >= 10 || completedReferrals >= 3) ? '3 months free' :
                        totalSent >= 5 ? 'Priority support' :
                        totalSent >= 3 ? '1 month free' :
                        'None yet';

  // Calculate next reward based on current status + filled emails
  const getNextReward = () => {
    const filledEmails = emails.filter(email => email && email.includes('@')).length;
    const potentialSent = totalSent + filledEmails;
    
    // New tier system: 1mo free (3 sent), 3mo free (10 sent OR 3 completed), priority support (5 sent)
    
    // If nothing filled yet, show first milestone
    if (filledEmails === 0) {
      if (totalSent < 3) return { count: 3 - totalSent, reward: "1 month free", type: "first" };
      if (totalSent < 5) return { count: 5 - totalSent, reward: "Priority support", type: "first" };
      if (totalSent < 10 && completedReferrals < 3) return { count: 10 - totalSent, reward: "3 months free", type: "first" };
      return null;
    }
    
    // With filled emails, calculate next milestone
    if (potentialSent < 3) return { count: 3 - totalSent, reward: "1 month free", type: "next" };
    if (potentialSent < 5) return { count: 5 - totalSent, reward: "Priority support", type: "next" };
    if (potentialSent < 10 && completedReferrals < 3) return { count: 10 - totalSent, reward: "3 months free", type: "next" };
    
    return { count: 0, reward: "Maximum bonuses unlocked!", type: "complete" };
  };

  const nextReward = getNextReward();
  const filledCount = emails.filter(email => email && email.includes('@')).length;

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
            Invite Photographers
          </h3>
          
          <div className="space-y-3">
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder={`Photographer ${index + 1} email`}
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className={`flex-1 ${index === 0 && !email && nextReward?.type === 'first' ? 'ring-2 ring-primary/50 shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse' : ''}`}
                  data-testid={`input-referral-email-${index}`}
                />
                {emails.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmailField(index)}
                    data-testid={`button-remove-email-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            {emails.length + referrals.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addEmailField}
                className="flex-1"
                data-testid="button-add-photographer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Photographer
              </Button>
            )}
            <Button
              type="submit"
              disabled={createReferralsMutation.isPending}
              className="flex-1"
              data-testid="button-send-referrals"
            >
              {createReferralsMutation.isPending ? 'Sending...' : 'Send Invites'}
            </Button>
          </div>

          {/* Reward enticement - positioned below Send button */}
          {nextReward && (
            <Alert className="bg-primary/10 border-primary/30 mt-4">
              <Gift className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                {nextReward.type === 'first' && filledCount === 0 && (
                  <>
                    <strong>Type in your first email to start earning rewards!</strong>
                    <span className="ml-1">
                      {nextReward.count} more for a total of {totalSent + filledCount + nextReward.count} to unlock: <strong className="text-primary">{nextReward.reward}</strong>
                    </span>
                  </>
                )}
                {filledCount > 0 && nextReward.type !== 'complete' && (
                  <>
                    <strong>{filledCount} photographer{filledCount > 1 ? 's' : ''} ready to invite!</strong>
                    <span className="ml-1">
                      {nextReward.count} more for a total of {totalSent + filledCount + nextReward.count} to unlock: <strong className="text-primary">{nextReward.reward}</strong>
                    </span>
                  </>
                )}
                {nextReward.type === 'complete' && (
                  <>
                    <strong>Amazing! You're at maximum rewards!</strong>
                    <span className="ml-1 text-primary">All bonuses unlocked!</span>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Visual Progress Diagram */}
          <div className="mt-6 bg-card border border-card-border rounded-xl p-6">
            <h4 className="font-semibold text-sm text-card-foreground mb-4">Your Reward Progress</h4>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-muted">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min(100, ((totalSent + filledCount) / 10) * 100)}%` 
                  }}
                />
              </div>
              
              {/* Milestones */}
              <div className="relative flex justify-between">
                {/* Milestone 1: Start (0 referrals) */}
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      totalSent + filledCount >= 0 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-medium mt-2 text-center">Start</div>
                  <div className="text-xs text-muted-foreground mt-1">0 sent</div>
                </div>

                {/* Milestone 2: 3 referrals - 1 month free */}
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      totalSent + filledCount >= 3 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50 animate-pulse' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {totalSent + filledCount >= 3 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Calendar className="w-5 h-5" />
                    )}
                  </div>
                  <div className={`text-xs font-medium mt-2 text-center ${totalSent + filledCount >= 3 ? 'text-primary' : ''}`}>
                    1 Month Free
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">3 sent</div>
                  <div className="text-[10px] text-primary/70 font-medium">$99 value</div>
                </div>

                {/* Milestone 3: 5 referrals - Priority Support */}
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      totalSent + filledCount >= 5 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50 animate-pulse' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {totalSent + filledCount >= 5 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <HeadphonesIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className={`text-xs font-medium mt-2 text-center ${totalSent + filledCount >= 5 ? 'text-primary' : ''}`}>
                    Priority Support
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">5 sent</div>
                  <div className="text-[10px] text-primary/70 font-medium">$499 value</div>
                </div>

                {/* Milestone 4: 10 referrals - 3 months free */}
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      totalSent + filledCount >= 10 || completedReferrals >= 3
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50 animate-pulse' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {totalSent + filledCount >= 10 || completedReferrals >= 3 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div className={`text-xs font-medium mt-2 text-center ${totalSent + filledCount >= 10 || completedReferrals >= 3 ? 'text-primary' : ''}`}>
                    3 Months Free
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">10 sent</div>
                  <div className="text-[10px] text-primary/70 font-medium">$297-$1497 value</div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            {10 - referrals.length} referral slots remaining. Both you and your friends receive rewards!
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
