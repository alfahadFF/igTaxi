-- =====================================================
-- Common System Tables - Ratings, Complaints, Trips
-- =====================================================

-- =====================================================
-- 1. Global Ratings System
-- =====================================================

CREATE TABLE IF NOT EXISTS global_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rated_entity_type VARCHAR(50) NOT NULL CHECK (rated_entity_type IN (
        'business_profile', -- Rating for a business
        'driver_profile', -- Rating for a driver
        'transporter_profile', -- Rating for a transporter
        'product', -- Rating for a specific product
        'service', -- Rating for a specific service
        'order', -- Rating for an order experience
        'trip' -- Rating for a trip experience
    )),
    rated_entity_id UUID NOT NULL, -- ID of the entity being rated
    rater_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- Rating details
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    
    -- Detailed ratings (optional, depends on entity type)
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    
    -- Review content
    review_title VARCHAR(255),
    review_text TEXT,
    review_photos TEXT[] DEFAULT '{}',
    
    -- Context information
    transaction_reference VARCHAR(100), -- Order number, trip ID, etc.
    transaction_date DATE,
    transaction_amount DECIMAL(10, 2),
    
    -- Review verification
    is_verified BOOLEAN DEFAULT FALSE, -- Based on actual transaction
    verification_method VARCHAR(50), -- 'order', 'trip', 'manual', etc.
    
    -- Review status
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_notes TEXT,
    
    -- Entity response
    entity_response TEXT,
    entity_response_date TIMESTAMP WITH TIME ZONE,
    entity_response_by UUID REFERENCES main_profiles(id),
    
    -- Community interaction
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    -- Tags for categorization
    review_tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one rating per user per entity
    UNIQUE(rated_entity_type, rated_entity_id, rater_profile_id)
);

-- =====================================================
-- 2. Complaints System
-- =====================================================

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complainant_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- Complaint target
    complaint_against_type VARCHAR(50) NOT NULL CHECK (complaint_against_type IN (
        'business_profile', -- Complaint against a business
        'driver_profile', -- Complaint against a driver
        'transporter_profile', -- Complaint against a transporter
        'product', -- Complaint about a product
        'service', -- Complaint about a service
        'order', -- Complaint about an order
        'trip', -- Complaint about a trip
        'platform', -- Complaint about the platform itself
        'other' -- Other type of complaint
    )),
    complaint_against_id UUID, -- ID of the entity being complained about
    
    -- Complaint identification
    complaint_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Complaint details
    complaint_category VARCHAR(50) NOT NULL CHECK (complaint_category IN (
        'quality_issue', -- Poor quality product/service
        'delivery_issue', -- Delivery problems
        'payment_issue', -- Payment related problems
        'customer_service', -- Poor customer service
        'pricing_dispute', -- Pricing disagreements
        'safety_concern', -- Safety issues
        'fraud_scam', -- Fraudulent activity
        'privacy_violation', -- Privacy concerns
        'discrimination', -- Discrimination issues
        'technical_issue', -- App/platform technical problems
        'cancellation_issue', -- Problems with cancellations
        'refund_issue', -- Refund related problems
        'inappropriate_behavior', -- Inappropriate conduct
        'other' -- Other issues
    )),
    
    complaint_title VARCHAR(255) NOT NULL,
    complaint_description TEXT NOT NULL,
    
    -- Supporting evidence
    evidence_photos TEXT[] DEFAULT '{}',
    evidence_documents TEXT[] DEFAULT '{}',
    evidence_videos TEXT[] DEFAULT '{}',
    
    -- Context information
    related_order_id VARCHAR(100), -- Order/transaction reference
    related_trip_id UUID, -- Trip reference if applicable
    incident_date TIMESTAMP WITH TIME ZONE,
    incident_location TEXT,
    
    -- Financial impact
    financial_loss_amount DECIMAL(10, 2),
    refund_requested BOOLEAN DEFAULT FALSE,
    refund_amount_requested DECIMAL(10, 2),
    
    -- Complaint priority
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN (
        'low', 'medium', 'high', 'urgent'
    )),
    
    -- Complaint status
    complaint_status VARCHAR(50) DEFAULT 'submitted' CHECK (complaint_status IN (
        'submitted', -- Initial submission
        'acknowledged', -- Complaint acknowledged
        'under_investigation', -- Being investigated
        'pending_response', -- Waiting for response from complained party
        'escalated', -- Escalated to higher authority
        'resolved', -- Complaint resolved
        'closed', -- Complaint closed
        'rejected' -- Complaint rejected
    )),
    
    -- Resolution details
    resolution_summary TEXT,
    resolution_action_taken TEXT,
    compensation_provided DECIMAL(8, 2),
    compensation_type VARCHAR(50), -- 'refund', 'credit', 'voucher', 'service'
    
    -- Timeline tracking
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    investigation_started_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Staff handling
    assigned_to UUID REFERENCES main_profiles(id), -- Support staff assigned
    escalated_to UUID REFERENCES main_profiles(id), -- Manager/supervisor
    
    -- Communication log
    last_communication_at TIMESTAMP WITH TIME ZONE,
    customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. Complaint Communications
