-- ===================================================================
-- IGTaxi Recharge System Tables
-- ===================================================================

-- Cards table (البطاقات)
CREATE TABLE IF NOT EXISTS public.igtaxi_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    redeem_code TEXT UNIQUE NOT NULL,
    qr_url TEXT,
    value NUMERIC NOT NULL CHECK (value > 0),
    status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'expired')),
    type TEXT DEFAULT 'driver' CHECK (type IN ('driver', 'company', 'general')),
    created_at TIMESTAMP DEFAULT timezone('utc', now()),
    used_at TIMESTAMP,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP
);

-- User wallet table (محفظة المستخدم)
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0 CHECK (balance >= 0),
    total_recharged NUMERIC DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
    created_at TIMESTAMP DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP DEFAULT timezone('utc', now()),
    UNIQUE(user_id)
);

-- Wallet transactions table (معاملات المحفظة)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('recharge', 'deduction', 'refund', 'commission', 'subscription')),
    amount NUMERIC NOT NULL,
    description TEXT,
    reference_id UUID, -- يمكن أن يكون معرف البطاقة أو الطلب
    reference_type TEXT, -- نوع المرجع (card, trip, subscription, etc.)
    balance_before NUMERIC,
    balance_after NUMERIC,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT timezone('utc', now()),
    metadata JSONB
);

-- Commission rates table (معدلات العمولة)
CREATE TABLE IF NOT EXISTS public.commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type TEXT NOT NULL CHECK (user_type IN ('driver', 'company', 'delivery')),
    service_type TEXT NOT NULL, -- taxi, delivery, water, gas, etc.
    rate_percentage NUMERIC NOT NULL CHECK (rate_percentage >= 0 AND rate_percentage <= 100),
    fixed_amount NUMERIC DEFAULT 0,
    min_amount NUMERIC DEFAULT 0,
    max_amount NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP DEFAULT timezone('utc', now()),
    UNIQUE(user_type, service_type)
);

-- Subscription plans table (خطط الاشتراك)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('driver', 'company', 'establishment')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    duration_days INTEGER NOT NULL DEFAULT 30,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP DEFAULT timezone('utc', now())
);

-- User subscriptions table (اشتراكات المستخدمين)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    starts_at TIMESTAMP DEFAULT timezone('utc', now()),
    expires_at TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    payment_method TEXT DEFAULT 'wallet',
    created_at TIMESTAMP DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP DEFAULT timezone('utc', now())
);

-- ===================================================================
-- Indexes for Performance
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_igtaxi_cards_redeem_code ON public.igtaxi_cards(redeem_code);
CREATE INDEX IF NOT EXISTS idx_igtaxi_cards_status ON public.igtaxi_cards(status);
CREATE INDEX IF NOT EXISTS idx_igtaxi_cards_used_by ON public.igtaxi_cards(used_by);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_status ON public.user_wallets(status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_commission_rates_user_type ON public.commission_rates(user_type);
CREATE INDEX IF NOT EXISTS idx_commission_rates_service_type ON public.commission_rates(service_type);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

-- ===================================================================
-- Functions and Triggers
-- ===================================================================

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_wallets 
    SET 
        balance = NEW.balance_after,
        updated_at = timezone('utc', now())
    WHERE id = NEW.wallet_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update wallet balance after transaction
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON public.wallet_transactions;
CREATE TRIGGER update_wallet_balance_trigger
    AFTER INSERT ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance();

-- Function to check user balance before transaction
CREATE OR REPLACE FUNCTION check_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'deduction' AND NEW.balance_after < 0 THEN
        RAISE EXCEPTION 'رصيد المحفظة غير كافي';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check balance before deduction
DROP TRIGGER IF EXISTS check_wallet_balance_trigger ON public.wallet_transactions;
CREATE TRIGGER check_wallet_balance_trigger
    BEFORE INSERT ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_wallet_balance();

-- Function to create wallet for new user
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_wallets (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create wallet when user is created
DROP TRIGGER IF EXISTS create_user_wallet_trigger ON auth.users;
CREATE TRIGGER create_user_wallet_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_wallet();

-- ===================================================================
-- RLS Policies
-- ===================================================================

-- Enable RLS
ALTER TABLE public.igtaxi_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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

-- Cards policies (البطاقات متاحة للجميع للتحقق، لكن الاستخدام محدود)
CREATE POLICY "Anyone can read unused cards" ON public.igtaxi_cards
    FOR SELECT USING (status = 'unused');

CREATE POLICY "Users can read their used cards" ON public.igtaxi_cards
    FOR SELECT USING (used_by = auth.uid());

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON public.user_wallets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own wallet" ON public.user_wallets
    FOR UPDATE USING (user_id = auth.uid());

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Commission rates are read-only for users
CREATE POLICY "Anyone can read commission rates" ON public.commission_rates
    FOR SELECT USING (is_active = true);

-- Subscription plans are read-only for users
CREATE POLICY "Anyone can read active subscription plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- User subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

-- ===================================================================
-- Initial Data
-- ===================================================================

-- Insert default commission rates
INSERT INTO public.commission_rates (user_type, service_type, rate_percentage) VALUES
('driver', 'taxi', 10.0),
('driver', 'delivery', 8.0),
('company', 'taxi', 15.0),
('company', 'delivery', 12.0),
('delivery', 'food', 8.0),
('delivery', 'pharmacy', 10.0),
('delivery', 'shopping', 12.0)
ON CONFLICT (user_type, service_type) DO NOTHING;

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, name_ar, user_type, amount, duration_days, features) VALUES
('Driver Basic', 'سائق أساسي', 'driver', 50.00, 30, '{"max_trips": 100, "support": "basic"}'),
('Driver Premium', 'سائق مميز', 'driver', 100.00, 30, '{"max_trips": -1, "support": "premium", "priority": true}'),
('Company Standard', 'شركة عادية', 'company', 200.00, 30, '{"max_drivers": 10, "support": "standard"}'),
('Company Enterprise', 'شركة متقدمة', 'company', 500.00, 30, '{"max_drivers": -1, "support": "premium", "analytics": true}'),
('Establishment Basic', 'منشأة أساسية', 'establishment', 75.00, 30, '{"max_orders": 200, "support": "basic"}')
ON CONFLICT DO NOTHING;
