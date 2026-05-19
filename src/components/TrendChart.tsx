import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { CategoryTotal } from '@/types';

interface TrendChartProps {
  categories: CategoryTotal[];
}

const chartConfig = {
  total: {
    label: 'Amount',
    color: 'hsl(var(--chart-1))',
  },
};

export function TrendChart({ categories }: TrendChartProps) {
  const data = categories.map((cat) => ({
    category: cat.category,
    total: cat.total,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Spending Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full min-w-0 overflow-hidden">
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
