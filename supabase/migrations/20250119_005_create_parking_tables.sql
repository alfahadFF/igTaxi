-- =====================================================
-- Parking Lot Specialized Tables
-- =====================================================

-- =====================================================
-- 1. Parking Spaces and Zones
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Zone information
    zone_name_ar VARCHAR(100) NOT NULL,
    zone_name_en VARCHAR(100) NOT NULL,
    zone_code VARCHAR(20) NOT NULL, -- A1, B2, etc.
    zone_type VARCHAR(50) NOT NULL CHECK (zone_type IN (
        'standard', -- Regular parking
        'premium', -- Premium/closer spots
        'disabled', -- Handicapped accessible
        'electric', -- EV charging spots
        'compact', -- Compact car only
        'motorcycle', -- Motorcycle parking
        'truck', -- Truck/large vehicle
        'valet', -- Valet parking area
        'reserved' -- Reserved/private spots
    )),
    
    -- Zone capacity
    total_spaces INTEGER NOT NULL DEFAULT 0,
    available_spaces INTEGER NOT NULL DEFAULT 0,
    
    -- Zone features
    is_covered BOOLEAN DEFAULT FALSE,
    has_security_cameras BOOLEAN DEFAULT FALSE,
    has_lighting BOOLEAN DEFAULT TRUE,
    floor_level INTEGER DEFAULT 1, -- For multi-level parking
    
    -- Pricing for this zone
    price_per_minute DECIMAL(6, 3) DEFAULT 0.000,
    price_per_hour DECIMAL(6, 2) NOT NULL,
    price_per_day DECIMAL(8, 2),
    price_per_month DECIMAL(10, 2),
    
    -- Zone status
    is_active BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, zone_code)
);

-- =====================================================
-- 2. Individual Parking Spaces
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES parking_zones(id) ON DELETE CASCADE,
    
    -- Space identification
    space_number VARCHAR(20) NOT NULL,
    space_code VARCHAR(30), -- Zone code + space number (A1-001)
    
    -- Space characteristics
    space_type VARCHAR(50) NOT NULL CHECK (space_type IN (
        'standard',
        'compact',
        'disabled',
        'electric_charging',
        'motorcycle',
        'truck',
        'valet_only',
        'reserved'
    )),
    
    -- Dimensions
    length_meters DECIMAL(4, 2),
    width_meters DECIMAL(4, 2),
    height_clearance_meters DECIMAL(4, 2), -- For covered parking
    
    -- Space features
    has_ev_charger BOOLEAN DEFAULT FALSE,
    ev_charger_type VARCHAR(50), -- Type1, Type2, CCS, CHAdeMO
    charging_power_kw DECIMAL(5, 2), -- Charging power in kW
    
    -- Accessibility
    is_disabled_accessible BOOLEAN DEFAULT FALSE,
    has_wider_access BOOLEAN DEFAULT FALSE,
    
    -- Current status
    space_status VARCHAR(50) DEFAULT 'available' CHECK (space_status IN (
        'available',
        'occupied',
        'reserved',
        'out_of_order',
        'cleaning',
        'blocked'
    )),
    
    -- Sensors (for smart parking)
    has_sensor BOOLEAN DEFAULT FALSE,
    sensor_id VARCHAR(100),
    last_sensor_update TIMESTAMP WITH TIME ZONE,
    
    -- Position within the lot
    floor_level INTEGER DEFAULT 1,
    row_identifier VARCHAR(10),
    position_x DECIMAL(8, 3), -- X coordinate within the lot
    position_y DECIMAL(8, 3), -- Y coordinate within the lot
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, space_number)
);

