-- =====================================================
-- Fuel Station Specialized Tables
-- =====================================================

-- =====================================================
-- 1. Fuel Types and Pricing
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_station_fuel_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Fuel type information
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN (
        'petrol_90', -- Regular gasoline
        'petrol_95', -- Premium gasoline
        'petrol_98', -- Super premium gasoline
        'diesel', -- Diesel fuel
        'diesel_premium', -- Premium diesel
        'lpg', -- Liquefied petroleum gas
        'cng', -- Compressed natural gas
        'electric', -- Electric charging
        'hydrogen' -- Hydrogen fuel
    )),
    fuel_name_ar VARCHAR(100) NOT NULL,
    fuel_name_en VARCHAR(100) NOT NULL,
    
    -- Pricing
    price_per_liter DECIMAL(6, 3) NOT NULL, -- Price in JOD per liter
    currency VARCHAR(3) DEFAULT 'JOD',
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    current_stock_liters DECIMAL(10, 2), -- Current stock in liters
    low_stock_threshold DECIMAL(10, 2) DEFAULT 1000.00,
    
    -- Quality specifications
    octane_rating INTEGER, -- For petrol types
    sulfur_content_ppm INTEGER, -- Parts per million of sulfur
    bio_fuel_percentage DECIMAL(5, 2) DEFAULT 0.00, -- Percentage of bio fuel
    
    -- Pricing history (for tracking changes)
    last_price_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    previous_price DECIMAL(6, 3),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, fuel_type)
);

-- =====================================================
-- 2. Fuel Station Services
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_station_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Service information
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN (
        'self_service', -- Self-service pumps
        'full_service', -- Attendant service
        'car_wash', -- Car washing
        'oil_change', -- Oil change service
        'tire_service', -- Tire repair/replacement
        'convenience_store', -- Mini mart
        'restaurant', -- Restaurant/cafe
        'atm', -- ATM machine
        'restrooms', -- Public restrooms
        'air_pump', -- Tire air pump
        'vacuum', -- Car vacuum
        'propane_refill', -- Propane tank refill
        'truck_stop', -- Truck parking/services
        'ev_charging' -- Electric vehicle charging
    )),
    service_name_ar VARCHAR(100) NOT NULL,
    service_name_en VARCHAR(100) NOT NULL,
    service_description_ar TEXT,
    service_description_en TEXT,
    
    -- Service pricing
    service_price DECIMAL(8, 2), -- Price for the service (if applicable)
    price_type VARCHAR(20) DEFAULT 'fixed' CHECK (price_type IN (
        'fixed', -- Fixed price
        'per_minute', -- Price per minute
        'per_hour', -- Price per hour
        'free' -- Free service
    )),
    
    -- Service availability
    is_available BOOLEAN DEFAULT TRUE,
    available_24_7 BOOLEAN DEFAULT FALSE,
    operating_hours JSONB, -- Custom hours if not 24/7
    
    -- Service features
    requires_appointment BOOLEAN DEFAULT FALSE,
    max_wait_time_minutes INTEGER, -- Expected wait time
    capacity INTEGER, -- How many customers can be served simultaneously
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, service_type)
);

-- =====================================================
-- 3. Fuel Station Pumps
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_station_pumps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Pump identification
    pump_number VARCHAR(10) NOT NULL,
    pump_brand VARCHAR(100), -- e.g., "Gilbarco", "Wayne"
    pump_model VARCHAR(100),
    
    -- Pump capabilities
    fuel_types_supported TEXT[] NOT NULL, -- Array of fuel types this pump supports
    payment_methods_supported TEXT[] DEFAULT '{"cash", "card"}', -- Payment methods
    
    -- Pump status
    pump_status VARCHAR(50) DEFAULT 'operational' CHECK (pump_status IN (
        'operational',
        'out_of_order',
        'maintenance',
        'offline'
    )),
    
    -- Technical details
    max_flow_rate_lpm DECIMAL(6, 2), -- Liters per minute
    accuracy_grade VARCHAR(10), -- Accuracy classification
    last_calibration_date DATE,
    next_maintenance_date DATE,
    
    -- Position/location within station
    pump_position VARCHAR(100), -- e.g., "Island 1, Position A"
    has_canopy_coverage BOOLEAN DEFAULT TRUE,
    is_self_service BOOLEAN DEFAULT TRUE,
    
    -- Features
    has_receipt_printer BOOLEAN DEFAULT TRUE,
    has_card_reader BOOLEAN DEFAULT TRUE,
    has_contactless_payment BOOLEAN DEFAULT FALSE,
    supports_fleet_cards BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, pump_number)
);

