
-- 🛡️ GLOWBOOK COMPREHENSIVE SCHEMA
-- Source this in your Supabase SQL Editor

-- 1. Profiles (for users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'salon_owner', 'practitioner', 'customer')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  total_points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Salons
CREATE TABLE IF NOT EXISTS salons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  municipality TEXT,
  country TEXT,
  logo_url TEXT,
  banner_url TEXT,
  category TEXT[], 
  rating DECIMAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  membership_tier TEXT DEFAULT 'BAS' CHECK (membership_tier IN ('BAS', 'PRO', 'LUXE')),
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  stripe_customer_id TEXT,
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Practitioners (Staff members)
CREATE TABLE IF NOT EXISTS practitioners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT, -- Primary professional title
  role TEXT,  -- Description/Secondary title
  image_url TEXT,
  schedule JSONB DEFAULT '{}', -- Store weekly schedule as JSON
  status TEXT DEFAULT 'active',
  categories TEXT[], -- What categories they handle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Services
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  sale_price DECIMAL, -- Optional sale price
  sale_ends_at TIMESTAMP WITH TIME ZONE, -- When the sale ends
  duration_minutes INTEGER NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  service_name TEXT, -- Fallback name for legacy/quick data
  practitioner_id UUID REFERENCES practitioners(id),
  customer_id UUID REFERENCES profiles(id),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  booking_date DATE, -- For legacy compatibility
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'paid', 'pending_payment')),
  payment_method TEXT,
  payment_id TEXT,
  total_price DECIMAL,
  currency TEXT DEFAULT 'SEK',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Gift Cards (Bullseye)
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  value DECIMAL NOT NULL,
  currency TEXT DEFAULT 'SEK',
  remaining_balance DECIMAL NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  sender_name TEXT,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Loyalty System
CREATE TABLE IF NOT EXISTS loyalty_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    current_points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, salon_id)
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('earned', 'spent', 'refunded')),
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Basic Public Policies
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public salons are viewable" ON salons FOR SELECT USING (true);
CREATE POLICY "Public services are viewable" ON services FOR SELECT USING (true);
CREATE POLICY "Public practitioners are viewable" ON practitioners FOR SELECT USING (true);
