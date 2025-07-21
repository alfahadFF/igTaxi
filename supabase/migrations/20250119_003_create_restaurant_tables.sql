-- =====================================================
-- Restaurant & Cafe Specialized Tables
-- =====================================================

-- =====================================================
-- 1. Restaurant/Cafe Menu Categories
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    category_name_ar VARCHAR(255) NOT NULL,
    category_name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    category_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. Restaurant/Cafe Menu Items
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES restaurant_menu_categories(id) ON DELETE CASCADE,
    
    -- Item basic information
    item_name_ar VARCHAR(255) NOT NULL,
    item_name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    
    -- Pricing
    price DECIMAL(8, 2) NOT NULL,
    original_price DECIMAL(8, 2), -- For discount calculations
    currency VARCHAR(3) DEFAULT 'JOD',
    
    -- Item details
    preparation_time_minutes INTEGER DEFAULT 15,
    calories INTEGER,
    spice_level INTEGER DEFAULT 0 CHECK (spice_level >= 0 AND spice_level <= 5),
    
    -- Dietary information
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_halal BOOLEAN DEFAULT TRUE,
    allergens TEXT[] DEFAULT '{}', -- Array of allergens
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    available_times JSONB DEFAULT '{"all_day": true, "start_time": null, "end_time": null}',
    
    -- Media
    main_image_url TEXT,
    additional_images TEXT[] DEFAULT '{}',
    
    -- SEO and search
    tags TEXT[] DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT FALSE,
    inventory_count INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. Menu Item Customizations/Options
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_menu_item_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES restaurant_menu_items(id) ON DELETE CASCADE,
    
    -- Option group (e.g., "Size", "Add-ons", "Cooking preference")
    option_group_name_ar VARCHAR(255) NOT NULL,
    option_group_name_en VARCHAR(255) NOT NULL,
    
    -- Option details
    option_name_ar VARCHAR(255) NOT NULL,
    option_name_en VARCHAR(255) NOT NULL,
    price_adjustment DECIMAL(6, 2) DEFAULT 0.00, -- Additional cost
    
    -- Option behavior
    is_required BOOLEAN DEFAULT FALSE,
    is_multiple_choice BOOLEAN DEFAULT FALSE, -- Can select multiple options in this group
    max_selections INTEGER DEFAULT 1,
    
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Restaurant Special Offers
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Offer basic information
    offer_title_ar VARCHAR(255) NOT NULL,
    offer_title_en VARCHAR(255) NOT NULL,
    offer_description_ar TEXT,
    offer_description_en TEXT,
    
    -- Offer type
    offer_type VARCHAR(50) NOT NULL CHECK (offer_type IN (
        'percentage_discount', -- 20% off
        'fixed_amount_discount', -- 5 JOD off
        'buy_x_get_y', -- Buy 2 get 1 free
        'combo_deal', -- Meal combo
        'happy_hour', -- Time-based discount
        'loyalty_reward' -- For loyal customers
    )),
    
    -- Discount details
    discount_percentage DECIMAL(5, 2), -- For percentage discounts
    discount_amount DECIMAL(8, 2), -- For fixed amount discounts
    minimum_order_amount DECIMAL(8, 2), -- Minimum order to qualify
    
    -- Buy X Get Y details
    buy_quantity INTEGER DEFAULT 1,
    get_quantity INTEGER DEFAULT 0,
    get_discount_percentage DECIMAL(5, 2) DEFAULT 100.00, -- 100% = free
    
    -- Applicable items (null = all items)
    applicable_menu_items UUID[] DEFAULT NULL, -- Array of menu item IDs
    applicable_categories UUID[] DEFAULT NULL, -- Array of category IDs
    
    -- Time constraints
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Day/time restrictions
    valid_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
    valid_start_time TIME,
    valid_end_time TIME,
    
    -- Usage limits
    max_uses_total INTEGER, -- Total times this offer can be used
    max_uses_per_customer INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    requires_code BOOLEAN DEFAULT FALSE,
    promo_code VARCHAR(50),
    
    -- Display
    offer_image_url TEXT,
    display_priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. Restaurant Orders
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- Order identification
    order_number VARCHAR(20) UNIQUE NOT NULL, -- Human-readable order number
    
    -- Order status
    order_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (order_status IN (
        'pending', -- Order placed, waiting for restaurant confirmation
        'confirmed', -- Restaurant confirmed the order
        'preparing', -- Food is being prepared
        'ready', -- Food is ready for pickup/delivery
        'out_for_delivery', -- Driver picked up the order
        'delivered', -- Order delivered successfully
        'cancelled', -- Order cancelled
        'refunded' -- Order refunded
    )),
    
    -- Order type
    order_type VARCHAR(50) NOT NULL CHECK (order_type IN (
        'dine_in',
        'takeaway', 
        'delivery'
    )),
    
    -- Timing
    estimated_preparation_time INTEGER, -- in minutes
    requested_delivery_time TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Customer information
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Delivery information (if applicable)
    delivery_address TEXT,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    delivery_instructions TEXT,
    delivery_driver_id UUID REFERENCES driver_profiles(id),
    delivery_fee DECIMAL(6, 2) DEFAULT 0.00,
    
    -- Payment information
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(8, 2) DEFAULT 0.00,
    delivery_fee_amount DECIMAL(6, 2) DEFAULT 0.00,
    discount_amount DECIMAL(8, 2) DEFAULT 0.00,
    tip_amount DECIMAL(6, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',
        'paid',
        'failed',
        'refunded',
        'partial_refund'
    )),
    payment_method VARCHAR(50) CHECK (payment_method IN (
        'cash',
        'card',
        'online',
        'wallet'
    )),
    
    -- Applied offers
    applied_offers UUID[] DEFAULT '{}', -- Array of offer IDs used
    promo_code_used VARCHAR(50),
    
    -- Special instructions
    special_instructions TEXT,
    
    -- Restaurant notes
    restaurant_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. Restaurant Order Items
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES restaurant_orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES restaurant_menu_items(id),
    
    -- Item details at time of order
    item_name_ar VARCHAR(255) NOT NULL,
    item_name_en VARCHAR(255) NOT NULL,
    unit_price DECIMAL(8, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Customizations applied
    selected_options JSONB DEFAULT '[]', -- Array of selected options with prices
    special_requests TEXT,
    
    -- Pricing calculations
    base_total DECIMAL(8, 2) NOT NULL, -- unit_price * quantity
    options_total DECIMAL(8, 2) DEFAULT 0.00, -- Total for all options
    item_total DECIMAL(8, 2) NOT NULL, -- base_total + options_total
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. Restaurant Reviews and Ratings
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES restaurant_orders(id) ON DELETE SET NULL, -- Optional: link to specific order
    
    -- Rating (1-5 stars)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- Review content
    review_title VARCHAR(255),
    review_text TEXT,
    review_photos TEXT[] DEFAULT '{}',
    
    -- Review status
    is_verified BOOLEAN DEFAULT FALSE, -- Based on actual order
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Restaurant response
    restaurant_response TEXT,
    restaurant_response_date TIMESTAMP WITH TIME ZONE,
    
    -- Helpful votes
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. Restaurant Tables (for dine-in reservations)
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    table_number VARCHAR(20) NOT NULL,
    table_capacity INTEGER NOT NULL DEFAULT 2,
    table_type VARCHAR(50) DEFAULT 'regular' CHECK (table_type IN (
        'regular',
        'booth',
        'private_room',
        'outdoor',
        'bar_seating',
        'high_top'
    )),
    
    -- Location details
    floor_level INTEGER DEFAULT 1,
    section VARCHAR(100), -- e.g., "Main dining", "Patio", "VIP"
    
    -- Table features
    has_window_view BOOLEAN DEFAULT FALSE,
    is_wheelchair_accessible BOOLEAN DEFAULT TRUE,
    special_features TEXT[] DEFAULT '{}', -- e.g., ["charging_station", "privacy_screen"]
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    current_status VARCHAR(50) DEFAULT 'available' CHECK (current_status IN (
        'available',
        'occupied',
        'reserved',
        'cleaning',
        'out_of_order'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(business_profile_id, table_number)
);

-- =====================================================
-- 9. Restaurant Table Reservations
-- =====================================================

CREATE TABLE IF NOT EXISTS restaurant_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    
    -- Reservation details
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 2,
    duration_minutes INTEGER DEFAULT 120, -- Expected dining duration
    
    -- Customer information
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    
    -- Special requirements
    special_requests TEXT,
    dietary_restrictions TEXT,
    celebration_type VARCHAR(100), -- birthday, anniversary, etc.
    
    -- Status
    reservation_status VARCHAR(50) DEFAULT 'confirmed' CHECK (reservation_status IN (
        'pending',
        'confirmed',
        'seated',
        'completed',
        'cancelled',
        'no_show'
    )),
    
    -- Timing
    confirmed_at TIMESTAMP WITH TIME ZONE,
    seated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Restaurant notes
    restaurant_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. Indexes for Restaurant Tables
-- =====================================================

-- Menu categories indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_categories_business ON restaurant_menu_categories(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_categories_active ON restaurant_menu_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_categories_order ON restaurant_menu_categories(display_order);

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_items_business ON restaurant_menu_items(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_items_category ON restaurant_menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_items_available ON restaurant_menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_items_price ON restaurant_menu_items(price);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_items_tags ON restaurant_menu_items USING GIN(tags);

-- Menu item options indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_item_options_item ON restaurant_menu_item_options(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_item_options_available ON restaurant_menu_item_options(is_available);

-- Offers indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_offers_business ON restaurant_offers(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_offers_active ON restaurant_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_offers_valid_period ON restaurant_offers(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_restaurant_offers_type ON restaurant_offers(offer_type);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_business ON restaurant_orders(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_customer ON restaurant_orders(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_status ON restaurant_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_type ON restaurant_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_date ON restaurant_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_number ON restaurant_orders(order_number);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_order_items_order ON restaurant_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_items_menu_item ON restaurant_order_items(menu_item_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_business ON restaurant_reviews(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_customer ON restaurant_reviews(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_rating ON restaurant_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_approved ON restaurant_reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_verified ON restaurant_reviews(is_verified);

-- Tables indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_business ON restaurant_tables(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(current_status);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_capacity ON restaurant_tables(table_capacity);

-- Reservations indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_business ON restaurant_reservations(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_customer ON restaurant_reservations(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_date_time ON restaurant_reservations(reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_status ON restaurant_reservations(reservation_status);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_table ON restaurant_reservations(table_id);

-- =====================================================
-- 11. Update Triggers for Restaurant Tables
-- =====================================================

CREATE TRIGGER update_restaurant_menu_categories_updated_at BEFORE UPDATE ON restaurant_menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_menu_items_updated_at BEFORE UPDATE ON restaurant_menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_menu_item_options_updated_at BEFORE UPDATE ON restaurant_menu_item_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_offers_updated_at BEFORE UPDATE ON restaurant_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_orders_updated_at BEFORE UPDATE ON restaurant_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_reviews_updated_at BEFORE UPDATE ON restaurant_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_tables_updated_at BEFORE UPDATE ON restaurant_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_reservations_updated_at BEFORE UPDATE ON restaurant_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. Row Level Security for Restaurant Tables
-- =====================================================

-- Enable RLS
ALTER TABLE restaurant_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;

-- Business owner policies for menu management
CREATE POLICY "Business owners can manage their menu categories" ON restaurant_menu_categories FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

CREATE POLICY "Business owners can manage their menu items" ON restaurant_menu_items FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

CREATE POLICY "Business owners can manage their menu item options" ON restaurant_menu_item_options FOR ALL USING (
    menu_item_id IN (
        SELECT rmi.id FROM restaurant_menu_items rmi
        JOIN business_profiles bp ON rmi.business_profile_id = bp.id
        WHERE bp.main_profile_id::text = auth.uid()::text
    )
);

-- Public read access for active menu items (for customers browsing)
CREATE POLICY "Public can view active menu categories" ON restaurant_menu_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view available menu items" ON restaurant_menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Public can view available menu options" ON restaurant_menu_item_options FOR SELECT USING (is_available = true);

-- Offers policies
CREATE POLICY "Business owners can manage their offers" ON restaurant_offers FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);
CREATE POLICY "Public can view active offers" ON restaurant_offers FOR SELECT USING (is_active = true);

-- Orders policies
CREATE POLICY "Business owners can view their orders" ON restaurant_orders FOR SELECT USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);
CREATE POLICY "Customers can view their own orders" ON restaurant_orders FOR SELECT USING (
    customer_profile_id::text = auth.uid()::text
);
CREATE POLICY "Customers can create orders" ON restaurant_orders FOR INSERT WITH CHECK (
    customer_profile_id::text = auth.uid()::text
);

-- Reviews policies
CREATE POLICY "Business owners can view their reviews" ON restaurant_reviews FOR SELECT USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);
CREATE POLICY "Customers can manage their own reviews" ON restaurant_reviews FOR ALL USING (
    customer_profile_id::text = auth.uid()::text
);
CREATE POLICY "Public can view approved reviews" ON restaurant_reviews FOR SELECT USING (is_approved = true);

-- =====================================================
-- END OF RESTAURANT & CAFE TABLES
-- =====================================================