-- =====================================================

CREATE TABLE IF NOT EXISTS complaint_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sender_profile_id UUID NOT NULL REFERENCES main_profiles(id),
    
    -- Communication details
    communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN (
        'initial_complaint', -- Original complaint submission
        'customer_update', -- Update from customer
        'support_response', -- Response from support team
        'business_response', -- Response from business
        'driver_response', -- Response from driver
        'internal_note', -- Internal team communication
        'resolution_notice', -- Resolution notification
        'follow_up' -- Follow-up communication
    )),
    
    -- Message content
    message_subject VARCHAR(255),
    message_content TEXT NOT NULL,
    
    -- Attachments
    attachments TEXT[] DEFAULT '{}',
    
    -- Message properties
    is_internal BOOLEAN DEFAULT FALSE, -- Internal team communication
    is_automated BOOLEAN DEFAULT FALSE, -- System-generated message
    requires_response BOOLEAN DEFAULT FALSE,
    
    -- Read status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Trips System (for taxi/transport services)
-- =====================================================

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Passenger information
    passenger_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    passenger_name VARCHAR(255),
    passenger_phone VARCHAR(20),
    
    -- Driver information
    driver_profile_id UUID REFERENCES driver_profiles(id),
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    driver_vehicle_info JSONB, -- Make, model, plate, color
    
    -- Trip type
    trip_type VARCHAR(50) NOT NULL CHECK (trip_type IN (
        'taxi', -- Regular taxi ride
        'scheduled', -- Pre-scheduled ride
        'airport', -- Airport transfer
        'intercity', -- Between cities
        'delivery', -- Package delivery
        'medical', -- Medical transport
        'group', -- Group/shared ride
        'luxury', -- Premium/luxury service
        'corporate' -- Corporate booking
    )),
    
    -- Service provider
    service_provider_type VARCHAR(50) NOT NULL CHECK (service_provider_type IN (
        'independent_driver', -- Independent taxi driver
        'transport_company', -- Transport company
        'business_partner' -- Partner business providing transport
    )),
    service_provider_id UUID, -- Driver or transporter profile ID
    
    -- Location information
    pickup_location_name VARCHAR(255) NOT NULL,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT,
    
    dropoff_location_name VARCHAR(255) NOT NULL,
    dropoff_latitude DECIMAL(10, 8) NOT NULL,
    dropoff_longitude DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT,
    
    -- Additional stops
    waypoints JSONB DEFAULT '[]', -- Array of intermediate stops
    
    -- Trip timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_arrival_time TIMESTAMP WITH TIME ZONE,
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    
    -- Trip metrics
    estimated_distance_km DECIMAL(8, 2),
    actual_distance_km DECIMAL(8, 2),
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Trip status
    trip_status VARCHAR(50) DEFAULT 'requested' CHECK (trip_status IN (
        'requested', -- Trip requested by passenger
        'driver_assigned', -- Driver assigned to trip
        'driver_en_route', -- Driver heading to pickup
        'arrived_pickup', -- Driver arrived at pickup
        'passenger_picked_up', -- Passenger in vehicle
        'en_route_destination', -- Heading to destination
        'arrived_destination', -- Arrived at destination
        'completed', -- Trip completed successfully
        'cancelled_by_passenger', -- Cancelled by passenger
        'cancelled_by_driver', -- Cancelled by driver
        'cancelled_system', -- System cancelled (e.g., no driver)
        'no_show' -- Passenger didn't show up
    )),
    
    -- Pricing
    base_fare DECIMAL(8, 2) NOT NULL,
    distance_fare DECIMAL(8, 2) DEFAULT 0.00,
    time_fare DECIMAL(8, 2) DEFAULT 0.00,
    surge_multiplier DECIMAL(4, 2) DEFAULT 1.00,
    surge_amount DECIMAL(6, 2) DEFAULT 0.00,
    toll_charges DECIMAL(6, 2) DEFAULT 0.00,
    waiting_charges DECIMAL(6, 2) DEFAULT 0.00,
    cancellation_fee DECIMAL(6, 2) DEFAULT 0.00,
    discount_amount DECIMAL(6, 2) DEFAULT 0.00,
    tip_amount DECIMAL(6, 2) DEFAULT 0.00,
    total_fare DECIMAL(10, 2) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(50) CHECK (payment_method IN (
        'cash', 'card', 'wallet', 'corporate_account'
    )),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded'
    )),
    payment_reference VARCHAR(100),
    
    -- Special requirements
    special_instructions TEXT,
    accessibility_requirements TEXT,
    child_seat_required BOOLEAN DEFAULT FALSE,
    pet_friendly_required BOOLEAN DEFAULT FALSE,
    luggage_assistance_required BOOLEAN DEFAULT FALSE,
    
    -- Trip route and tracking
    route_points JSONB DEFAULT '[]', -- GPS coordinates during trip
    driver_tracking_enabled BOOLEAN DEFAULT TRUE,
    passenger_tracking_enabled BOOLEAN DEFAULT TRUE,
    
    -- Corporate booking
    corporate_account_id UUID REFERENCES business_profiles(id),
    corporate_cost_center VARCHAR(100),
    corporate_reference VARCHAR(100),
    
    -- Cancellation information
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES main_profiles(id),
    cancellation_reason VARCHAR(255),
    
    -- Emergency and safety
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    safety_alerts_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. Trip Events (for tracking trip progress)
-- =====================================================

