-- Create receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  vendor TEXT,
  date DATE,
  total_amount DECIMAL(10, 2),
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Transport', 'Food', 'Groceries', 'Entertainment', 'Other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_expenses_receipt_id ON expenses(receipt_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_receipts_date ON receipts(date);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for demo, no auth required)
CREATE POLICY "Allow public read access to receipts" ON receipts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to receipts" ON receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to receipts" ON receipts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to receipts" ON receipts FOR DELETE USING (true);

CREATE POLICY "Allow public read access to expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to expenses" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to expenses" ON expenses FOR DELETE USING (true);

-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Create storage policies
CREATE POLICY "Allow public upload to receipts bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Allow public read from receipts bucket" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Allow public delete from receipts bucket" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');