-- ===================================================================
-- Simple Sample Data for IGTaxi Recharge System Testing (No Conflicts)
-- ===================================================================

-- Clear existing sample data first (optional)
-- DELETE FROM public.wallet_transactions WHERE description LIKE '%تجريبي%' OR description LIKE '%شحن رصيد باستخدام بطاقة شحن%';
-- DELETE FROM public.user_wallets WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%test%@igtaxi.com');
-- DELETE FROM auth.users WHERE email LIKE '%test%@igtaxi.com';

-- Insert sample recharge cards with USD values converted to SAR (1 USD = 3.75 SAR)
INSERT INTO public.igtaxi_cards (serial_number, redeem_code, value, type, qr_url) 
SELECT * FROM (VALUES
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
('IGT-015-2025', 'IGTAXI25USD15', 93.75, 'general', 'https://qr.igtaxi.com/cards/IGTAXI25USD15')   -- 25 USD
) AS new_cards(serial_number, redeem_code, value, type, qr_url)
WHERE NOT EXISTS (
    SELECT 1 FROM public.igtaxi_cards ic 
    WHERE ic.redeem_code = new_cards.redeem_code
);

-- Add some expired cards for testing
INSERT INTO public.igtaxi_cards (serial_number, redeem_code, value, type, status, expires_at) 
SELECT * FROM (VALUES
('IGT-EXP-001', 'IGTAXIEXP5USD', 18.75, 'general', 'expired', timezone('utc', now()) - interval '30 days'),  -- 5 USD expired
('IGT-EXP-002', 'IGTAXIEXP10USD', 37.50, 'driver', 'expired', timezone('utc', now()) - interval '15 days')   -- 10 USD expired
) AS expired_cards(serial_number, redeem_code, value, type, status, expires_at)
WHERE NOT EXISTS (
    SELECT 1 FROM public.igtaxi_cards ic 
    WHERE ic.redeem_code = expired_cards.redeem_code
);

-- Create test users only if no users exist
DO $$
DECLARE
    test_driver_id UUID := gen_random_uuid();
    test_company_id UUID := gen_random_uuid();
    test_wallet_id UUID;
BEGIN
    -- Check if we're in a development environment (no existing users)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email NOT LIKE '%test%' LIMIT 1) THEN
        
        -- Create test driver user
        INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
        VALUES (
            test_driver_id,
            'test_driver@igtaxi.com',
            timezone('utc', now()),
            timezone('utc', now()),
            timezone('utc', now())
        );
        
        -- Create wallet for test driver (this might be created by trigger)
        INSERT INTO public.user_wallets (user_id, balance, total_recharged, total_spent)
        VALUES (test_driver_id, 150.00, 200.00, 50.00)
        ON CONFLICT (user_id) DO UPDATE SET
            balance = 150.00,
            total_recharged = 200.00,
            total_spent = 50.00
        RETURNING id INTO test_wallet_id;
        
        -- Add sample transactions for test driver
        INSERT INTO public.wallet_transactions (
            user_id, wallet_id, type, amount, description, balance_before, balance_after, status
        ) VALUES
        (test_driver_id, test_wallet_id, 'recharge', 100.00, 'شحن رصيد تجريبي', 0.00, 100.00, 'completed'),
        (test_driver_id, test_wallet_id, 'commission', -15.00, 'عمولة تجريبية', 100.00, 85.00, 'completed'),
        (test_driver_id, test_wallet_id, 'recharge', 100.00, 'شحن رصيد تجريبي ثاني', 85.00, 185.00, 'completed'),
        (test_driver_id, test_wallet_id, 'subscription', -35.00, 'اشتراك تجريبي', 185.00, 150.00, 'completed');
        
        -- Create test company user
        INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
        VALUES (
            test_company_id,
            'test_company@igtaxi.com',
            timezone('utc', now()),
            timezone('utc', now()),
            timezone('utc', now())
        );
        
        -- Create wallet for test company
        INSERT INTO public.user_wallets (user_id, balance, total_recharged, total_spent)
        VALUES (test_company_id, 750.00, 1000.00, 250.00)
        ON CONFLICT (user_id) DO UPDATE SET
            balance = 750.00,
            total_recharged = 1000.00,
            total_spent = 250.00;
            
        -- Mark some cards as used by test users
        UPDATE public.igtaxi_cards 
        SET 
            status = 'used',
            used_at = timezone('utc', now()) - interval '1 day',
            used_by = test_driver_id
        WHERE redeem_code IN ('IGTAXI5USD001', 'IGTAXI10USD02')
        AND status = 'unused';
        
        RAISE NOTICE 'تم إنشاء بيانات تجريبية بنجاح';
        RAISE NOTICE 'حساب سائق تجريبي: test_driver@igtaxi.com';
        RAISE NOTICE 'حساب شركة تجريبية: test_company@igtaxi.com';
        
    ELSE
        RAISE NOTICE 'يوجد مستخدمون في النظام - تم تخطي إنشاء البيانات التجريبية';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'خطأ في إنشاء البيانات التجريبية: %', SQLERRM;
END $$;

-- Create indexes for better performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at_desc ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_wallet ON public.wallet_transactions(user_id, wallet_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_balance ON public.user_wallets(balance) WHERE status = 'active';

-- Add table comments for documentation
COMMENT ON TABLE public.igtaxi_cards IS 'بطاقات شحن IGTaxi - تحتوي على أكواد الشحن ورموز QR (القيم بالريال السعودي)';
COMMENT ON TABLE public.user_wallets IS 'محافظ المستخدمين - تحتوي على أرصدة المستخدمين';
COMMENT ON TABLE public.wallet_transactions IS 'معاملات المحفظة - سجل جميع العمليات المالية';
COMMENT ON TABLE public.commission_rates IS 'معدلات العمولة - نسب العمولة حسب نوع الخدمة والمستخدم';
COMMENT ON TABLE public.subscription_plans IS 'خطط الاشتراك - خطط الاشتراك الشهرية المتاحة';
COMMENT ON TABLE public.user_subscriptions IS 'اشتراكات المستخدمين - اشتراكات المستخدمين النشطة';

-- Grant necessary permissions (safe to run multiple times)
GRANT SELECT ON public.igtaxi_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_wallets TO authenticated;
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT SELECT ON public.commission_rates TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'تم تحميل البيانات التجريبية بنجاح!';
    RAISE NOTICE 'أكواد البطاقات المتاحة للاختبار:';
    RAISE NOTICE 'IGTAXI15USD03 - قيمة 56.25 ريال (15 دولار)';
    RAISE NOTICE 'IGTAXI20USD04 - قيمة 75.00 ريال (20 دولار)';
    RAISE NOTICE 'IGTAXI25USD05 - قيمة 93.75 ريال (25 دولار)';
    RAISE NOTICE '============================================';
END $$;
