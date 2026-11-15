-- ==============================================================================
-- CSR-RIT: REORDER PON VIJAYALAKSHMI T TO MEMBER-069
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/avippchoatqvaohizbvu/sql/new
--
-- 1. Updates foreign key on csr_billboard to ON UPDATE CASCADE so shifts cascade cleanly.
-- 2. Shifts members member-069 through member-115 up by +1 (in descending order).
-- 3. Updates Pon Vijayalakshmi T from 8d3f92ca-74f3-4e08-8a69-41bc193e091b to member-069.
-- ==============================================================================

BEGIN;

-- Step 1: Ensure billboard foreign key cascades on update
ALTER TABLE IF EXISTS csr_billboard 
  DROP CONSTRAINT IF EXISTS csr_billboard_member_id_fkey,
  ADD CONSTRAINT csr_billboard_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES csr_members(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

-- Step 2: Shift members 115 down to 069 by +1
DO $$
DECLARE
  rec RECORD;
  num INT;
  new_id TEXT;
BEGIN
  FOR rec IN 
    SELECT id 
    FROM csr_members 
    WHERE id ~ '^member-\d+$' 
      AND (substring(id from 8)::int) >= 69 
    ORDER BY (substring(id from 8)::int) DESC 
  LOOP
    num := substring(rec.id from 8)::int;
    new_id := 'member-' || LPAD((num + 1)::text, 3, '0');
    UPDATE csr_members SET id = new_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Step 3: Assign member-069 to Pon Vijayalakshmi T
UPDATE csr_members 
SET id = 'member-069' 
WHERE id = '8d3f92ca-74f3-4e08-8a69-41bc193e091b';

COMMIT;

-- Step 4: Verification: Check members 067 through 072
SELECT id, name, division, year, department 
FROM csr_members 
WHERE id BETWEEN 'member-067' AND 'member-072' 
ORDER BY id ASC;

