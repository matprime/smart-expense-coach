import React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { SpendingOverview } from '@/components/SpendingOverview';
import { CategoryBreakdown } from '@/components/CategoryBreakdown';
import { RecommendationCard } from '@/components/RecommendationCard';
import { TrendChart } from '@/components/TrendChart';
import { ReceiptCard } from '@/components/ReceiptCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { Receipt, Expense, CategoryTotal, Recommendation, Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { trackEvent } from '@/lib/analytics';

export default function Dashboard() {
  const [receipts, setReceipts] = React.useState<Receipt[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const receiptsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    trackEvent('Dashboard', 'page_view');
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load receipts
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select('*')
        .order('date', { ascending: false });

      if (receiptsError) throw receiptsError;

      // Load expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      setReceipts(receiptsData || []);
      setExpenses(expensesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      trackEvent('Reset Data', 'demo', { action: 'reset' });
      // Delete all expenses first (foreign key constraint)
      await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await loadData();
      toast.success('Data reset successfully');
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Failed to reset data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      trackEvent('Restore Demo Data', 'demo', { action: 'restore' });
      // Call a custom SQL function or just re-insert demo data
      // For simplicity, we'll execute the demo data insertion SQL via supabase.rpc if possible, 
      // but here we'll just run the insert queries directly since we don't have an RPC for it.
      
      // First clear existing
      await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Re-insert demo data
      const demoReceipts = [
        { id: '11111111-1111-1111-1111-111111111111', image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=600&fit=crop', vendor: 'Uber', date: '2026-04-15', total_amount: 18.50, usd_amount: 18.50, original_currency: 'USD', original_amount: 18.50, category: 'Transport' },
        { id: '22222222-2222-2222-2222-222222222222', image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=600&fit=crop', vendor: 'Uber', date: '2026-04-18', total_amount: 22.00, usd_amount: 22.00, original_currency: 'USD', original_amount: 22.00, category: 'Transport' },
        { id: '33333333-3333-3333-3333-333333333333', image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=600&fit=crop', vendor: 'Uber', date: '2026-04-22', total_amount: 19.75, usd_amount: 19.75, original_currency: 'USD', original_amount: 19.75, category: 'Transport' },
        { id: '44444444-4444-4444-4444-444444444444', image_url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_5b1cb5bb-adb8-45ce-8677-b5b5b104839d.jpg', vendor: 'Pizza Palace', date: '2026-04-16', total_amount: 35.50, usd_amount: 35.50, original_currency: 'USD', original_amount: 35.50, category: 'Food' },
        { id: '55555555-5555-5555-5555-555555555555', image_url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d3049c34-76a2-46dc-a6cb-0dc7ac96790e.jpg', vendor: 'Thai Kitchen', date: '2026-04-20', total_amount: 28.75, usd_amount: 28.75, original_currency: 'USD', original_amount: 28.75, category: 'Food' },
        { id: '66666666-6666-6666-6666-666666666666', image_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=600&fit=crop', vendor: 'Whole Foods Market', date: '2026-04-17', total_amount: 87.32, usd_amount: 87.32, original_currency: 'USD', original_amount: 87.32, category: 'Groceries' },
        { id: '77777777-7777-7777-7777-777777777777', image_url: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=400&h=600&fit=crop', vendor: 'AMC Theatres', date: '2026-04-19', total_amount: 45.00, usd_amount: 45.00, original_currency: 'USD', original_amount: 45.00, category: 'Entertainment' },
        { id: '88888888-8888-8888-8888-888888888888', image_url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&h=600&fit=crop', vendor: 'Starbucks', date: '2026-04-21', total_amount: 12.50, usd_amount: 12.50, original_currency: 'USD', original_amount: 12.50, category: 'Food' }
      ];

      await supabase.from('receipts').insert(demoReceipts);

      const demoExpenses = [
        { receipt_id: '11111111-1111-1111-1111-111111111111', item_name: 'Uber Trip - Downtown to Airport', amount: 18.50, usd_amount: 18.50, original_currency: 'USD', original_amount: 18.50, category: 'Transport' },
        { receipt_id: '22222222-2222-2222-2222-222222222222', item_name: 'Uber Trip - Home to Office', amount: 22.00, usd_amount: 22.00, original_currency: 'USD', original_amount: 22.00, category: 'Transport' },
        { receipt_id: '33333333-3333-3333-3333-333333333333', item_name: 'Uber Trip - Downtown to Airport', amount: 19.75, usd_amount: 19.75, original_currency: 'USD', original_amount: 19.75, category: 'Transport' },
        { receipt_id: '44444444-4444-4444-4444-444444444444', item_name: 'Large Pepperoni Pizza', amount: 24.00, usd_amount: 24.00, original_currency: 'USD', original_amount: 24.00, category: 'Food' },
        { receipt_id: '44444444-4444-4444-4444-444444444444', item_name: 'Delivery & Service Fees', amount: 11.50, usd_amount: 11.50, original_currency: 'USD', original_amount: 11.50, category: 'Food' },
        { receipt_id: '55555555-5555-5555-5555-555555555555', item_name: 'Pad Thai', amount: 15.00, usd_amount: 15.00, original_currency: 'USD', original_amount: 15.00, category: 'Food' },
        { receipt_id: '55555555-5555-5555-5555-555555555555', item_name: 'Spring Rolls', amount: 6.00, usd_amount: 6.00, original_currency: 'USD', original_amount: 6.00, category: 'Food' },
        { receipt_id: '55555555-5555-5555-5555-555555555555', item_name: 'Delivery & Service Fees', amount: 7.75, usd_amount: 7.75, original_currency: 'USD', original_amount: 7.75, category: 'Food' },
        { receipt_id: '66666666-6666-6666-6666-666666666666', item_name: 'Organic Vegetables', amount: 23.50, usd_amount: 23.50, original_currency: 'USD', original_amount: 23.50, category: 'Groceries' },
        { receipt_id: '66666666-6666-6666-6666-666666666666', item_name: 'Fresh Fruits', amount: 18.00, usd_amount: 18.00, original_currency: 'USD', original_amount: 18.00, category: 'Groceries' },
        { receipt_id: '66666666-6666-6666-6666-666666666666', item_name: 'Dairy Products', amount: 15.82, usd_amount: 15.82, original_currency: 'USD', original_amount: 15.82, category: 'Groceries' },
        { receipt_id: '66666666-6666-6666-6666-666666666666', item_name: 'Bread & Bakery', amount: 12.00, usd_amount: 12.00, original_currency: 'USD', original_amount: 12.00, category: 'Groceries' },
        { receipt_id: '66666666-6666-6666-6666-666666666666', item_name: 'Meat & Poultry', amount: 18.00, usd_amount: 18.00, original_currency: 'USD', original_amount: 18.00, category: 'Groceries' },
        { receipt_id: '77777777-7777-7777-7777-777777777777', item_name: 'Movie Tickets (2)', amount: 30.00, usd_amount: 30.00, original_currency: 'USD', original_amount: 30.00, category: 'Entertainment' },
        { receipt_id: '77777777-7777-7777-7777-777777777777', item_name: 'Popcorn (Large)', amount: 9.00, usd_amount: 9.00, original_currency: 'USD', original_amount: 9.00, category: 'Entertainment' },
        { receipt_id: '77777777-7777-7777-7777-777777777777', item_name: 'Soda (2)', amount: 6.00, usd_amount: 6.00, original_currency: 'USD', original_amount: 6.00, category: 'Entertainment' },
        { receipt_id: '88888888-8888-8888-8888-888888888888', item_name: 'Latte (Grande)', amount: 5.50, usd_amount: 5.50, original_currency: 'USD', original_amount: 5.50, category: 'Food' },
        { receipt_id: '88888888-8888-8888-8888-888888888888', item_name: 'Croissant', amount: 4.00, usd_amount: 4.00, original_currency: 'USD', original_amount: 4.00, category: 'Food' },
        { receipt_id: '88888888-8888-8888-8888-888888888888', item_name: 'Orange Juice', amount: 3.00, usd_amount: 3.00, original_currency: 'USD', original_amount: 3.00, category: 'Food' }
      ];

      await supabase.from('expenses').insert(demoExpenses);
      await loadData();
    } catch (error) {
      console.error('Error restoring demo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    try {
      trackEvent('Delete Receipt', 'click', { receiptId });
      // Expenses will be deleted automatically if cascade is on, 
      // but let's be explicit if not.
      await supabase.from('expenses').delete().eq('receipt_id', receiptId);
      await supabase.from('receipts').delete().eq('id', receiptId);
      
      setReceipts(receipts.filter(r => r.id !== receiptId));
      setExpenses(expenses.filter(e => e.receipt_id !== receiptId));
      toast.success('Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  // Calculate category totals using USD amounts
  const categoryTotals: CategoryTotal[] = React.useMemo(() => {
    const totals: Record<Category, { total: number; count: number }> = {
      Transport: { total: 0, count: 0 },
      Food: { total: 0, count: 0 },
      Groceries: { total: 0, count: 0 },
      Entertainment: { total: 0, count: 0 },
      Other: { total: 0, count: 0 },
    };

    expenses.forEach((expense) => {
      const amount = expense.usd_amount || expense.amount;
      totals[expense.category].total += Number(amount);
      totals[expense.category].count += 1;
    });

    const grandTotal = Object.values(totals).reduce((sum, cat) => sum + cat.total, 0);

    return Object.entries(totals)
      .filter(([, data]) => data.total > 0)
      .map(([category, data]) => ({
        category: category as Category,
        total: data.total,
        percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const totalSpending = categoryTotals.reduce((sum, cat) => sum + cat.total, 0);

  // Filter receipts by category
  const filteredReceipts = React.useMemo(() => {
    if (!selectedCategory) return receipts;

    const categoryReceiptIds = new Set(
      expenses
        .filter((e) => e.category === selectedCategory)
        .map((e) => e.receipt_id)
    );

    return receipts.filter((r) => categoryReceiptIds.has(r.id));
  }, [receipts, expenses, selectedCategory]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    trackEvent('Filter Category', 'click', { category });
    // Use setTimeout to ensure the DOM is updated if the filtered section was hidden/empty
    setTimeout(() => {
      receiptsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleClearFilter = () => {
    setSelectedCategory(null);
    trackEvent('Clear Filter', 'click');
  };

  // Generate recommendations based on spending patterns
  const recommendations: Recommendation[] = React.useMemo(() => {
    const recs: Recommendation[] = [];

    // Check for frequent rideshare usage
    const transportExpenses = expenses.filter((e) => e.category === 'Transport');
    const uberExpenses = transportExpenses.filter((e) =>
      e.item_name.toLowerCase().includes('uber')
    );

    if (uberExpenses.length >= 3) {
      const uberTotal = uberExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const monthlySavings = uberTotal * 0.6; // Assume 60% savings with public transit

      recs.push({
        id: '1',
        title: 'Switch to Public Transit',
        description: 'Frequent rideshare trips detected on similar routes',
        pattern: `You've taken ${uberExpenses.length} Uber trips totaling $${uberTotal.toFixed(2)} this period.`,
        suggestion:
          'Consider using public transit for your regular commute. A monthly transit pass typically costs $80-120 and covers unlimited trips.',
        monthlySavings,
        tradeoffs: '+15-20 min travel time',
        category: 'Transport',
      });
    }

    // Check for food delivery
    const foodExpenses = expenses.filter((e) => e.category === 'Food');
    const deliveryExpenses = foodExpenses.filter(
      (e) =>
        e.item_name.toLowerCase().includes('delivery') ||
        e.item_name.toLowerCase().includes('doordash') ||
        e.item_name.toLowerCase().includes('service fee')
    );

    if (deliveryExpenses.length >= 2) {
      const deliveryFees = deliveryExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const monthlySavings = deliveryFees * 4; // Assume weekly pattern

      recs.push({
        id: '2',
        title: 'Pick Up Instead of Delivery',
        description: 'Save on delivery and service fees',
        pattern: `You've paid $${deliveryFees.toFixed(2)} in delivery fees from nearby restaurants.`,
        suggestion:
          'Order for pickup instead of delivery to avoid fees. Many restaurants offer pickup discounts or loyalty rewards.',
        monthlySavings,
        tradeoffs: '+10-15 min pickup time',
        category: 'Food',
      });
    }

    // Check for entertainment spending
    const entertainmentTotal = categoryTotals.find((c) => c.category === 'Entertainment')?.total || 0;
    if (entertainmentTotal > 40) {
      recs.push({
        id: '3',
        title: 'Explore Free Entertainment',
        description: 'Reduce entertainment costs with alternatives',
        pattern: `You've spent $${entertainmentTotal.toFixed(2)} on entertainment this period.`,
        suggestion:
          'Look for free community events, outdoor activities, or streaming services instead of movie theaters. Many libraries offer free movie passes.',
        monthlySavings: entertainmentTotal * 0.5,
        tradeoffs: 'Different experience',
        category: 'Entertainment',
      });
    }

    return recs;
  }, [expenses, categoryTotals]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 space-y-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2 bg-muted" />
            <Skeleton className="h-4 w-96 bg-muted" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 bg-muted" />
            <Skeleton className="h-48 bg-muted" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2 text-balance">Your Financial Dashboard</h1>
          <p className="text-muted-foreground text-pretty">
            Track expenses and get personalized recommendations to save money
          </p>
        </div>

        {/* Total Spending */}
        <SpendingOverview 
          totalSpending={totalSpending} 
          previousTotal={totalSpending * 0.85} 
          onReset={handleReset}
          onRestore={handleRestore}
        />

        {/* Categories and Trends */}
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryBreakdown categories={categoryTotals} onCategoryClick={handleCategoryClick} />
          {categoryTotals.length > 0 && <TrendChart categories={categoryTotals} />}
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-balance">AI-Powered Recommendations</h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Based on your spending patterns, here are ways to save money
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Receipts */}
        {receipts.length > 0 && (
          <div ref={receiptsRef} className="space-y-4 scroll-mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-balance">
                  {selectedCategory ? `${selectedCategory} Receipts` : 'Recent Receipts'}
                </h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  {selectedCategory
                    ? `Showing receipts from ${selectedCategory} category`
                    : 'Your uploaded receipts and transactions'}
                </p>
              </div>
              {selectedCategory && (
                <Button variant="outline" onClick={handleClearFilter} size="sm">
                  Clear Filter
                </Button>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {filteredReceipts.map((receipt) => (
                <ReceiptCard 
                  key={receipt.id} 
                  receipt={receipt} 
                  onDelete={handleDeleteReceipt}
                  onUpdate={loadData}
                />
              ))}
            </div>
            {filteredReceipts.length === 0 && selectedCategory && (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-pretty">
                  No receipts found in {selectedCategory} category
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {receipts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4 text-pretty">
              No receipts yet. Upload your first receipt to get started!
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
