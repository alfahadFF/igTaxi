-- ===================================================================
-- IGTaxi Simple Setup - Fixed TEXT[] Issue
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

-- Create profiles table
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

-- Insert sample vehicle types (with proper TEXT[] casting)
INSERT INTO public.vehicle_types (name, name_ar, description, capacity, base_fare, per_km_rate, per_minute_rate, minimum_fare, fuel_type, features) 
VALUES
    ('Economy Car', 'سيارة اقتصادية', 'Affordable and reliable transportation', 4, 10.00, 1.50, 0.50, 10.00, 'petrol', ARRAY['Air Conditioning', 'GPS']),
    ('Comfort Car', 'سيارة مريحة', 'More spacious and comfortable ride', 4, 15.00, 2.00, 0.70, 15.00, 'petrol', ARRAY['Air Conditioning', 'GPS', 'Premium Interior']),
    ('Premium Car', 'سيارة فاخرة', 'Luxury vehicle with premium service', 4, 25.00, 3.00, 1.00, 25.00, 'petrol', ARRAY['Air Conditioning', 'GPS', 'Leather Seats', 'WiFi']),
    ('Van', 'فان', 'Large vehicle for groups and luggage', 7, 20.00, 2.50, 0.80, 20.00, 'diesel', ARRAY['Air Conditioning', 'GPS', 'Large Space']),
    ('Electric Car', 'سيارة كهربائية', 'Eco-friendly electric vehicle', 4, 18.00, 2.20, 0.60, 18.00, 'electric', ARRAY['Air Conditioning', 'GPS', 'Eco-Friendly']),
    ('Motorbike', 'دراجة نارية', 'Quick and efficient for short distances', 1, 5.00, 1.00, 0.30, 5.00, 'petrol', ARRAY['GPS', 'Helmet Provided'])
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.vehicle_types TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Success message
SELECT 'Tables created successfully!' as status;
