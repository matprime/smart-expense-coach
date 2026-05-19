export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type Category = 'Transport' | 'Food' | 'Groceries' | 'Entertainment' | 'Other';

export interface Receipt {
  id: string;
  image_url: string;
  vendor: string | null;
  date: string | null;
  total_amount: number | null;
  raw_text: string | null;
  created_at: string;
  original_currency: string;
  original_amount: number | null;
  usd_amount: number | null;
  category: string | null;
}

export interface Expense {
  id: string;
  receipt_id: string;
  item_name: string;
  amount: number;
  category: Category;
  created_at: string;
  original_currency: string;
  original_amount: number | null;
  usd_amount: number | null;
}

export interface CategoryTotal {
  category: Category;
  total: number;
  percentage: number;
  count: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  pattern: string;
  suggestion: string;
  monthlySavings: number;
  tradeoffs: string;
  category: Category;
}
