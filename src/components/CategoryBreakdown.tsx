import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, UtensilsCrossed, ShoppingCart, Popcorn, MoreHorizontal } from 'lucide-react';
import type { CategoryTotal } from '@/types';

interface CategoryBreakdownProps {
  categories: CategoryTotal[];
  onCategoryClick?: (category: string) => void;
}

const categoryIcons = {
  Transport: Car,
  Food: UtensilsCrossed,
  Groceries: ShoppingCart,
  Entertainment: Popcorn,
  Other: MoreHorizontal,
};

const categoryColors = {
  Transport: 'hsl(var(--chart-1))',
  Food: 'hsl(var(--chart-2))',
  Groceries: 'hsl(var(--chart-3))',
  Entertainment: 'hsl(var(--chart-4))',
  Other: 'hsl(var(--chart-5))',
};

export function CategoryBreakdown({ categories, onCategoryClick }: CategoryBreakdownProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.category];
          return (
            <div
              key={cat.category}
              className={`space-y-2 ${onCategoryClick ? 'cursor-pointer hover:bg-accent/50 -mx-2 px-2 py-2 rounded-lg transition-colors' : ''}`}
              onClick={() => onCategoryClick?.(cat.category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: categoryColors[cat.category] + '20' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: categoryColors[cat.category] }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{cat.category}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${cat.total.toFixed(2)}</p>
                  <Badge variant="secondary" className="text-xs">
                    {cat.percentage.toFixed(0)}%
                  </Badge>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: categoryColors[cat.category],
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
