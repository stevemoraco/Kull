import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface BalanceCardProps {
  balance: number;
  loading?: boolean;
  onAddCredits: () => void;
}

export function BalanceCard({ balance, loading, onAddCredits }: BalanceCardProps) {
  const balanceInDollars = balance / 100;
  const isLow = balance < 10000; // Less than $100
  const isCritical = balance < 2500; // Less than $25

  // Calculate progress percentage (out of $500 max display)
  const maxDisplay = 50000; // $500
  const progressPercent = Math.min((balance / maxDisplay) * 100, 100);

  return (
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardDescription className="text-sm font-medium mb-2">
              Available Balance
            </CardDescription>
            <CardTitle className="text-4xl font-bold tracking-tight flex items-baseline gap-2">
              {loading ? (
                <span className="animate-pulse">--</span>
              ) : (
                <>
                  <span className="text-primary">${balanceInDollars.toFixed(2)}</span>
                  <span className="text-lg text-muted-foreground font-normal">credits</span>
                </>
              )}
            </CardTitle>
          </div>
          <div className={`p-3 rounded-full ${
            isCritical ? 'bg-destructive/10' : isLow ? 'bg-warning/10' : 'bg-primary/10'
          }`}>
            {isCritical ? (
              <AlertTriangle className="h-6 w-6 text-destructive" />
            ) : (
              <DollarSign className="h-6 w-6 text-primary" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Progress bar for visual balance indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Balance Status</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress
            value={progressPercent}
            className={`h-2 ${
              isCritical ? '[&>div]:bg-destructive' :
              isLow ? '[&>div]:bg-warning' :
              '[&>div]:bg-primary'
            }`}
          />
        </div>

        {/* Warning messages */}
        {isCritical && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-destructive">Critical balance</p>
              <p className="text-xs text-muted-foreground">
                Add credits now to continue using AI culling features
              </p>
            </div>
          </div>
        )}

        {isLow && !isCritical && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <TrendingUp className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-warning">Low balance</p>
              <p className="text-xs text-muted-foreground">
                Consider adding more credits for uninterrupted service
              </p>
            </div>
          </div>
        )}

        {/* Add credits button */}
        <Button
          onClick={onAddCredits}
          className="w-full"
          size="lg"
          disabled={loading}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Add Credits
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Credits are used for AI-powered photo culling
        </p>
      </CardContent>
    </Card>
  );
}