CREATE TABLE IF NOT EXISTS trip_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'trip_requested',
        'driver_assigned',
        'driver_accepted',
        'driver_cancelled',
        'driver_en_route',
        'driver_arrived',
        'passenger_pickup',
        'trip_started',
        'waypoint_reached',
        'trip_completed',
        'passenger_cancelled',
        'payment_completed',
        'trip_rated',
        'emergency_activated',
        'route_deviation',
        'unexpected_stop'
    )),
    
    -- Event timestamp and location
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_location_lat DECIMAL(10, 8),
    event_location_lng DECIMAL(11, 8),
    
    -- Event details
    event_description TEXT,
    event_metadata JSONB DEFAULT '{}', -- Additional event-specific data
    
    -- Event source
    triggered_by UUID REFERENCES main_profiles(id), -- Who triggered the event
    is_automated BOOLEAN DEFAULT FALSE, -- System-generated event
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. Indexes for Common System Tables
-- =====================================================

-- Global ratings indexes
CREATE INDEX IF NOT EXISTS idx_global_ratings_entity ON global_ratings(rated_entity_type, rated_entity_id);
CREATE INDEX IF NOT EXISTS idx_global_ratings_rater ON global_ratings(rater_profile_id);
CREATE INDEX IF NOT EXISTS idx_global_ratings_overall ON global_ratings(overall_rating);
CREATE INDEX IF NOT EXISTS idx_global_ratings_approved ON global_ratings(is_approved);
CREATE INDEX IF NOT EXISTS idx_global_ratings_verified ON global_ratings(is_verified);
CREATE INDEX IF NOT EXISTS idx_global_ratings_date ON global_ratings(created_at);

-- Complaints indexes
CREATE INDEX IF NOT EXISTS idx_complaints_complainant ON complaints(complainant_profile_id);
CREATE INDEX IF NOT EXISTS idx_complaints_against ON complaints(complaint_against_type, complaint_against_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(complaint_status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(complaint_category);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority_level);
CREATE INDEX IF NOT EXISTS idx_complaints_number ON complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to);

