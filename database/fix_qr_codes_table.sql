-- Fix qr_codes table structure
-- Run this SQL in your Supabase SQL Editor

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add code_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'code_id'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN code_id BIGINT REFERENCES public."Codes"(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added code_id column';
    END IF;

    -- Add qr_code_data column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'qr_code_data'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN qr_code_data TEXT;
        RAISE NOTICE 'Added qr_code_data column';
    END IF;

    -- Add qr_code_image column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'qr_code_image'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN qr_code_image TEXT;
        RAISE NOTICE 'Added qr_code_image column';
    END IF;

    -- Add is_scanned column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'is_scanned'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN is_scanned BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_scanned column';
    END IF;

    -- Add scanned_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'scanned_at'
    ) THEN
        ALTER TABLE public.qr_codes ADD COLUMN scanned_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added scanned_at column';
    END IF;

    -- Make user_id nullable if it's not already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.qr_codes ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE 'Made user_id nullable';
    END IF;

    -- Make qr_code_data NOT NULL if all existing rows have values
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'qr_code_data'
        AND is_nullable = 'YES'
    ) THEN
        -- Check if all rows have qr_code_data
        IF NOT EXISTS (SELECT 1 FROM public.qr_codes WHERE qr_code_data IS NULL) THEN
            ALTER TABLE public.qr_codes ALTER COLUMN qr_code_data SET NOT NULL;
            RAISE NOTICE 'Made qr_code_data NOT NULL';
        END IF;
    END IF;

    -- Make qr_code_image NOT NULL if all existing rows have values
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes' 
        AND column_name = 'qr_code_image'
        AND is_nullable = 'YES'
    ) THEN
        -- Check if all rows have qr_code_image
        IF NOT EXISTS (SELECT 1 FROM public.qr_codes WHERE qr_code_image IS NULL) THEN
            ALTER TABLE public.qr_codes ALTER COLUMN qr_code_image SET NOT NULL;
            RAISE NOTICE 'Made qr_code_image NOT NULL';
        END IF;
    END IF;
END $$;

-- Add unique constraint on qr_code_data if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'qr_codes_qr_code_data_key'
    ) THEN
        ALTER TABLE public.qr_codes ADD CONSTRAINT qr_codes_qr_code_data_key UNIQUE (qr_code_data);
        RAISE NOTICE 'Added unique constraint on qr_code_data';
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
        RAISE NOTICE 'Added updated_at trigger';
    END IF;
END $$;

