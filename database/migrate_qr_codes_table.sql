-- Migration script to update qr_codes table structure
-- Run this SQL in your Supabase SQL Editor if your table has different columns

-- First, check if the table exists and what columns it has
-- If your table has 'code' and 'qr_token' columns, run this migration:

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add qr_code_data column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'qr_code_data'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN qr_code_data TEXT;
    END IF;

    -- Add qr_code_image column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'qr_code_image'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN qr_code_image TEXT;
    END IF;

    -- Add code_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'code_id'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN code_id BIGINT REFERENCES public."Codes"(id) ON DELETE SET NULL;
    END IF;

    -- Add is_scanned column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'is_scanned'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN is_scanned BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add scanned_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'scanned_at'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN scanned_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Migrate data from old columns to new columns (if qr_token exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'qr_token'
    ) THEN
        -- Copy qr_token to qr_code_data if qr_code_data is null
        UPDATE public.qr_codes 
        SET qr_code_data = qr_token 
        WHERE qr_code_data IS NULL AND qr_token IS NOT NULL;
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add unique constraint on qr_code_data if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'qr_codes_qr_code_data_key'
    ) THEN
        ALTER TABLE public.qr_codes ADD CONSTRAINT qr_codes_qr_code_data_key UNIQUE (qr_code_data);
    END IF;

    -- Add unique constraint on (user_id, party_id) if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'qr_codes_user_id_party_id_key'
    ) THEN
        ALTER TABLE public.qr_codes ADD CONSTRAINT qr_codes_user_id_party_id_key UNIQUE (user_id, party_id);
    END IF;
END $$;

-- Make qr_code_data NOT NULL if all rows have values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.qr_codes WHERE qr_code_data IS NULL
    ) THEN
        ALTER TABLE public.qr_codes ALTER COLUMN qr_code_data SET NOT NULL;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON public.qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_party_id ON public.qr_codes(party_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code_id ON public.qr_codes(code_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_code_data ON public.qr_codes(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_qr_codes_is_scanned ON public.qr_codes(is_scanned);

-- Add trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_qr_codes_updated_at'
    ) THEN
        CREATE TRIGGER update_qr_codes_updated_at 
        BEFORE UPDATE ON public.qr_codes 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