-- =====================================================
-- 3. Parking Reservations
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    parking_space_id UUID REFERENCES parking_spaces(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES parking_zones(id) ON DELETE CASCADE,
    
    -- Reservation identification
    reservation_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Vehicle information
    vehicle_plate_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'car' CHECK (vehicle_type IN (
        'car',
        'motorcycle',
        'truck',
        'van',
        'bus',
        'bicycle'
    )),
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_color VARCHAR(50),
    
    -- Reservation timing
    reservation_start TIMESTAMP WITH TIME ZONE NOT NULL,
    reservation_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (reservation_end - reservation_start)) / 60
    ) STORED,
    
    -- Actual usage timing
    actual_arrival TIMESTAMP WITH TIME ZONE,
    actual_departure TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER,
    
    -- Reservation status
    reservation_status VARCHAR(50) DEFAULT 'active' CHECK (reservation_status IN (
        'active', -- Reservation is active
        'checked_in', -- Vehicle has arrived
        'completed', -- Vehicle has left
        'cancelled', -- Reservation cancelled
        'no_show', -- Customer didn't show up
        'expired', -- Reservation expired
        'extended' -- Reservation was extended
    )),
    
    -- Pricing
    hourly_rate DECIMAL(6, 2) NOT NULL,
    minute_rate DECIMAL(6, 3) DEFAULT 0.000,
    total_reserved_cost DECIMAL(10, 2) NOT NULL,
    actual_cost DECIMAL(10, 2),
    overtime_cost DECIMAL(8, 2) DEFAULT 0.00,
    
    -- Payment
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',
        'paid',
        'partial',
        'refunded',
        'failed'
    )),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Customer information
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Special requirements
    special_requests TEXT,
    needs_ev_charging BOOLEAN DEFAULT FALSE,
    needs_disabled_access BOOLEAN DEFAULT FALSE,
    
    -- Notifications
    reminder_sent BOOLEAN DEFAULT FALSE,
    arrival_notification_sent BOOLEAN DEFAULT FALSE,
    
    -- Extension tracking
    extended_until TIMESTAMP WITH TIME ZONE,
    extension_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Parking Sessions (Walk-in customers)
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID REFERENCES main_profiles(id) ON DELETE SET NULL, -- Can be anonymous
    parking_space_id UUID REFERENCES parking_spaces(id) ON DELETE SET NULL,
    zone_id UUID NOT NULL REFERENCES parking_zones(id) ON DELETE CASCADE,
    
    -- Session identification
    session_number VARCHAR(20) UNIQUE NOT NULL,
    ticket_number VARCHAR(50), -- Physical/digital ticket number
    
    -- Vehicle information
    vehicle_plate_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'car',
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_color VARCHAR(50),
    
    -- Session timing
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exit_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Session status
    session_status VARCHAR(50) DEFAULT 'active' CHECK (session_status IN (
        'active', -- Vehicle is currently parked
        'completed', -- Session ended normally
        'overstay', -- Vehicle exceeded time limit
        'abandoned', -- Vehicle abandoned (very long stay)
        'cancelled' -- Session cancelled by admin
    )),
    
    -- Pricing calculation
    hourly_rate DECIMAL(6, 2) NOT NULL,
    minute_rate DECIMAL(6, 3) DEFAULT 0.000,
    calculated_cost DECIMAL(10, 2),
    discount_applied DECIMAL(6, 2) DEFAULT 0.00,
    final_cost DECIMAL(10, 2),
    
    -- Payment
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',
        'paid',
        'failed',
        'waived'
    )),
    payment_method VARCHAR(50),
    payment_time TIMESTAMP WITH TIME ZONE,
    
    -- Entry/exit method
    entry_method VARCHAR(50) DEFAULT 'manual' CHECK (entry_method IN (
        'manual', -- Staff/attendant
        'ticket_machine',
        'app',
        'license_plate_recognition',
        'card_reader',
        'qr_code'
    )),
    exit_method VARCHAR(50),
    
    -- Staff information
    entry_staff_id UUID REFERENCES main_profiles(id),
    exit_staff_id UUID REFERENCES main_profiles(id),
    
    -- Customer information (for anonymous sessions)
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Validation and discounts
    validation_code VARCHAR(20), -- From merchants for discounted parking
    validation_discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    loyalty_discount_applied BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. Parking Services
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Service information
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN (
        'valet_parking',
        'car_wash',
        'oil_change',
        'tire_service',
        'car_detailing',
        'security_service',
        'shuttle_service',
        'luggage_assistance',
        'vehicle_maintenance',
        'emergency_assistance',
        'ev_charging'
    )),
    service_name_ar VARCHAR(100) NOT NULL,
    service_name_en VARCHAR(100) NOT NULL,
    service_description_ar TEXT,
    service_description_en TEXT,
    
    -- Service pricing
    base_price DECIMAL(8, 2) NOT NULL,
    price_per_hour DECIMAL(6, 2),
    price_per_service DECIMAL(8, 2),
    
    -- Service availability
    is_available BOOLEAN DEFAULT TRUE,
    available_24_7 BOOLEAN DEFAULT FALSE,
    operating_hours JSONB,
    
    -- Service capacity
    max_simultaneous_services INTEGER DEFAULT 1,
    average_service_duration_minutes INTEGER,
    
    -- Requirements
    requires_reservation BOOLEAN DEFAULT FALSE,
    advance_booking_hours INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, service_type)
);

