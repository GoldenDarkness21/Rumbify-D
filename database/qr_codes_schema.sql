-- QR Codes Table Schema for Rumbify
-- Run this SQL in your Supabase SQL Editor

-- Create qr_codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id BIGSERIAL PRIMARY KEY,
    qr_code_data TEXT NOT NULL, -- The actual QR code data (unique identifier)
    qr_code_image TEXT NOT NULL, -- Base64 encoded QR code image
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE, -- Nullable to support guest registrations
    party_id BIGINT NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    code_id BIGINT REFERENCES public."Codes"(id) ON DELETE SET NULL, -- Link to the original registration code
    is_scanned BOOLEAN DEFAULT FALSE, -- Whether the QR code has been scanned/used
    scanned_at TIMESTAMP WITH TIME ZONE, -- When the QR code was scanned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(qr_code_data), -- Ensure each QR code is unique
    -- One QR code per user per party (if user_id is not null)
    -- For guests, we use code_id + party_id as unique identifier
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON public.qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_party_id ON public.qr_codes(party_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code_id ON public.qr_codes(code_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_code_data ON public.qr_codes(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_qr_codes_is_scanned ON public.qr_codes(is_scanned);

-- Enable Row Level Security (RLS)
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON public.qr_codes FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.qr_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.qr_codes FOR UPDATE USING (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON public.qr_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

