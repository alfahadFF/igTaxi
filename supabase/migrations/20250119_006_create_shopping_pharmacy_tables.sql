-- =====================================================
-- Shopping Center & Pharmacy Specialized Tables
-- =====================================================

-- =====================================================
-- 1. Product Categories
-- =====================================================

CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    parent_category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE, -- For nested categories
    
    -- Category information
    category_name_ar VARCHAR(255) NOT NULL,
    category_name_en VARCHAR(255) NOT NULL,
    category_description_ar TEXT,
    category_description_en TEXT,
    category_slug VARCHAR(255), -- For SEO-friendly URLs
    
    -- Category hierarchy
    category_level INTEGER DEFAULT 1, -- 1 = main category, 2 = subcategory, etc.
    display_order INTEGER DEFAULT 0,
    
    -- Category features
    category_image_url TEXT,
    category_icon VARCHAR(100), -- Icon name/class
    
    -- Category type (for pharmacy vs shopping center)
    category_type VARCHAR(50) CHECK (category_type IN (
        'general', -- General products
        'prescription', -- Prescription medicines (pharmacy only)
        'otc', -- Over-the-counter medicines
        'medical_devices', -- Medical equipment
        'health_supplements', -- Vitamins, supplements
        'personal_care', -- Personal hygiene products
        'baby_care', -- Baby products
        'beauty', -- Cosmetics and beauty
        'food_beverage', -- Food and drinks
        'household', -- Household items
        'electronics', -- Electronic devices
        'clothing', -- Clothes and accessories
        'sports', -- Sports equipment
        'books_media', -- Books, magazines, media
        'toys_games', -- Toys and games
        'automotive', -- Car accessories
        'garden_outdoor' -- Garden and outdoor items
    )),
    
    -- Pharmacy-specific fields
    requires_prescription BOOLEAN DEFAULT FALSE,
    requires_pharmacist_consultation BOOLEAN DEFAULT FALSE,
    age_restriction INTEGER, -- Minimum age to purchase
    
    -- Category status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- SEO and search
    meta_title VARCHAR(255),
    meta_description TEXT,
    keywords TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. Products/Items
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    
    -- Product identification
    product_name_ar VARCHAR(255) NOT NULL,
    product_name_en VARCHAR(255) NOT NULL,
    product_description_ar TEXT,
    product_description_en TEXT,
    product_slug VARCHAR(255), -- For SEO-friendly URLs
    
    -- Product codes
    sku VARCHAR(100), -- Stock Keeping Unit
    barcode VARCHAR(100), -- Product barcode
    manufacturer_code VARCHAR(100),
    
    -- Pricing
    regular_price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2), -- Discounted price
    cost_price DECIMAL(10, 2), -- Purchase cost (for business owner)
    currency VARCHAR(3) DEFAULT 'JOD',
    
    -- Inventory
    current_stock INTEGER DEFAULT 0,
    minimum_stock_level INTEGER DEFAULT 5,
    maximum_stock_level INTEGER DEFAULT 1000,
    reorder_point INTEGER DEFAULT 10,
    
    -- Product details
    brand VARCHAR(100),
    manufacturer VARCHAR(100),
    model_number VARCHAR(100),
    weight_grams DECIMAL(8, 2),
    dimensions_cm VARCHAR(50), -- "L x W x H"
    
    -- Pharmacy-specific fields
    active_ingredient TEXT, -- For medicines
    strength VARCHAR(50), -- e.g., "500mg", "10ml"
    dosage_form VARCHAR(50), -- tablet, capsule, liquid, cream, etc.
    pack_size VARCHAR(50), -- "30 tablets", "100ml bottle"
    
    -- Medical information
    therapeutic_class VARCHAR(100), -- Drug classification
    indication TEXT, -- What the medicine treats
    contraindications TEXT, -- When not to use
    side_effects TEXT, -- Possible side effects
    storage_requirements TEXT, -- Storage conditions
    
    -- Prescription requirements
    requires_prescription BOOLEAN DEFAULT FALSE,
    prescription_only_medicine BOOLEAN DEFAULT FALSE,
    controlled_substance BOOLEAN DEFAULT FALSE,
    requires_id_verification BOOLEAN DEFAULT FALSE,
    
    -- Product safety
    expiry_date DATE, -- For items with expiration
    batch_number VARCHAR(50),
    manufacturing_date DATE,
    
    -- Age and usage restrictions
    minimum_age INTEGER, -- Minimum age to purchase
    maximum_daily_dose VARCHAR(100), -- For medicines
    pregnancy_category VARCHAR(10), -- A, B, C, D, X for pregnancy safety
    
    -- Product features
    is_organic BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_diabetic_friendly BOOLEAN DEFAULT FALSE,
    contains_allergens TEXT[] DEFAULT '{}',
    
    -- Media
    main_image_url TEXT,
    additional_images TEXT[] DEFAULT '{}',
    product_video_url TEXT,
    
    -- SEO and search
    tags TEXT[] DEFAULT '{}',
    meta_title VARCHAR(255),
    meta_description TEXT,
    search_keywords TEXT[] DEFAULT '{}',
    
    -- Product status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_on_sale BOOLEAN DEFAULT FALSE,
    
    -- Ratings and reviews
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. Product Variants (sizes, colors, etc.)
-- =====================================================

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Variant identification
    variant_name_ar VARCHAR(255) NOT NULL,
    variant_name_en VARCHAR(255) NOT NULL,
    variant_sku VARCHAR(100),
    variant_barcode VARCHAR(100),
    
    -- Variant attributes
    size VARCHAR(50), -- S, M, L, XL or numeric sizes
    color VARCHAR(50),
    material VARCHAR(100),
    flavor VARCHAR(50), -- For food/medicine
    concentration VARCHAR(50), -- For medicines/supplements
    
    -- Variant pricing
    price_adjustment DECIMAL(8, 2) DEFAULT 0.00, -- Additional cost for this variant
    
    -- Variant inventory
    stock_quantity INTEGER DEFAULT 0,
    variant_weight_grams DECIMAL(8, 2),
    
    -- Variant media
    variant_image_url TEXT,
    
    -- Variant status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE, -- Default variant for the product
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Product Orders
-- =====================================================

