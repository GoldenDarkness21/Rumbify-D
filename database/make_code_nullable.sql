-- Make the 'code' field nullable in qr_codes table
-- This allows QR codes to be created even if the code reference doesn't exist
-- Run this in Supabase SQL Editor

-- First, drop the foreign key constraint if it exists
DO $$
BEGIN
    -- Find and drop the foreign key constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'qr_codes_code_fkey'
    ) THEN
        ALTER TABLE public.qr_codes DROP CONSTRAINT qr_codes_code_fkey;
        RAISE NOTICE 'Dropped foreign key constraint qr_codes_code_fkey';
    END IF;
END $$;

-- Make the code column nullable
ALTER TABLE public.qr_codes ALTER COLUMN code DROP NOT NULL;

-- Optionally, recreate the foreign key constraint but allow NULL values
-- (Foreign keys in PostgreSQL already allow NULL by default)
-- If you want to keep the foreign key but allow NULL:
-- ALTER TABLE public.qr_codes 
-- ADD CONSTRAINT qr_codes_code_fkey 
-- FOREIGN KEY (code) REFERENCES public."Codes"(id) ON DELETE SET NULL;

