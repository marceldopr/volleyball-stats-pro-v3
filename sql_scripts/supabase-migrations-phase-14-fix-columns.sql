-- Fix for missing columns in clubs table
-- It seems the table might have been created without these columns initially.

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS acronym TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Force schema cache reload (usually happens automatically on DDL, but good to be sure)
NOTIFY pgrst, 'reload config';
