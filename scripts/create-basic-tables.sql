-- ===================================================================
-- IGTaxi Vehicle Types Table - Simplified
-- ===================================================================

-- Create vehicle_types table
CREATE TABLE IF NOT EXISTS public.vehicle_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 4,
    base_fare DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    per_km_rate DECIMAL(10,2) NOT NULL DEFAULT 1.50,
    per_minute_rate DECIMAL(10,2) NOT NULL DEFAULT 0.50,
    minimum_fare DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    fuel_type VARCHAR(20) DEFAULT 'petrol',
    features TEXT[] DEFAULT '{}',
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "vehicle_types_select_policy" ON public.vehicle_types
    FOR SELECT USING (true);

-- Insert sample vehicle types
INSERT INTO public.vehicle_types (name, name_ar, description, capacity, base_fare, per_km_rate, per_minute_rate, minimum_fare, fuel_type, features) VALUES
('Economy Car', 'سيارة اقتصادية', 'Affordable and reliable transportation', 4, 10.00, 1.50, 0.50, 10.00, 'petrol', '{"Air Conditioning", "GPS"}'),
('Comfort Car', 'سيارة مريحة', 'More spacious and comfortable ride', 4, 15.00, 2.00, 0.70, 15.00, 'petrol', '{"Air Conditioning", "GPS", "Premium Interior"}'),
('Premium Car', 'سيارة فاخرة', 'Luxury vehicle with premium service', 4, 25.00, 3.00, 1.00, 25.00, 'petrol', '{"Air Conditioning", "GPS", "Leather Seats", "WiFi"}'),
('Van', 'فان', 'Large vehicle for groups and luggage', 7, 20.00, 2.50, 0.80, 20.00, 'diesel', '{"Air Conditioning", "GPS", "Large Space"}'),
('Electric Car', 'سيارة كهربائية', 'Eco-friendly electric vehicle', 4, 18.00, 2.20, 0.60, 18.00, 'electric', '{"Air Conditioning", "GPS", "Eco-Friendly"}'),
('Motorbike', 'دراجة نارية', 'Quick and efficient for short distances', 1, 5.00, 1.00, 0.30, 5.00, 'petrol', '{"GPS", "Helmet Provided"}')
ON CONFLICT DO NOTHING;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    user_type VARCHAR(20) DEFAULT 'passenger',
    avatar_url TEXT,
    language VARCHAR(5) DEFAULT 'ar',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles (fixed to use correct auth.uid())
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger function to automatically create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, language)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'ar');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.vehicle_types TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;