CREATE TABLE IF NOT EXISTS product_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- Order identification
    order_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Order type
    order_type VARCHAR(50) NOT NULL CHECK (order_type IN (
        'pickup', -- Customer picks up from store
        'delivery', -- Home delivery
        'prescription_pickup', -- Prescription collection
        'prescription_delivery' -- Prescription home delivery
    )),
    
    -- Order status
    order_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (order_status IN (
        'pending', -- Order placed, awaiting confirmation
        'confirmed', -- Order confirmed by business
        'preparing', -- Items being prepared
        'ready', -- Order ready for pickup
        'out_for_delivery', -- Driver picked up order
        'delivered', -- Order delivered
        'completed', -- Order completed (picked up)
        'cancelled', -- Order cancelled
        'refunded' -- Order refunded
    )),
    
    -- Customer information
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Delivery information
    delivery_address TEXT,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    delivery_instructions TEXT,
    delivery_driver_id UUID REFERENCES driver_profiles(id),
    delivery_fee DECIMAL(6, 2) DEFAULT 0.00,
    
    -- Prescription information (for pharmacy orders)
    prescription_required BOOLEAN DEFAULT FALSE,
    prescription_image_url TEXT, -- Photo of prescription
    prescription_verified BOOLEAN DEFAULT FALSE,
    pharmacist_id UUID REFERENCES main_profiles(id), -- Pharmacist who verified
    patient_name VARCHAR(255), -- Name on prescription
    doctor_name VARCHAR(255), -- Prescribing doctor
    prescription_date DATE,
    
    -- Insurance information (for pharmacy)
    insurance_provider VARCHAR(100),
    insurance_policy_number VARCHAR(100),
    insurance_coverage_percentage DECIMAL(5, 2) DEFAULT 0.00,
    
    -- Timing
    estimated_preparation_time INTEGER, -- in minutes
    requested_delivery_time TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Financial information
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(8, 2) DEFAULT 0.00,
    delivery_fee_amount DECIMAL(6, 2) DEFAULT 0.00,
    discount_amount DECIMAL(8, 2) DEFAULT 0.00,
    insurance_discount DECIMAL(8, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Payment
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
        'insurance',
        'mixed'
    )),
    
    -- Special instructions
    special_instructions TEXT,
    business_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. Product Order Items
-- =====================================================

