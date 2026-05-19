ALTER TABLE receipts ADD COLUMN IF NOT EXISTS category TEXT;

-- Update existing receipts based on their expenses
UPDATE receipts r
SET category = (
  SELECT category 
  FROM expenses e 
  WHERE e.receipt_id = r.id 
  LIMIT 1
)
WHERE category IS NULL;