-- =====================================================
-- 4. Fuel Station Transactions
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_station_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID REFERENCES main_profiles(id) ON DELETE SET NULL, -- Anonymous customers allowed
    pump_id UUID NOT NULL REFERENCES fuel_station_pumps(id),
    fuel_type_id UUID NOT NULL REFERENCES fuel_station_fuel_types(id),
    
    -- Transaction identification
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_number VARCHAR(50),
    
    -- Fuel details
    fuel_type VARCHAR(50) NOT NULL,
    liters_dispensed DECIMAL(8, 3) NOT NULL,
    price_per_liter DECIMAL(6, 3) NOT NULL,
    total_fuel_cost DECIMAL(10, 2) NOT NULL,
    
    -- Additional services purchased
    additional_services JSONB DEFAULT '[]', -- Array of additional services with costs
    additional_services_cost DECIMAL(8, 2) DEFAULT 0.00,
    
    -- Total transaction
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(8, 2) DEFAULT 0.00,
    discount_amount DECIMAL(8, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Payment information
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
        'cash',
        'credit_card',
        'debit_card',
        'fleet_card',
        'mobile_payment',
        'contactless',
        'fuel_card'
    )),
    payment_status VARCHAR(50) DEFAULT 'completed' CHECK (payment_status IN (
        'pending',
        'completed',
        'failed',
        'refunded'
    )),
    
    -- Vehicle information (optional)
    vehicle_plate_number VARCHAR(20),
    vehicle_type VARCHAR(50), -- car, truck, motorcycle, etc.
    odometer_reading INTEGER,
    
    -- Customer information (for anonymous transactions)
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255),
    
    -- Loyalty program
    loyalty_points_earned INTEGER DEFAULT 0,
    loyalty_points_redeemed INTEGER DEFAULT 0,
    
    -- Transaction timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Staff information
    attendant_id UUID REFERENCES main_profiles(id), -- If full-service
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. Fuel Station Inventory
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_station_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_station_fuel_types(id),
    
    -- Tank information
    tank_number VARCHAR(20) NOT NULL,
    tank_capacity_liters DECIMAL(12, 2) NOT NULL,
    current_volume_liters DECIMAL(12, 2) NOT NULL,
    
    -- Inventory levels
    minimum_level_liters DECIMAL(10, 2) NOT NULL,
    maximum_level_liters DECIMAL(12, 2) NOT NULL,
    reorder_point_liters DECIMAL(10, 2) NOT NULL,
    
    -- Quality monitoring
    last_quality_check_date DATE,
    water_contamination_level DECIMAL(5, 2) DEFAULT 0.00, -- Percentage
    sediment_level VARCHAR(20) DEFAULT 'normal', -- normal, elevated, high
    
    -- Tank status
    tank_status VARCHAR(50) DEFAULT 'active' CHECK (tank_status IN (
        'active',
        'inactive',
        'maintenance',
        'contaminated',
        'empty'
    )),
    
    -- Temperature monitoring
    current_temperature_celsius DECIMAL(5, 2),
    last_temperature_check TIMESTAMP WITH TIME ZONE,
    
    -- Last delivery information
    last_delivery_date DATE,
    last_delivery_volume_liters DECIMAL(10, 2),
    next_delivery_scheduled_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, tank_number)
);

