import { Check, Sparkles, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PurchasePackage {
  amount: 500 | 1000;
  displayAmount: string;
  bonus?: number;
  popular?: boolean;
  features: string[];
}

const packages: PurchasePackage[] = [
  {
    amount: 500,
    displayAmount: '$500',
    features: [
      '50,000 credits',
      'Use across all AI providers',
      'No expiration',
      'Pay as you go'
    ]
  },
  {
    amount: 1000,
    displayAmount: '$1,000',
    bonus: 100,
    popular: true,
    features: [
      '110,000 credits',
      '$100 bonus included',
      'Best value package',
      'Use across all AI providers',
      'No expiration',
      'Priority processing'
    ]
  }
];

interface PurchasePackagesProps {
  onSelectPackage: (amount: 500 | 1000) => void;
  loading?: boolean;
}

export function PurchasePackages({ onSelectPackage, loading }: PurchasePackagesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Purchase Credits</h2>
        <p className="text-muted-foreground">
          Choose a credit package to power your AI culling
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {packages.map((pkg) => (
          <Card
            key={pkg.amount}
            className={`relative overflow-hidden transition-all hover:scale-[1.02] ${
              pkg.popular
                ? 'border-primary shadow-lg shadow-primary/20'
                : 'hover:border-primary/50'
            }`}
          >
            {pkg.popular && (
              <div className="absolute top-0 right-0">
                <Badge className="rounded-bl-lg rounded-tr-none bg-gradient-to-r from-primary to-primary/80">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className={pkg.popular ? 'bg-gradient-to-br from-primary/5 to-transparent' : ''}>
              <div className="flex items-baseline gap-2 mb-2">
                <CardTitle className="text-3xl font-bold">
                  {pkg.displayAmount}
                </CardTitle>
                {pkg.bonus && (
                  <Badge variant="secondary" className="text-xs font-semibold">
                    +${pkg.bonus} bonus
                  </Badge>
                )}
              </div>
              <CardDescription className="text-base">
                {pkg.bonus
                  ? `${(pkg.amount + pkg.bonus) * 100} credits total`
                  : `${pkg.amount * 100} credits`
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              <ul className="space-y-3">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      pkg.popular ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => onSelectPackage(pkg.amount)}
                disabled={loading}
                size="lg"
                className="w-full"
                variant={pkg.popular ? 'default' : 'outline'}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Purchase {pkg.displayAmount}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">How credits work</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Credits are deducted based on AI provider usage and image count</li>
              <li>Different providers have different rates (typically $0.01-0.05 per image)</li>
              <li>Credits never expire and can be used across all supported AI providers</li>
              <li>You'll always see the cost estimate before processing starts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