-- =====================================================
-- 6. Service Bookings
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_service_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES parking_services(id) ON DELETE CASCADE,
    parking_session_id UUID REFERENCES parking_sessions(id) ON DELETE SET NULL,
    parking_reservation_id UUID REFERENCES parking_reservations(id) ON DELETE SET NULL,
    
    -- Booking identification
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Service details
    service_type VARCHAR(50) NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    
    -- Scheduling
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    
    -- Booking status
    booking_status VARCHAR(50) DEFAULT 'scheduled' CHECK (booking_status IN (
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        'rescheduled'
    )),
    
    -- Vehicle information
    vehicle_plate_number VARCHAR(20) NOT NULL,
    vehicle_details JSONB, -- Make, model, color, etc.
    
    -- Service details
    service_notes TEXT,
    special_instructions TEXT,
    
    -- Pricing
    service_cost DECIMAL(8, 2) NOT NULL,
    additional_charges DECIMAL(6, 2) DEFAULT 0.00,
    total_cost DECIMAL(8, 2) NOT NULL,
    
    -- Payment
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',
        'paid',
        'failed',
        'refunded'
    )),
    payment_method VARCHAR(50),
    
    -- Service provider
    service_provider_id UUID REFERENCES main_profiles(id), -- Staff member providing the service
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. Parking Promotions and Discounts
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Promotion basic information
    promotion_title_ar VARCHAR(255) NOT NULL,
    promotion_title_en VARCHAR(255) NOT NULL,
    promotion_description_ar TEXT,
    promotion_description_en TEXT,
    
    -- Promotion type
    promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN (
        'percentage_discount', -- 20% off parking
        'fixed_amount_discount', -- 5 JOD off
        'free_hours', -- First 2 hours free
        'loyalty_points', -- Earn extra points
        'early_bird', -- Discount for early arrival
        'validation', -- Merchant validation discount
        'monthly_pass', -- Monthly parking pass
        'weekend_special' -- Weekend discounts
    )),
    
    -- Discount details
    discount_percentage DECIMAL(5, 2),
    discount_amount DECIMAL(8, 2),
    free_hours INTEGER,
    minimum_duration_minutes INTEGER,
    
    -- Applicable zones
    applicable_zones UUID[] DEFAULT NULL, -- null = all zones
    
    -- Time constraints
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Day/time restrictions
    valid_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    valid_start_time TIME,
    valid_end_time TIME,
    
    -- Usage limits
    max_uses_total INTEGER,
    max_uses_per_customer INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- Conditions
    requires_membership BOOLEAN DEFAULT FALSE,
    requires_validation_code BOOLEAN DEFAULT FALSE,
    validation_partners TEXT[], -- Array of business names that can validate
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Display
    promotion_image_url TEXT,
    display_priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. Parking Reviews
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    parking_session_id UUID REFERENCES parking_sessions(id) ON DELETE SET NULL,
    parking_reservation_id UUID REFERENCES parking_reservations(id) ON DELETE SET NULL,
    
    -- Rating (1-5 stars)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    accessibility_rating INTEGER CHECK (accessibility_rating >= 1 AND accessibility_rating <= 5),
    security_rating INTEGER CHECK (security_rating >= 1 AND security_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    staff_service_rating INTEGER CHECK (staff_service_rating >= 1 AND staff_service_rating <= 5),
    
    -- Review content
    review_title VARCHAR(255),
    review_text TEXT,
    review_photos TEXT[] DEFAULT '{}',
    
    -- Specific feedback
    zone_used VARCHAR(20),
    space_used VARCHAR(20),
    duration_parked_minutes INTEGER,
    
    -- Review status
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Management response
    management_response TEXT,
    management_response_date TIMESTAMP WITH TIME ZONE,
    
    -- Helpful votes
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. Indexes for Parking Tables
-- =====================================================

-- Zones indexes
CREATE INDEX IF NOT EXISTS idx_parking_zones_business ON parking_zones(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_zones_type ON parking_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_parking_zones_active ON parking_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_parking_zones_availability ON parking_zones(available_spaces);

-- Spaces indexes
CREATE INDEX IF NOT EXISTS idx_parking_spaces_business ON parking_spaces(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_zone ON parking_spaces(zone_id);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_status ON parking_spaces(space_status);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_type ON parking_spaces(space_type);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_ev_charger ON parking_spaces(has_ev_charger);

-- Reservations indexes
CREATE INDEX IF NOT EXISTS idx_parking_reservations_business ON parking_reservations(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_customer ON parking_reservations(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_space ON parking_reservations(parking_space_id);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_status ON parking_reservations(reservation_status);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_time ON parking_reservations(reservation_start, reservation_end);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_plate ON parking_reservations(vehicle_plate_number);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_parking_sessions_business ON parking_sessions(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_customer ON parking_sessions(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_space ON parking_sessions(parking_space_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_status ON parking_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_entry_time ON parking_sessions(entry_time);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_plate ON parking_sessions(vehicle_plate_number);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_parking_services_business ON parking_services(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_services_type ON parking_services(service_type);
CREATE INDEX IF NOT EXISTS idx_parking_services_available ON parking_services(is_available);

-- Service bookings indexes
CREATE INDEX IF NOT EXISTS idx_parking_service_bookings_business ON parking_service_bookings(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_service_bookings_customer ON parking_service_bookings(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_service_bookings_service ON parking_service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_parking_service_bookings_status ON parking_service_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_parking_service_bookings_time ON parking_service_bookings(scheduled_start);

-- Promotions indexes
CREATE INDEX IF NOT EXISTS idx_parking_promotions_business ON parking_promotions(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_promotions_active ON parking_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_parking_promotions_valid_period ON parking_promotions(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_parking_promotions_type ON parking_promotions(promotion_type);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_parking_reviews_business ON parking_reviews(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_reviews_customer ON parking_reviews(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_parking_reviews_rating ON parking_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_parking_reviews_approved ON parking_reviews(is_approved);

-- =====================================================
-- 10. Update Triggers for Parking Tables
-- =====================================================

CREATE TRIGGER update_parking_zones_updated_at BEFORE UPDATE ON parking_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_spaces_updated_at BEFORE UPDATE ON parking_spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_reservations_updated_at BEFORE UPDATE ON parking_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_sessions_updated_at BEFORE UPDATE ON parking_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_services_updated_at BEFORE UPDATE ON parking_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_service_bookings_updated_at BEFORE UPDATE ON parking_service_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_promotions_updated_at BEFORE UPDATE ON parking_promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parking_reviews_updated_at BEFORE UPDATE ON parking_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. Row Level Security for Parking Tables
-- =====================================================

-- Enable RLS
ALTER TABLE parking_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reviews ENABLE ROW LEVEL SECURITY;

-- Business owner policies
CREATE POLICY "Parking lot owners can manage their zones" ON parking_zones FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

CREATE POLICY "Parking lot owners can manage their spaces" ON parking_spaces FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

-- Public read access
CREATE POLICY "Public can view active parking zones" ON parking_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view available parking spaces" ON parking_spaces FOR SELECT USING (space_status IN ('available', 'reserved'));
CREATE POLICY "Public can view parking services" ON parking_services FOR SELECT USING (is_available = true);
CREATE POLICY "Public can view active promotions" ON parking_promotions FOR SELECT USING (is_active = true);

-- Customer policies
CREATE POLICY "Customers can manage their own reservations" ON parking_reservations FOR ALL USING (
    customer_profile_id::text = auth.uid()::text
);
CREATE POLICY "Customers can view their own sessions" ON parking_sessions FOR SELECT USING (
    customer_profile_id::text = auth.uid()::text
);
CREATE POLICY "Customers can manage their own service bookings" ON parking_service_bookings FOR ALL USING (
    customer_profile_id::text = auth.uid()::text
);
CREATE POLICY "Customers can manage their own reviews" ON parking_reviews FOR ALL USING (
    customer_profile_id::text = auth.uid()::text
);

-- =====================================================
-- 12. Functions for Parking Operations
-- =====================================================

-- Function to update space availability when reservation status changes
CREATE OR REPLACE FUNCTION update_space_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- When a reservation is created or status changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.reservation_status != NEW.reservation_status) THEN
        -- Update the specific space if assigned
        IF NEW.parking_space_id IS NOT NULL THEN
            UPDATE parking_spaces 
            SET space_status = CASE 
                WHEN NEW.reservation_status IN ('active', 'checked_in') THEN 'reserved'
                WHEN NEW.reservation_status IN ('completed', 'cancelled', 'no_show') THEN 'available'
                ELSE space_status
            END,
            updated_at = NOW()
            WHERE id = NEW.parking_space_id;
        END IF;
        
        -- Update zone availability count
        UPDATE parking_zones 
        SET available_spaces = (
            SELECT COUNT(*) 
            FROM parking_spaces 
            WHERE zone_id = NEW.zone_id 
            AND space_status = 'available'
        ),
        updated_at = NOW()
        WHERE id = NEW.zone_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reservation status changes
CREATE TRIGGER trigger_update_space_availability 
    AFTER INSERT OR UPDATE ON parking_reservations 
    FOR EACH ROW EXECUTE FUNCTION update_space_availability();

-- Function to calculate parking cost
CREATE OR REPLACE FUNCTION calculate_parking_cost(
    p_zone_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    zone_record parking_zones%ROWTYPE;
    duration_minutes INTEGER;
    total_cost DECIMAL(10, 2);
BEGIN
    -- Get zone pricing information
    SELECT * INTO zone_record FROM parking_zones WHERE id = p_zone_id;
    
    -- Calculate duration in minutes
    duration_minutes := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60;
    
    -- Calculate cost based on zone pricing
    IF zone_record.price_per_minute > 0 THEN
        -- Use minute-based pricing
        total_cost := duration_minutes * zone_record.price_per_minute;
    ELSE
        -- Use hour-based pricing (round up to next hour)
        total_cost := CEIL(duration_minutes / 60.0) * zone_record.price_per_hour;
    END IF;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to find available parking space
CREATE OR REPLACE FUNCTION find_available_space(
    p_business_profile_id UUID,
    p_vehicle_type VARCHAR(50) DEFAULT 'car',
    p_needs_ev_charging BOOLEAN DEFAULT FALSE,
    p_needs_disabled_access BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    space_id UUID,
    space_number VARCHAR(20),
    zone_name VARCHAR(100),
    hourly_rate DECIMAL(6, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id as space_id,
        ps.space_number,
        pz.zone_name_en as zone_name,
        pz.price_per_hour as hourly_rate
    FROM parking_spaces ps
    JOIN parking_zones pz ON ps.zone_id = pz.id
    WHERE ps.business_profile_id = p_business_profile_id
    AND ps.space_status = 'available'
    AND pz.is_active = true
    AND (
        (p_vehicle_type = 'car' AND ps.space_type IN ('standard', 'premium', 'compact'))
        OR (p_vehicle_type = 'motorcycle' AND ps.space_type = 'motorcycle')
        OR (p_vehicle_type = 'truck' AND ps.space_type = 'truck')
    )
    AND (NOT p_needs_ev_charging OR ps.has_ev_charger = true)
    AND (NOT p_needs_disabled_access OR ps.is_disabled_accessible = true)
    ORDER BY pz.price_per_hour ASC, ps.space_number ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- END OF PARKING LOT TABLES
-- =====================================================