CREATE TABLE IF NOT EXISTS product_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_variant_id UUID REFERENCES product_variants(id),
    
    -- Item details at time of order
    product_name_ar VARCHAR(255) NOT NULL,
    product_name_en VARCHAR(255) NOT NULL,
    variant_details VARCHAR(255), -- Size, color, etc.
    unit_price DECIMAL(8, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Prescription details (for pharmacy items)
    requires_prescription BOOLEAN DEFAULT FALSE,
    prescription_quantity INTEGER, -- Quantity as per prescription
    dosage_instructions TEXT, -- How to take the medicine
    
    -- Pricing calculations
    line_total DECIMAL(8, 2) NOT NULL, -- unit_price * quantity
    discount_amount DECIMAL(6, 2) DEFAULT 0.00,
    insurance_coverage DECIMAL(6, 2) DEFAULT 0.00,
    final_total DECIMAL(8, 2) NOT NULL,
    
    -- Item status
    item_status VARCHAR(50) DEFAULT 'pending' CHECK (item_status IN (
        'pending',
        'confirmed',
        'out_of_stock',
        'substituted',
        'cancelled'
    )),
    
    -- Substitution information
    original_product_id UUID REFERENCES products(id), -- If item was substituted
    substitution_reason TEXT,
    customer_approved_substitution BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. Product Reviews
-- =====================================================

CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES product_orders(id) ON DELETE SET NULL,
    
    -- Rating (1-5 stars)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5), -- For medicines
    
    -- Review content
    review_title VARCHAR(255),
    review_text TEXT,
    review_photos TEXT[] DEFAULT '{}',
    
    -- Medical review (for pharmacy products)
    side_effects_experienced TEXT, -- Any side effects
    effectiveness_description TEXT, -- How well the medicine worked
    ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
    
    -- Review verification
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    purchase_date DATE,
    
    -- Review status
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_notes TEXT,
    
    -- Business response
    business_response TEXT,
    business_response_date TIMESTAMP WITH TIME ZONE,
    
    -- Helpful votes
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. Product Promotions and Offers
-- =====================================================

