-- ===================================================================
-- Sample Data for IGTaxi Recharge System Testing
-- ===================================================================

-- Insert sample recharge cards with USD values converted to SAR (1 USD = 3.75 SAR)
INSERT INTO public.igtaxi_cards (serial_number, redeem_code, value, type, qr_url) VALUES
('IGT-001-2025', 'IGTAXI5USD001', 18.75, 'driver', 'https://qr.igtaxi.com/cards/IGTAXI5USD001'),   -- 5 USD
('IGT-002-2025', 'IGTAXI10USD02', 37.50, 'driver', 'https://qr.igtaxi.com/cards/IGTAXI10USD02'),   -- 10 USD
('IGT-003-2025', 'IGTAXI15USD03', 56.25, 'general', 'https://qr.igtaxi.com/cards/IGTAXI15USD03'),  -- 15 USD
('IGT-004-2025', 'IGTAXI20USD04', 75.00, 'driver', 'https://qr.igtaxi.com/cards/IGTAXI20USD04'),   -- 20 USD
('IGT-005-2025', 'IGTAXI25USD05', 93.75, 'company', 'https://qr.igtaxi.com/cards/IGTAXI25USD05'),  -- 25 USD
('IGT-006-2025', 'IGTAXI5USD006', 18.75, 'general', 'https://qr.igtaxi.com/cards/IGTAXI5USD006'),  -- 5 USD
('IGT-007-2025', 'IGTAXI10USD07', 37.50, 'driver', 'https://qr.igtaxi.com/cards/IGTAXI10USD07'),   -- 10 USD
('IGT-008-2025', 'IGTAXI15USD08', 56.25, 'company', 'https://qr.igtaxi.com/cards/IGTAXI15USD08'),  -- 15 USD
('IGT-009-2025', 'IGTAXI20USD09', 75.00, 'general', 'https://qr.igtaxi.com/cards/IGTAXI20USD09'),  -- 20 USD
('IGT-010-2025', 'IGTAXI25USD10', 93.75, 'driver', 'https://qr.igtaxi.com/cards/IGTAXI25USD10'),   -- 25 USD
('IGT-011-2025', 'IGTAXI5USD011', 18.75, 'driver', 'https://qr.igtaxi.com/cards/IGTAXI5USD011'),   -- 5 USD
('IGT-012-2025', 'IGTAXI10USD12', 37.50, 'company', 'https://qr.igtaxi.com/cards/IGTAXI10USD12'),  -- 10 USD
('IGT-013-2025', 'IGTAXI15USD13', 56.25, 'driver', 'https://qr.igtaxi.com/cards/IGTAXI15USD13'),   -- 15 USD
('IGT-014-2025', 'IGTAXI20USD14', 75.00, 'company', 'https://qr.igtaxi.com/cards/IGTAXI20USD14'),  -- 20 USD
('IGT-015-2025', 'IGTAXI25USD15', 93.75, 'general', 'https://qr.igtaxi.com/cards/IGTAXI25USD15');  -- 25 USD

-- Insert sample subscription plans (if not exists)
INSERT INTO public.subscription_plans (name, name_ar, user_type, amount, duration_days, features) 
SELECT * FROM (VALUES
('Driver Basic', 'سائق أساسي', 'driver', 50.00, 30, '{"max_trips": 100, "support": "basic", "commission_discount": 0}'),
('Driver Premium', 'سائق مميز', 'driver', 100.00, 30, '{"max_trips": -1, "support": "premium", "priority": true, "commission_discount": 5}'),
('Driver VIP', 'سائق VIP', 'driver', 200.00, 30, '{"max_trips": -1, "support": "vip", "priority": true, "commission_discount": 10, "insurance": true}'),
('Company Standard', 'شركة عادية', 'company', 200.00, 30, '{"max_drivers": 10, "support": "standard", "analytics": "basic"}'),
('Company Professional', 'شركة محترفة', 'company', 500.00, 30, '{"max_drivers": 50, "support": "premium", "analytics": "advanced", "api_access": true}'),
('Company Enterprise', 'شركة متقدمة', 'company', 1000.00, 30, '{"max_drivers": -1, "support": "enterprise", "analytics": "full", "api_access": true, "white_label": true}'),
('Establishment Basic', 'منشأة أساسية', 'establishment', 75.00, 30, '{"max_orders": 200, "support": "basic", "delivery_zone": "city"}'),
('Establishment Premium', 'منشأة متقدمة', 'establishment', 150.00, 30, '{"max_orders": -1, "support": "premium", "delivery_zone": "region", "analytics": true}')
) AS new_plans(name, name_ar, user_type, amount, duration_days, features)
WHERE NOT EXISTS (
    SELECT 1 FROM public.subscription_plans sp 
    WHERE sp.name = new_plans.name AND sp.user_type = new_plans.user_type
);

