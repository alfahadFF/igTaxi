-- ===================================================================
-- Update Recharge System to Support Multiple Currencies
-- ===================================================================

-- Add currency support to cards table
DO $$
BEGIN
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'igtaxi_cards' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.igtaxi_cards 
        ADD COLUMN currency TEXT DEFAULT 'SAR' CHECK (currency IN ('SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR'));
    END IF;

    -- Add original_value column for USD reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'igtaxi_cards' 
        AND column_name = 'original_value_usd'
    ) THEN
        ALTER TABLE public.igtaxi_cards 
        ADD COLUMN original_value_usd NUMERIC;
    END IF;
END $$;

-- Add currency support to wallets table
DO $$
BEGIN
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_wallets' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.user_wallets 
        ADD COLUMN currency TEXT DEFAULT 'SAR' CHECK (currency IN ('SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR'));
    END IF;
END $$;

-- Add currency support to transactions table
DO $$
BEGIN
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_transactions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.wallet_transactions 
        ADD COLUMN currency TEXT DEFAULT 'SAR' CHECK (currency IN ('SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR'));
    END IF;
END $$;

-- Create currency exchange rates table
CREATE TABLE IF NOT EXISTS public.currency_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code TEXT NOT NULL UNIQUE CHECK (currency_code IN ('SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR')),
    rate_to_usd NUMERIC NOT NULL CHECK (rate_to_usd > 0), -- Rate: 1 currency unit = X USD
    symbol TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    decimals INTEGER DEFAULT 2 CHECK (decimals >= 0 AND decimals <= 3),
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT timezone('utc', now())
);

-- Insert default currency rates
INSERT INTO public.currency_rates (currency_code, rate_to_usd, symbol, name_en, name_ar, decimals) VALUES
('USD', 1.0000, '$', 'US Dollar', 'دولار أمريكي', 2),
('SAR', 0.2667, 'ر.س', 'Saudi Riyal', 'ريال سعودي', 2),
('AED', 0.2723, 'د.إ', 'UAE Dirham', 'درهم إماراتي', 2),
('KWD', 3.3333, 'د.ك', 'Kuwaiti Dinar', 'دينار كويتي', 3),
('QAR', 0.2747, 'ر.ق', 'Qatari Riyal', 'ريال قطري', 2),
('EUR', 1.1765, '€', 'Euro', 'يورو', 2)
ON CONFLICT (currency_code) DO UPDATE SET
    rate_to_usd = EXCLUDED.rate_to_usd,
    symbol = EXCLUDED.symbol,
    name_en = EXCLUDED.name_en,
    name_ar = EXCLUDED.name_ar,
    decimals = EXCLUDED.decimals,
    updated_at = timezone('utc', now());

-- Update existing cards with USD reference values
UPDATE public.igtaxi_cards 
SET 
    original_value_usd = CASE 
        WHEN value = 18.75 THEN 5.0
        WHEN value = 37.50 THEN 10.0
        WHEN value = 56.25 THEN 15.0
        WHEN value = 75.00 THEN 20.0
        WHEN value = 93.75 THEN 25.0
        ELSE value / 3.75 -- Convert SAR to USD using rate
    END,
    currency = 'SAR'
WHERE original_value_usd IS NULL;