-- Complaint communications indexes
CREATE INDEX IF NOT EXISTS idx_complaint_communications_complaint ON complaint_communications(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_communications_sender ON complaint_communications(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_complaint_communications_type ON complaint_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_complaint_communications_date ON complaint_communications(created_at);

-- Trips indexes
CREATE INDEX IF NOT EXISTS idx_trips_passenger ON trips(passenger_profile_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(trip_status);
CREATE INDEX IF NOT EXISTS idx_trips_type ON trips(trip_type);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(created_at);
CREATE INDEX IF NOT EXISTS idx_trips_pickup_location ON trips(pickup_latitude, pickup_longitude);
CREATE INDEX IF NOT EXISTS idx_trips_dropoff_location ON trips(dropoff_latitude, dropoff_longitude);
CREATE INDEX IF NOT EXISTS idx_trips_number ON trips(trip_number);
CREATE INDEX IF NOT EXISTS idx_trips_corporate ON trips(corporate_account_id);

-- Trip events indexes
CREATE INDEX IF NOT EXISTS idx_trip_events_trip ON trip_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_events_type ON trip_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trip_events_timestamp ON trip_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_trip_events_triggered_by ON trip_events(triggered_by);

-- =====================================================
-- 7. Update Triggers for Common System Tables
-- =====================================================

CREATE TRIGGER update_global_ratings_updated_at BEFORE UPDATE ON global_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. Row Level Security for Common System Tables
-- =====================================================

-- Enable RLS
ALTER TABLE global_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_events ENABLE ROW LEVEL SECURITY;

-- Global ratings policies
CREATE POLICY "Users can view public ratings" ON global_ratings FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can manage their own ratings" ON global_ratings FOR ALL USING (rater_profile_id::text = auth.uid()::text);

-- Business owners can view ratings for their entities
CREATE POLICY "Business owners can view their ratings" ON global_ratings FOR SELECT USING (
    rated_entity_type = 'business_profile' AND rated_entity_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

-- Complaints policies
CREATE POLICY "Users can manage their own complaints" ON complaints FOR ALL USING (complainant_profile_id::text = auth.uid()::text);
CREATE POLICY "Users can view complaints against their entities" ON complaints FOR SELECT USING (
    complaint_against_type = 'business_profile' AND complaint_against_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

-- Complaint communications policies
CREATE POLICY "Users can view their complaint communications" ON complaint_communications FOR SELECT USING (
    complaint_id IN (
        SELECT id FROM complaints WHERE complainant_profile_id::text = auth.uid()::text
    ) OR sender_profile_id::text = auth.uid()::text
);

-- Trips policies
CREATE POLICY "Passengers can view their trips" ON trips FOR SELECT USING (passenger_profile_id::text = auth.uid()::text);
CREATE POLICY "Drivers can view their trips" ON trips FOR SELECT USING (
    driver_profile_id IN (
        SELECT id FROM driver_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);
CREATE POLICY "Passengers can create trips" ON trips FOR INSERT WITH CHECK (passenger_profile_id::text = auth.uid()::text);

-- Trip events policies
CREATE POLICY "Users can view events for their trips" ON trip_events FOR SELECT USING (
    trip_id IN (
        SELECT id FROM trips WHERE passenger_profile_id::text = auth.uid()::text
        OR driver_profile_id IN (
            SELECT id FROM driver_profiles WHERE main_profile_id::text = auth.uid()::text
        )
    )
);

-- =====================================================
-- 9. Functions for Common System Operations
-- =====================================================

-- Function to calculate average rating for any entity
CREATE OR REPLACE FUNCTION calculate_entity_average_rating(
    p_entity_type VARCHAR(50),
    p_entity_id UUID
)
RETURNS TABLE (
    average_rating DECIMAL(3, 2),
    total_ratings INTEGER,
    rating_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(overall_rating), 2) as average_rating,
        COUNT(*)::INTEGER as total_ratings,
        JSON_BUILD_OBJECT(
            '5_star', COUNT(*) FILTER (WHERE overall_rating = 5),
            '4_star', COUNT(*) FILTER (WHERE overall_rating = 4),
            '3_star', COUNT(*) FILTER (WHERE overall_rating = 3),
            '2_star', COUNT(*) FILTER (WHERE overall_rating = 2),
            '1_star', COUNT(*) FILTER (WHERE overall_rating = 1)
        ) as rating_distribution
    FROM global_ratings
    WHERE rated_entity_type = p_entity_type
    AND rated_entity_id = p_entity_id
    AND is_approved = true;
END;
$$ LANGUAGE plpgsql;

-- Function to generate trip number
CREATE OR REPLACE FUNCTION generate_trip_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    counter INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    new_number := 'TRP' || TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the count of trips created today
    SELECT COUNT(*) + 1 INTO counter
    FROM trips
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Append counter with zero padding
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign trip number on insert
CREATE OR REPLACE FUNCTION auto_assign_trip_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
        NEW.trip_number := generate_trip_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trip number assignment
CREATE TRIGGER trigger_auto_assign_trip_number 
    BEFORE INSERT ON trips 
    FOR EACH ROW EXECUTE FUNCTION auto_assign_trip_number();

-- Function to generate complaint number
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    counter INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    new_number := 'CMP' || TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the count of complaints created today
    SELECT COUNT(*) + 1 INTO counter
    FROM complaints
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Append counter with zero padding
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign complaint number on insert
CREATE OR REPLACE FUNCTION auto_assign_complaint_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.complaint_number IS NULL OR NEW.complaint_number = '' THEN
        NEW.complaint_number := generate_complaint_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for complaint number assignment
CREATE TRIGGER trigger_auto_assign_complaint_number 
    BEFORE INSERT ON complaints 
    FOR EACH ROW EXECUTE FUNCTION auto_assign_complaint_number();

-- =====================================================
-- 10. Views for Easy Querying
-- =====================================================

-- Complete business ratings view
CREATE VIEW business_ratings_summary AS
SELECT 
    bp.id as business_id,
    bp.business_name,
    bp.business_type,
    ROUND(AVG(gr.overall_rating), 2) as average_rating,
    COUNT(gr.id) as total_ratings,
    COUNT(gr.id) FILTER (WHERE gr.overall_rating = 5) as five_star_count,
    COUNT(gr.id) FILTER (WHERE gr.overall_rating = 4) as four_star_count,
    COUNT(gr.id) FILTER (WHERE gr.overall_rating = 3) as three_star_count,
    COUNT(gr.id) FILTER (WHERE gr.overall_rating = 2) as two_star_count,
    COUNT(gr.id) FILTER (WHERE gr.overall_rating = 1) as one_star_count
FROM business_profiles bp
LEFT JOIN global_ratings gr ON gr.rated_entity_type = 'business_profile' AND gr.rated_entity_id = bp.id AND gr.is_approved = true
GROUP BY bp.id, bp.business_name, bp.business_type;

-- Active trips summary view
CREATE VIEW active_trips_summary AS
SELECT 
    t.id,
    t.trip_number,
    t.trip_type,
    t.trip_status,
    t.pickup_location_name,
    t.pickup_latitude,
    t.pickup_longitude,
    t.dropoff_location_name,
    t.dropoff_latitude,
    t.dropoff_longitude,
    t.requested_at,
    t.estimated_pickup_time,
    t.actual_pickup_time,
    t.total_fare,
    t.payment_status,
    -- Passenger information from profile
    mp_passenger.full_name as passenger_full_name,
    mp_passenger.phone as passenger_profile_phone,
    t.passenger_name as trip_passenger_name,
    t.passenger_phone as trip_passenger_phone,
    -- Driver information from profile
    dp.driver_license_number,
    mp_driver.full_name as driver_full_name,
    mp_driver.phone as driver_profile_phone,
    t.driver_name as trip_driver_name,
    t.driver_phone as trip_driver_phone,
    t.driver_vehicle_info,
    -- Service provider info
    t.service_provider_type,
    t.service_provider_id,
    -- Timing information
    t.estimated_distance_km,
    t.estimated_duration_minutes,
    t.created_at,
    t.updated_at
FROM trips t
JOIN main_profiles mp_passenger ON t.passenger_profile_id = mp_passenger.id
LEFT JOIN driver_profiles dp ON t.driver_profile_id = dp.id
LEFT JOIN main_profiles mp_driver ON dp.main_profile_id = mp_driver.id
WHERE t.trip_status NOT IN ('completed', 'cancelled_by_passenger', 'cancelled_by_driver', 'cancelled_system');

-- =====================================================
-- END OF COMMON SYSTEM TABLES
-- =====================================================