-- =====================================================
-- 6. Fuel Station Promotions
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_station_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Promotion basic information
    promotion_title_ar VARCHAR(255) NOT NULL,
    promotion_title_en VARCHAR(255) NOT NULL,
    promotion_description_ar TEXT,
    promotion_description_en TEXT,
    
    -- Promotion type
    promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN (
        'fuel_discount', -- Discount on fuel price
        'volume_bonus', -- Extra fuel for same price
        'loyalty_points_multiplier', -- Extra loyalty points
        'combo_deal', -- Fuel + service combo
        'cash_discount', -- Discount for cash payment
        'time_based', -- Happy hour discounts
        'bulk_discount' -- Discount for large purchases
    )),
    
    -- Discount details
    discount_percentage DECIMAL(5, 2), -- Percentage off fuel
    discount_amount_per_liter DECIMAL(4, 3), -- Fixed amount off per liter
    minimum_liters DECIMAL(6, 2), -- Minimum fuel purchase
    maximum_discount DECIMAL(8, 2), -- Maximum total discount
    
    -- Applicable fuel types
    applicable_fuel_types TEXT[] DEFAULT NULL, -- null = all fuel types
    
    -- Applicable services
    applicable_services UUID[] DEFAULT NULL, -- Array of service IDs
    
    -- Time constraints
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Day/time restrictions
    valid_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
    valid_start_time TIME,
    valid_end_time TIME,
    
    -- Usage limits
    max_uses_total INTEGER, -- Total times this promotion can be used
    max_uses_per_customer INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    requires_loyalty_membership BOOLEAN DEFAULT FALSE,
    
    -- Display
    promotion_image_url TEXT,
    display_priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. Fuel Station Reviews
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_station_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES fuel_station_transactions(id) ON DELETE SET NULL,
    
    -- Rating (1-5 stars)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    fuel_quality_rating INTEGER CHECK (fuel_quality_rating >= 1 AND fuel_quality_rating <= 5),
    service_speed_rating INTEGER CHECK (service_speed_rating >= 1 AND service_speed_rating <= 5),
    staff_service_rating INTEGER CHECK (staff_service_rating >= 1 AND staff_service_rating <= 5),
    facility_cleanliness_rating INTEGER CHECK (facility_cleanliness_rating >= 1 AND facility_cleanliness_rating <= 5),
    price_value_rating INTEGER CHECK (price_value_rating >= 1 AND price_value_rating <= 5),
    
    -- Review content
    review_title VARCHAR(255),
    review_text TEXT,
    review_photos TEXT[] DEFAULT '{}',
    
    -- Specific feedback
    pump_used VARCHAR(10), -- Which pump was used
    fuel_type_purchased VARCHAR(50),
    
    -- Review status
    is_verified BOOLEAN DEFAULT FALSE, -- Based on actual transaction
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Station response
    station_response TEXT,
    station_response_date TIMESTAMP WITH TIME ZONE,
    
    -- Helpful votes
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. Indexes for Fuel Station Tables
-- =====================================================