-- Create function to convert currency
CREATE OR REPLACE FUNCTION convert_currency(
    amount NUMERIC,
    from_currency TEXT,
    to_currency TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    from_rate NUMERIC;
    to_rate NUMERIC;
    usd_amount NUMERIC;
    result NUMERIC;
BEGIN
    -- Get exchange rates
    SELECT rate_to_usd INTO from_rate FROM public.currency_rates WHERE currency_code = from_currency AND is_active = true;
    SELECT rate_to_usd INTO to_rate FROM public.currency_rates WHERE currency_code = to_currency AND is_active = true;
    
    -- Check if rates exist
    IF from_rate IS NULL OR to_rate IS NULL THEN
        RAISE EXCEPTION 'Currency not found or inactive: % to %', from_currency, to_currency;
    END IF;
    
    -- Convert to USD first, then to target currency
    usd_amount := amount * from_rate;
    result := usd_amount / to_rate;
    
    RETURN ROUND(result, 3);
END;
$$;

-- Create function to get user's preferred currency
CREATE OR REPLACE FUNCTION get_user_currency(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    user_currency TEXT;
BEGIN
    -- Get user's wallet currency
    SELECT currency INTO user_currency 
    FROM public.user_wallets 
    WHERE user_id = p_user_id;
    
    -- Default to SAR if not found
    RETURN COALESCE(user_currency, 'SAR');
END;
$$;

-- Create updated function for redeeming cards with currency support
CREATE OR REPLACE FUNCTION redeem_card_transaction_with_currency(
    p_user_id UUID,
    p_card_id UUID,
    p_redeem_code TEXT,
    p_user_currency TEXT DEFAULT 'SAR'
)
RETURNS TABLE(
    transaction_id UUID,
    wallet_id UUID,
    new_balance NUMERIC,
    card_status TEXT,
    amount_in_user_currency NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC := 0;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
    v_card_status TEXT;
    v_card_value NUMERIC;
    v_card_currency TEXT;
    v_converted_amount NUMERIC;
BEGIN
    -- التحقق من صحة البطاقة
    SELECT status, value, currency INTO v_card_status, v_card_value, v_card_currency
    FROM public.igtaxi_cards
    WHERE id = p_card_id 
      AND redeem_code = p_redeem_code 
      AND status = 'unused';
    
    IF v_card_status IS NULL THEN
        RAISE EXCEPTION 'البطاقة غير صالحة أو مستخدمة مسبقاً';
    END IF;
    
    -- تحويل قيمة البطاقة لعملة المستخدم
    v_converted_amount := convert_currency(v_card_value, COALESCE(v_card_currency, 'SAR'), p_user_currency);
    
    -- الحصول على محفظة المستخدم
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.user_wallets
    WHERE user_id = p_user_id;
    
    IF v_wallet_id IS NULL THEN
        -- إنشاء محفظة جديدة
        INSERT INTO public.user_wallets (user_id, balance, currency)
        VALUES (p_user_id, 0, p_user_currency)
        RETURNING id, balance INTO v_wallet_id, v_current_balance;
    ELSE
        -- تحديث عملة المحفظة إذا لزم الأمر
        UPDATE public.user_wallets
        SET currency = p_user_currency
        WHERE id = v_wallet_id AND currency != p_user_currency;
    END IF;
    
    -- حساب الرصيد الجديد
    v_new_balance := v_current_balance + v_converted_amount;
    
    -- تحديث حالة البطاقة
    UPDATE public.igtaxi_cards
    SET 
        status = 'used',
        used_at = timezone('utc', now()),
        used_by = p_user_id
    WHERE id = p_card_id;
    
    -- إضافة معاملة الشحن
    INSERT INTO public.wallet_transactions (
        user_id,
        wallet_id,
        type,
        amount,
        description,
        reference_id,
        reference_type,
        balance_before,
        balance_after,
        status,
        currency
    ) VALUES (
        p_user_id,
        v_wallet_id,
        'recharge',
        v_converted_amount,
        'شحن رصيد باستخدام بطاقة شحن',
        p_card_id,
        'card',
        v_current_balance,
        v_new_balance,
        'completed',
        p_user_currency
    ) RETURNING id INTO v_transaction_id;
    
    -- تحديث رصيد المحفظة
    UPDATE public.user_wallets
    SET 
        balance = v_new_balance,
        total_recharged = total_recharged + v_converted_amount,
        updated_at = timezone('utc', now())
    WHERE id = v_wallet_id;
    
    -- إرجاع النتيجة
    RETURN QUERY SELECT 
        v_transaction_id as transaction_id,
        v_wallet_id as wallet_id,
        v_new_balance as new_balance,
        'used'::TEXT as card_status,
        v_converted_amount as amount_in_user_currency;
        
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_currency_rates_code ON public.currency_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_igtaxi_cards_currency ON public.igtaxi_cards(currency);
CREATE INDEX IF NOT EXISTS idx_user_wallets_currency ON public.user_wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_currency ON public.wallet_transactions(currency);

-- Enable RLS for currency rates
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- Create policy for currency rates (read-only for authenticated users)
CREATE POLICY "Anyone can read active currency rates" ON public.currency_rates
    FOR SELECT USING (is_active = true);

-- Grant permissions
GRANT SELECT ON public.currency_rates TO authenticated;
GRANT EXECUTE ON FUNCTION convert_currency(NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_currency(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_card_transaction_with_currency(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Update table comments
COMMENT ON TABLE public.currency_rates IS 'أسعار صرف العملات المدعومة في التطبيق';
COMMENT ON FUNCTION convert_currency IS 'دالة تحويل العملات باستخدام أسعار الصرف المحدثة';
COMMENT ON FUNCTION redeem_card_transaction_with_currency IS 'دالة شحن البطاقة مع دعم العملات المتعددة';
