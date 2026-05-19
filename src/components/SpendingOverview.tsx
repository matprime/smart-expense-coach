import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpendingOverviewProps {
  totalSpending: number;
  previousTotal: number;
  onReset?: () => void;
  onRestore?: () => void;
}

export function SpendingOverview({ totalSpending, previousTotal, onReset, onRestore }: SpendingOverviewProps) {
  const change = totalSpending - previousTotal;
  const changePercentage = previousTotal > 0 ? (change / previousTotal) * 100 : 0;
  const isIncrease = change > 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Total Spending</CardTitle>
        <div className="flex gap-2">
          {onRestore && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRestore}
              className="h-8 px-2 text-xs gap-1"
            >
              <RefreshCcw className="h-3 w-3" />
              Restore Demo
            </Button>
          )}
          {onReset && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReset}
              className="h-8 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
              Reset All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-4xl font-semibold">${totalSpending.toFixed(2)}</p>
          <div className="flex items-center gap-2 mt-2">
            {isIncrease ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-success" />
            )}
            <span className={`text-sm ${isIncrease ? 'text-destructive' : 'text-success'}`}>
              {Math.abs(changePercentage).toFixed(1)}% {isIncrease ? 'increase' : 'decrease'} from last period
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your expenses and discover opportunities to save money with AI-powered recommendations.
        </p>
      </CardContent>
    </Card>
  );
}
