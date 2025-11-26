-- Verify and fix RLS policies for qr_codes table
-- Run this in Supabase SQL Editor

-- Check current RLS status
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'qr_codes';

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'qr_codes';

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.qr_codes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.qr_codes;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.qr_codes;
DROP POLICY IF EXISTS "allow insert qr_image" ON public.qr_codes;
DROP POLICY IF EXISTS "allow update qr_image" ON public.qr_codes;

-- Create comprehensive policies that allow all operations
CREATE POLICY "Allow all operations on qr_codes" 
ON public.qr_codes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Alternative: If you want separate policies for each operation
-- CREATE POLICY "Allow select on qr_codes" ON public.qr_codes FOR SELECT USING (true);
-- CREATE POLICY "Allow insert on qr_codes" ON public.qr_codes FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update on qr_codes" ON public.qr_codes FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow delete on qr_codes" ON public.qr_codes FOR DELETE USING (true);

-- Verify RLS is enabled
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Test query to verify policies work
-- This should return the count of rows (or 0 if table is empty)
SELECT COUNT(*) FROM public.qr_codes;

