-- Supabase Database Schema for Rumbify
-- Run this SQL in your Supabase SQL Editor

-- Create parties table (removed single price column to support multi-prices)
CREATE TABLE IF NOT EXISTS public.parties (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    attendees VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    date VARCHAR(100) NOT NULL,
    administrator VARCHAR(255) NOT NULL,
    image TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    liked BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('hot-topic', 'upcoming')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prices table (supports multiple prices per party)
CREATE TABLE IF NOT EXISTS public.prices (
    id BIGSERIAL PRIMARY KEY,
    price_name TEXT NOT NULL,
    price VARCHAR(50) NOT NULL,
    party_id BIGINT NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    profile_image TEXT,
    bio TEXT,
    interests TEXT[] DEFAULT '{}',
    is_admin BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    profile_visible BOOLEAN DEFAULT TRUE,
    attendance_visible BOOLEAN DEFAULT TRUE,
    member_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data (parties + related prices)
WITH inserted_parties AS (
  INSERT INTO public.parties (title, attendees, location, date, administrator, image, tags, liked, category)
  VALUES
  ('Chicago Night', '23/96', 'Calle 23#32-26', '5/9/21 • 23:00-06:00', 'Loco Foroko', 'https://images.unsplash.com/photo-1571266028243-d220b6b0b8c5?w=400&h=200&fit=crop', ARRAY['Elegant', 'Cocktailing'], true, 'hot-topic'),
  ('Summer Vibes', '45/100', 'Calle 15#45-12', '12/9/21 • 20:00-04:00', 'DJ Summer', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop', ARRAY['Summer', 'Outdoor'], false, 'hot-topic'),
  ('Pre-New Year Pa...', '67/150', 'Cra 51#39-26', '22/11/21 • 21:30-05:00', 'DJ KC', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=150&fit=crop', ARRAY['Disco Music', 'Elegant'], false, 'upcoming'),
  ('Neon Dreams', '89/120', 'Calle 80#12-45', '15/9/21 • 22:00-05:00', 'Neon DJ', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=150&fit=crop', ARRAY['Electronic', 'Neon'], true, 'upcoming')
  RETURNING id, title
)
INSERT INTO public.prices (price_name, price, party_id)
SELECT CASE title
         WHEN 'Chicago Night' THEN 'Normal Ticket'
         WHEN 'Summer Vibes' THEN 'General'
         WHEN 'Pre-New Year Pa...' THEN 'Normal'
         WHEN 'Neon Dreams' THEN 'General'
       END AS price_name,
       CASE title
         WHEN 'Chicago Night' THEN '$65.000'
         WHEN 'Summer Vibes' THEN '$45.000'
         WHEN 'Pre-New Year Pa...' THEN '$80.000'
         WHEN 'Neon Dreams' THEN '$55.000'
       END AS price,
       id AS party_id
FROM inserted_parties;

-- Insert sample users
INSERT INTO public.users (name, email) VALUES
('John Doe', 'john@example.com'),
('Jane Smith', 'jane@example.com'),
('KC User', 'kc@example.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parties_category ON public.parties(category);
CREATE INDEX IF NOT EXISTS idx_parties_liked ON public.parties(liked);
CREATE INDEX IF NOT EXISTS idx_parties_created_at ON public.parties(created_at);
CREATE INDEX IF NOT EXISTS idx_prices_party_id ON public.prices(party_id);
CREATE INDEX IF NOT EXISTS idx_prices_name ON public.prices(price_name);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON public.parties FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.prices FOR SELECT USING (true);

-- Create policies for user creation and updates
CREATE POLICY "Enable insert for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.users FOR UPDATE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON public.prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