-- Update commission rates with more realistic values
INSERT INTO public.commission_rates (user_type, service_type, rate_percentage, fixed_amount, min_amount, max_amount) 
SELECT * FROM (VALUES
('driver', 'taxi_standard', 8.0, 2.00, 2.00, 15.00),
('driver', 'taxi_comfort', 10.0, 3.00, 3.00, 20.00),
('driver', 'taxi_premium', 12.0, 5.00, 5.00, 30.00),
('driver', 'delivery_food', 8.0, 1.50, 1.50, 10.00),
('driver', 'delivery_pharmacy', 10.0, 2.00, 2.00, 12.00),
('driver', 'delivery_shopping', 12.0, 3.00, 3.00, 15.00),
('company', 'taxi_fleet', 15.0, 0.00, 5.00, 50.00),
('company', 'delivery_fleet', 12.0, 0.00, 3.00, 30.00),
('delivery', 'food_delivery', 8.0, 1.00, 1.00, 8.00),
('delivery', 'pharmacy_delivery', 10.0, 2.00, 2.00, 10.00),
('delivery', 'shopping_delivery', 12.0, 2.50, 2.50, 12.00),
('delivery', 'water_delivery', 6.0, 3.00, 3.00, 15.00),
('delivery', 'gas_delivery', 5.0, 5.00, 5.00, 20.00)
) AS new_rates(user_type, service_type, rate_percentage, fixed_amount, min_amount, max_amount)
WHERE NOT EXISTS (
    SELECT 1 FROM public.commission_rates cr 
    WHERE cr.user_type = new_rates.user_type AND cr.service_type = new_rates.service_type
);

-- Update existing commission rates if needed
UPDATE public.commission_rates SET
    rate_percentage = CASE 
        WHEN user_type = 'driver' AND service_type = 'taxi_standard' THEN 8.0
        WHEN user_type = 'driver' AND service_type = 'taxi_comfort' THEN 10.0
        WHEN user_type = 'driver' AND service_type = 'taxi_premium' THEN 12.0
        ELSE rate_percentage
    END,
    updated_at = timezone('utc', now())
WHERE (user_type = 'driver' AND service_type IN ('taxi_standard', 'taxi_comfort', 'taxi_premium'));

-- Create some test users with wallets (for development only)
DO $$
DECLARE
    test_user_id UUID;
    test_wallet_id UUID;
BEGIN
    -- Only create test data if no users exist (development environment)
    IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        
        -- Create test driver user
        INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
        VALUES (
            gen_random_uuid(),
            'test_driver@igtaxi.com',
            timezone('utc', now()),
            timezone('utc', now()),
            timezone('utc', now())
        ) RETURNING id INTO test_user_id;
        
        -- Create wallet for test user
        INSERT INTO public.user_wallets (user_id, balance, total_recharged, total_spent)
        VALUES (test_user_id, 150.00, 200.00, 50.00)
        RETURNING id INTO test_wallet_id;
        
        -- Add some sample transactions
        INSERT INTO public.wallet_transactions (
            user_id, wallet_id, type, amount, description, balance_before, balance_after, status
        ) VALUES
        (test_user_id, test_wallet_id, 'recharge', 100.00, 'شحن رصيد باستخدام بطاقة شحن', 0.00, 100.00, 'completed'),
        (test_user_id, test_wallet_id, 'commission', -15.00, 'عمولة رحلة تاكسي', 100.00, 85.00, 'completed'),
        (test_user_id, test_wallet_id, 'recharge', 100.00, 'شحن رصيد باستخدام بطاقة شحن', 85.00, 185.00, 'completed'),
        (test_user_id, test_wallet_id, 'subscription', -35.00, 'اشتراك شهري - خطة أساسية', 185.00, 150.00, 'completed');
        
        -- Create test company user
        INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
        VALUES (
            gen_random_uuid(),
            'test_company@igtaxi.com',
            timezone('utc', now()),
            timezone('utc', now()),
            timezone('utc', now())
        ) RETURNING id INTO test_user_id;
        
        -- Create wallet for test company
        INSERT INTO public.user_wallets (user_id, balance, total_recharged, total_spent)
        VALUES (test_user_id, 750.00, 1000.00, 250.00);
        
    END IF;
END $$;

-- Create some used cards for testing (simulate usage)
UPDATE public.igtaxi_cards 
SET 
    status = 'used',
    used_at = timezone('utc', now()) - interval '1 day',
    used_by = (SELECT id FROM auth.users LIMIT 1)
WHERE redeem_code IN ('IGTAXI5USD001', 'IGTAXI10USD02')
AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- Add some expired cards for testing
INSERT INTO public.igtaxi_cards (serial_number, redeem_code, value, type, status, expires_at) VALUES
('IGT-EXP-001', 'IGTAXIEXP5USD', 18.75, 'general', 'expired', timezone('utc', now()) - interval '30 days'),  -- 5 USD expired
('IGT-EXP-002', 'IGTAXIEXP10USD', 37.50, 'driver', 'expired', timezone('utc', now()) - interval '15 days'); -- 10 USD expired

-- Create indexes for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at_desc ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_wallet ON public.wallet_transactions(user_id, wallet_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_balance ON public.user_wallets(balance) WHERE status = 'active';

-- Update table comments for documentation
COMMENT ON TABLE public.igtaxi_cards IS 'بطاقات شحن IGTaxi - تحتوي على أكواد الشحن ورموز QR (القيم بالريال السعودي)';
COMMENT ON TABLE public.user_wallets IS 'محافظ المستخدمين - تحتوي على أرصدة المستخدمين';
COMMENT ON TABLE public.wallet_transactions IS 'معاملات المحفظة - سجل جميع العمليات المالية';
COMMENT ON TABLE public.commission_rates IS 'معدلات العمولة - نسب العمولة حسب نوع الخدمة والمستخدم';
COMMENT ON TABLE public.subscription_plans IS 'خطط الاشتراك - خطط الاشتراك الشهرية المتاحة';
COMMENT ON TABLE public.user_subscriptions IS 'اشتراكات المستخدمين - اشتراكات المستخدمين النشطة';

-- Grant necessary permissions
GRANT SELECT ON public.igtaxi_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_wallets TO authenticated;
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT SELECT ON public.commission_rates TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
