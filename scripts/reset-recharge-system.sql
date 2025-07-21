-- ===================================================================
-- Reset IGTaxi Recharge System - إعادة تعيين نظام الشحن
-- ===================================================================
-- هذا السكريبت يحذف ويعيد إنشاء النظام بالكامل
-- تحذير: سيؤدي إلى فقدان البيانات الموجودة

-- ===================================================================
-- Drop Triggers
-- ===================================================================
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON public.wallet_transactions;
DROP TRIGGER IF EXISTS check_wallet_balance_trigger ON public.wallet_transactions;
DROP TRIGGER IF EXISTS create_user_wallet_trigger ON auth.users;

-- ===================================================================
-- Drop Functions
-- ===================================================================
DROP FUNCTION IF EXISTS update_wallet_balance();
DROP FUNCTION IF EXISTS check_wallet_balance();
DROP FUNCTION IF EXISTS create_user_wallet();

-- ===================================================================
-- Drop Policies
-- ===================================================================
DROP POLICY IF EXISTS "Anyone can read unused cards" ON public.igtaxi_cards;
DROP POLICY IF EXISTS "Users can read their used cards" ON public.igtaxi_cards;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Anyone can read commission rates" ON public.commission_rates;
DROP POLICY IF EXISTS "Anyone can read active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;

-- ===================================================================
-- Drop Tables
-- ===================================================================
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.commission_rates CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.user_wallets CASCADE;
DROP TABLE IF EXISTS public.igtaxi_cards CASCADE;

-- ===================================================================
-- Drop Indexes (will be dropped with tables but good to be explicit)
-- ===================================================================
-- Indexes will be automatically dropped with tables

COMMIT;

-- رسالة للمستخدم
DO $$
BEGIN
    RAISE NOTICE 'تم حذف نظام الشحن بالكامل. يمكنك الآن تشغيل create-recharge-system.sql لإعادة إنشائه';
END $$;