-- Fuel types indexes
CREATE INDEX IF NOT EXISTS idx_fuel_station_fuel_types_business ON fuel_station_fuel_types(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_fuel_types_available ON fuel_station_fuel_types(is_available);
CREATE INDEX IF NOT EXISTS idx_fuel_station_fuel_types_type ON fuel_station_fuel_types(fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_station_fuel_types_price ON fuel_station_fuel_types(price_per_liter);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_fuel_station_services_business ON fuel_station_services(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_services_type ON fuel_station_services(service_type);
CREATE INDEX IF NOT EXISTS idx_fuel_station_services_available ON fuel_station_services(is_available);

-- Pumps indexes
CREATE INDEX IF NOT EXISTS idx_fuel_station_pumps_business ON fuel_station_pumps(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_pumps_status ON fuel_station_pumps(pump_status);
CREATE INDEX IF NOT EXISTS idx_fuel_station_pumps_number ON fuel_station_pumps(pump_number);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_fuel_station_transactions_business ON fuel_station_transactions(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_transactions_customer ON fuel_station_transactions(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_transactions_pump ON fuel_station_transactions(pump_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_transactions_fuel_type ON fuel_station_transactions(fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_transactions_date ON fuel_station_transactions(completed_at);
CREATE INDEX IF NOT EXISTS idx_fuel_station_transactions_payment ON fuel_station_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_fuel_station_transactions_number ON fuel_station_transactions(transaction_number);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_fuel_station_inventory_business ON fuel_station_inventory(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_inventory_fuel_type ON fuel_station_inventory(fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_inventory_status ON fuel_station_inventory(tank_status);
CREATE INDEX IF NOT EXISTS idx_fuel_station_inventory_level ON fuel_station_inventory(current_volume_liters);

-- Promotions indexes
CREATE INDEX IF NOT EXISTS idx_fuel_station_promotions_business ON fuel_station_promotions(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_promotions_active ON fuel_station_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_fuel_station_promotions_valid_period ON fuel_station_promotions(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_fuel_station_promotions_type ON fuel_station_promotions(promotion_type);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_fuel_station_reviews_business ON fuel_station_reviews(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_reviews_customer ON fuel_station_reviews(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_fuel_station_reviews_rating ON fuel_station_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_fuel_station_reviews_approved ON fuel_station_reviews(is_approved);

-- =====================================================
-- 9. Update Triggers for Fuel Station Tables
-- =====================================================

CREATE TRIGGER update_fuel_station_fuel_types_updated_at BEFORE UPDATE ON fuel_station_fuel_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_station_services_updated_at BEFORE UPDATE ON fuel_station_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_station_pumps_updated_at BEFORE UPDATE ON fuel_station_pumps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_station_transactions_updated_at BEFORE UPDATE ON fuel_station_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_station_inventory_updated_at BEFORE UPDATE ON fuel_station_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_station_promotions_updated_at BEFORE UPDATE ON fuel_station_promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_station_reviews_updated_at BEFORE UPDATE ON fuel_station_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. Row Level Security for Fuel Station Tables
-- =====================================================

-- Enable RLS
ALTER TABLE fuel_station_fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_reviews ENABLE ROW LEVEL SECURITY;

-- Business owner policies
CREATE POLICY "Fuel station owners can manage their fuel types" ON fuel_station_fuel_types FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

CREATE POLICY "Fuel station owners can manage their services" ON fuel_station_services FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

CREATE POLICY "Fuel station owners can manage their pumps" ON fuel_station_pumps FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

CREATE POLICY "Fuel station owners can view their transactions" ON fuel_station_transactions FOR SELECT USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

-- Public read access for customers
CREATE POLICY "Public can view available fuel types" ON fuel_station_fuel_types FOR SELECT USING (is_available = true);
CREATE POLICY "Public can view available services" ON fuel_station_services FOR SELECT USING (is_available = true);
CREATE POLICY "Public can view operational pumps" ON fuel_station_pumps FOR SELECT USING (pump_status = 'operational');
CREATE POLICY "Public can view active promotions" ON fuel_station_promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view approved reviews" ON fuel_station_reviews FOR SELECT USING (is_approved = true);

-- Customer transaction policies
CREATE POLICY "Customers can view their own transactions" ON fuel_station_transactions FOR SELECT USING (
    customer_profile_id::text = auth.uid()::text
);

-- Review policies
CREATE POLICY "Customers can manage their own reviews" ON fuel_station_reviews FOR ALL USING (
    customer_profile_id::text = auth.uid()::text
);

-- =====================================================
-- 11. Functions for Fuel Station Operations
-- =====================================================

-- Function to calculate fuel consumption and efficiency
CREATE OR REPLACE FUNCTION calculate_fuel_efficiency(
    p_customer_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_liters DECIMAL(10, 3),
    total_cost DECIMAL(12, 2),
    average_price_per_liter DECIMAL(6, 3),
    transaction_count INTEGER,
    most_used_fuel_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(fst.liters_dispensed) as total_liters,
        SUM(fst.total_amount) as total_cost,
        AVG(fst.price_per_liter) as average_price_per_liter,
        COUNT(*)::INTEGER as transaction_count,
        MODE() WITHIN GROUP (ORDER BY fst.fuel_type) as most_used_fuel_type
    FROM fuel_station_transactions fst
    WHERE fst.customer_profile_id = p_customer_id
    AND fst.completed_at::date BETWEEN p_start_date AND p_end_date
    AND fst.payment_status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Function to get fuel price trends
CREATE OR REPLACE FUNCTION get_fuel_price_trends(
    p_fuel_type VARCHAR(50),
    p_city VARCHAR(100) DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    business_name VARCHAR(255),
    current_price DECIMAL(6, 3),
    previous_price DECIMAL(6, 3),
    price_change DECIMAL(6, 3),
    last_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.business_name,
        fsft.price_per_liter as current_price,
        fsft.previous_price,
        (fsft.price_per_liter - COALESCE(fsft.previous_price, fsft.price_per_liter)) as price_change,
        fsft.last_price_update
    FROM fuel_station_fuel_types fsft
    JOIN business_profiles bp ON fsft.business_profile_id = bp.id
    WHERE fsft.fuel_type = p_fuel_type
    AND fsft.is_available = true
    AND bp.is_operational = true
    AND (p_city IS NULL OR bp.city = p_city)
    AND fsft.last_price_update >= CURRENT_DATE - INTERVAL '1 day' * p_days
    ORDER BY fsft.price_per_liter ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- END OF FUEL STATION TABLES
-- =====================================================
