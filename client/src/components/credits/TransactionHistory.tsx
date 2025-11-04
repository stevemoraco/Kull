import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, Gift, RotateCcw, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { CreditTransaction } from '@shared/schema';

interface TransactionHistoryProps {
  transactions: CreditTransaction[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const typeConfig = {
  purchase: {
    label: 'Purchase',
    icon: ArrowUpCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    badgeVariant: 'default' as const,
  },
  usage: {
    label: 'Usage',
    icon: ArrowDownCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    badgeVariant: 'destructive' as const,
  },
  bonus: {
    label: 'Bonus',
    icon: Gift,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    badgeVariant: 'secondary' as const,
  },
  refund: {
    label: 'Refund',
    icon: RotateCcw,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    badgeVariant: 'outline' as const,
  },
};

function TransactionIcon({ type }: { type: string }) {
  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.usage;
  const Icon = config.icon;

  return (
    <div className={`p-2 rounded-full ${config.bgColor}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: CreditTransaction }) {
  const config = typeConfig[transaction.type as keyof typeof typeConfig] || typeConfig.usage;
  const amountInDollars = Math.abs(transaction.amount) / 100;
  const isPositive = transaction.amount > 0;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <TransactionIcon type={transaction.type} />
          <div className="flex flex-col">
            <span className="font-medium text-sm">{transaction.description}</span>
            {transaction.provider && (
              <span className="text-xs text-muted-foreground capitalize">
                {transaction.provider}
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={config.badgeVariant} className="font-normal">
          {config.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <span className={`font-mono font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : '-'}${amountInDollars.toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-mono text-sm text-muted-foreground">
          ${(transaction.balance / 100).toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground">
        {format(new Date(transaction.createdAt!), 'MMM d, yyyy h:mm a')}
      </TableCell>
    </TableRow>
  );
}

function MobileTransactionCard({ transaction }: { transaction: CreditTransaction }) {
  const config = typeConfig[transaction.type as keyof typeof typeConfig] || typeConfig.usage;
  const amountInDollars = Math.abs(transaction.amount) / 100;
  const isPositive = transaction.amount > 0;

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <TransactionIcon type={transaction.type} />
          <div className="flex flex-col gap-1">
            <span className="font-medium text-sm">{transaction.description}</span>
            {transaction.provider && (
              <span className="text-xs text-muted-foreground capitalize">
                {transaction.provider}
              </span>
            )}
          </div>
        </div>
        <Badge variant={config.badgeVariant} className="font-normal text-xs">
          {config.label}
        </Badge>
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Amount</span>
          <span className={`font-mono font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : '-'}${amountInDollars.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="font-mono text-sm">
            ${(transaction.balance / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-right">
        {format(new Date(transaction.createdAt!), 'MMM d, yyyy h:mm a')}
      </div>
    </div>
  );
}

export function TransactionHistory({
  transactions,
  loading,
  hasMore,
  onLoadMore,
}: TransactionHistoryProps) {
  if (loading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Loading your transaction history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your credit transactions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-muted">
                <ArrowDownCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              No transactions yet. Purchase credits to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          View all your credit purchases and usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop table view */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {transactions.map((transaction) => (
            <MobileTransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>

        {/* Load more button */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? (
                'Loading...'
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Load More
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
