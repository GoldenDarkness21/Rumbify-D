-- Update qr_codes table to make user_id nullable
-- This allows QR codes to be created for guests who aren't logged in
-- Run this SQL in your Supabase SQL Editor

-- Make user_id nullable
ALTER TABLE public.qr_codes ALTER COLUMN user_id DROP NOT NULL;

-- Drop the unique constraint on (user_id, party_id) since user_id can be null
-- We'll use a different approach: unique on (code_id, party_id) for guests
DO $$
BEGIN
    -- Drop existing unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'qr_codes_user_id_party_id_key'
    ) THEN
        ALTER TABLE public.qr_codes DROP CONSTRAINT qr_codes_user_id_party_id_key;
    END IF;
END $$;

-- Create a partial unique index for logged-in users (user_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_user_party_unique 
ON public.qr_codes(user_id, party_id) 
WHERE user_id IS NOT NULL;

-- Create a unique index for guests using code_id + party_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_codes_code_party_unique 
ON public.qr_codes(code_id, party_id) 
WHERE user_id IS NULL AND code_id IS NOT NULL;

