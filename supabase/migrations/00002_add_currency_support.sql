-- Add currency fields to receipts table
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'USD';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10, 2);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(10, 2);

-- Update existing receipts to have currency info
UPDATE receipts SET original_currency = 'USD', original_amount = total_amount, usd_amount = total_amount WHERE original_amount IS NULL;

-- Add currency fields to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'USD';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10, 2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(10, 2);

-- Update existing expenses to have currency info
UPDATE expenses SET original_currency = 'USD', original_amount = amount, usd_amount = amount WHERE original_amount IS NULL;