CREATE TABLE IF NOT EXISTS product_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    
    -- Promotion basic information
    promotion_title_ar VARCHAR(255) NOT NULL,
    promotion_title_en VARCHAR(255) NOT NULL,
    promotion_description_ar TEXT,
    promotion_description_en TEXT,
    
    -- Promotion type
    promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN (
        'percentage_discount', -- 20% off
        'fixed_amount_discount', -- 5 JOD off
        'buy_x_get_y', -- Buy 2 get 1 free
        'bulk_discount', -- Discount for buying multiple
        'category_discount', -- Discount on entire category
        'loyalty_discount', -- Discount for loyal customers
        'prescription_discount', -- Discount on prescription items
        'first_time_customer', -- New customer discount
        'seasonal_sale' -- Seasonal promotions
    )),
    
    -- Discount details
    discount_percentage DECIMAL(5, 2),
    discount_amount DECIMAL(8, 2),
    minimum_purchase_amount DECIMAL(8, 2),
    maximum_discount_amount DECIMAL(8, 2),
    
    -- Buy X Get Y details
    buy_quantity INTEGER DEFAULT 1,
    get_quantity INTEGER DEFAULT 0,
    get_discount_percentage DECIMAL(5, 2) DEFAULT 100.00,
    
    -- Applicable products/categories
    applicable_products UUID[] DEFAULT NULL, -- Array of product IDs
    applicable_categories UUID[] DEFAULT NULL, -- Array of category IDs
    excluded_products UUID[] DEFAULT '{}', -- Products excluded from promotion
    
    -- Time constraints
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Usage limits
    max_uses_total INTEGER,
    max_uses_per_customer INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- Conditions
    requires_membership BOOLEAN DEFAULT FALSE,
    requires_prescription BOOLEAN DEFAULT FALSE, -- For pharmacy promotions
    minimum_age INTEGER, -- Age restriction
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_stackable BOOLEAN DEFAULT FALSE, -- Can be combined with other promotions
    
    -- Display
    promotion_image_url TEXT,
    display_priority INTEGER DEFAULT 0,
    featured_on_homepage BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. Inventory Transactions
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants(id),
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'purchase', -- Stock purchased from supplier
        'sale', -- Stock sold to customer
        'adjustment', -- Manual stock adjustment
        'return', -- Customer return
        'damage', -- Damaged stock
        'expiry', -- Expired stock removed
        'transfer' -- Stock transfer between locations
    )),
    
    -- Quantity changes
    quantity_change INTEGER NOT NULL, -- Positive for increases, negative for decreases
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    
    -- Cost information
    unit_cost DECIMAL(8, 2),
    total_cost DECIMAL(10, 2),
    
    -- Reference information
    reference_order_id UUID REFERENCES product_orders(id),
    supplier_name VARCHAR(255),
    supplier_invoice_number VARCHAR(100),
    batch_number VARCHAR(50),
    expiry_date DATE,
    
    -- Transaction details
    transaction_notes TEXT,
    performed_by UUID REFERENCES main_profiles(id), -- Staff member who performed the transaction
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. Indexes for Shopping Center & Pharmacy Tables
-- =====================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_business ON product_categories(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_type ON product_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_featured ON product_categories(is_featured);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_prescription ON products(requires_prescription);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(regular_price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(average_rating);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(current_stock);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);

-- Full-text search for products
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(
    to_tsvector('arabic', COALESCE(product_name_ar, '') || ' ' || COALESCE(product_description_ar, '') || ' ' || COALESCE(brand, ''))
);

-- Product variants indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(variant_sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_product_orders_business ON product_orders(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_customer ON product_orders(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_product_orders_type ON product_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_product_orders_date ON product_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_product_orders_prescription ON product_orders(prescription_required);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_product_order_items_order ON product_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_order_items_product ON product_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_order_items_variant ON product_order_items(product_variant_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_business ON product_reviews(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_customer ON product_reviews(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(is_approved);

-- Promotions indexes
CREATE INDEX IF NOT EXISTS idx_product_promotions_business ON product_promotions(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_product_promotions_active ON product_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_product_promotions_valid_period ON product_promotions(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_product_promotions_type ON product_promotions(promotion_type);

-- Inventory transactions indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_business ON inventory_transactions(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(created_at);

-- =====================================================
-- 10. Update Triggers for Shopping & Pharmacy Tables
-- =====================================================

CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_orders_updated_at BEFORE UPDATE ON product_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_promotions_updated_at BEFORE UPDATE ON product_promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. Row Level Security for Shopping & Pharmacy Tables
-- =====================================================

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Business owner policies
CREATE POLICY "Business owners can manage their product categories" ON product_categories FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

CREATE POLICY "Business owners can manage their products" ON products FOR ALL USING (
    business_profile_id IN (
        SELECT id FROM business_profiles WHERE main_profile_id::text = auth.uid()::text
    )
);

-- Public read access
CREATE POLICY "Public can view active product categories" ON product_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active product variants" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active promotions" ON product_promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view approved reviews" ON product_reviews FOR SELECT USING (is_approved = true);

-- Customer policies
CREATE POLICY "Customers can manage their own orders" ON product_orders FOR ALL USING (
    customer_profile_id::text = auth.uid()::text
);
CREATE POLICY "Customers can manage their own reviews" ON product_reviews FOR ALL USING (
    customer_profile_id::text = auth.uid()::text
);

-- =====================================================
-- 12. Functions for Shopping & Pharmacy Operations
-- =====================================================

-- Function to update product stock after order
CREATE OR REPLACE FUNCTION update_product_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- When order status changes to completed, reduce stock
    IF NEW.order_status = 'completed' AND (OLD.order_status IS NULL OR OLD.order_status != 'completed') THEN
        -- Update stock for each item in the order
        UPDATE products 
        SET current_stock = current_stock - poi.quantity,
            total_sales = total_sales + poi.quantity,
            updated_at = NOW()
        FROM product_order_items poi
        WHERE poi.order_id = NEW.id 
        AND products.id = poi.product_id;
        
        -- Update variant stock if applicable
        UPDATE product_variants 
        SET stock_quantity = stock_quantity - poi.quantity
        FROM product_order_items poi
        WHERE poi.order_id = NEW.id 
        AND product_variants.id = poi.product_variant_id
        AND poi.product_variant_id IS NOT NULL;
        
    -- When order is cancelled, restore stock
    ELSIF NEW.order_status = 'cancelled' AND OLD.order_status NOT IN ('cancelled', 'refunded') THEN
        UPDATE products 
        SET current_stock = current_stock + poi.quantity,
            updated_at = NOW()
        FROM product_order_items poi
        WHERE poi.order_id = NEW.id 
        AND products.id = poi.product_id;
        
        UPDATE product_variants 
        SET stock_quantity = stock_quantity + poi.quantity
        FROM product_order_items poi
        WHERE poi.order_id = NEW.id 
        AND product_variants.id = poi.product_variant_id
        AND poi.product_variant_id IS NOT NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order status changes
CREATE TRIGGER trigger_update_product_stock_on_order 
    AFTER UPDATE ON product_orders 
    FOR EACH ROW EXECUTE FUNCTION update_product_stock_on_order();

-- Function to calculate product average rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the product's average rating and review count
    UPDATE products 
    SET average_rating = (
        SELECT ROUND(AVG(overall_rating), 2)
        FROM product_reviews 
        WHERE product_id = NEW.product_id 
        AND is_approved = true
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM product_reviews 
        WHERE product_id = NEW.product_id 
        AND is_approved = true
    ),
    updated_at = NOW()
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for review updates
CREATE TRIGGER trigger_update_product_rating 
    AFTER INSERT OR UPDATE ON product_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- =====================================================
-- END OF SHOPPING CENTER & PHARMACY TABLES
-- =====================================================
