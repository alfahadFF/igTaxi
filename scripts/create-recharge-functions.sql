-- ===================================================================
-- Recharge Card Transaction Function
-- ===================================================================

CREATE OR REPLACE FUNCTION redeem_card_transaction(
    p_user_id UUID,
    p_card_id UUID,
    p_redeem_code TEXT,
    p_amount NUMERIC
)
RETURNS TABLE(
    transaction_id UUID,
    wallet_id UUID,
    new_balance NUMERIC,
    card_status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC := 0;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
    v_card_status TEXT;
BEGIN
    -- التحقق من صحة البطاقة مرة أخرى
    SELECT status INTO v_card_status
    FROM public.igtaxi_cards
    WHERE id = p_card_id 
      AND redeem_code = p_redeem_code 
      AND status = 'unused';
    
    IF v_card_status IS NULL THEN
        RAISE EXCEPTION 'البطاقة غير صالحة أو مستخدمة مسبقاً';
    END IF;
    
    -- الحصول على محفظة المستخدم أو إنشاؤها
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.user_wallets
    WHERE user_id = p_user_id;
    
    IF v_wallet_id IS NULL THEN
        -- إنشاء محفظة جديدة
        INSERT INTO public.user_wallets (user_id, balance)
        VALUES (p_user_id, 0)
        RETURNING id, balance INTO v_wallet_id, v_current_balance;
    END IF;
    
    -- حساب الرصيد الجديد
    v_new_balance := v_current_balance + p_amount;
    
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
        status
    ) VALUES (
        p_user_id,
        v_wallet_id,
        'recharge',
        p_amount,
        'شحن رصيد باستخدام بطاقة شحن',
        p_card_id,
        'card',
        v_current_balance,
        v_new_balance,
        'completed'
    ) RETURNING id INTO v_transaction_id;
    
    -- تحديث رصيد المحفظة
    UPDATE public.user_wallets
    SET 
        balance = v_new_balance,
        total_recharged = total_recharged + p_amount,
        updated_at = timezone('utc', now())
    WHERE id = v_wallet_id;
    
    -- إرجاع النتيجة
    RETURN QUERY SELECT 
        v_transaction_id as transaction_id,
        v_wallet_id as wallet_id,
        v_new_balance as new_balance,
        'used'::TEXT as card_status;
        
END;
$$;

-- ===================================================================
-- Function to check user service access
-- ===================================================================

CREATE OR REPLACE FUNCTION check_user_service_access(p_user_id UUID)
RETURNS TABLE(
    has_access BOOLEAN,
    reason TEXT,
    current_balance NUMERIC,
    wallet_status TEXT,
    subscription_status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_balance NUMERIC := 0;
    v_wallet_status TEXT := 'inactive';
    v_subscription_status TEXT := 'none';
    v_has_access BOOLEAN := false;
    v_reason TEXT := '';
BEGIN
    -- التحقق من المحفظة
    SELECT balance, status INTO v_wallet_balance, v_wallet_status
    FROM public.user_wallets
    WHERE user_id = p_user_id;
    
    -- التحقق من الاشتراك النشط
    SELECT status INTO v_subscription_status
    FROM public.user_subscriptions
    WHERE user_id = p_user_id 
      AND status = 'active'
      AND expires_at > timezone('utc', now())
    LIMIT 1;
    
    -- تحديد حالة الوصول
    IF v_wallet_status IS NULL OR v_wallet_status != 'active' THEN
        v_reason := 'محفظة المستخدم غير نشطة';
        v_has_access := false;
    ELSIF v_wallet_balance <= 0 THEN
        v_reason := 'رصيد المحفظة غير كافي';
        v_has_access := false;
    ELSE
        v_has_access := true;
        v_reason := 'يمكن الوصول للخدمة';
    END IF;
    
    -- إرجاع النتيجة
    RETURN QUERY SELECT 
        v_has_access as has_access,
        v_reason as reason,
        COALESCE(v_wallet_balance, 0) as current_balance,
        COALESCE(v_wallet_status, 'inactive') as wallet_status,
        COALESCE(v_subscription_status, 'none') as subscription_status;
        
END;
$$;

-- ===================================================================
-- Function to deduct commission from wallet
-- ===================================================================

CREATE OR REPLACE FUNCTION deduct_commission(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    transaction_id UUID,
    new_balance NUMERIC,
    error_message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC := 0;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- الحصول على محفظة المستخدم
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.user_wallets
    WHERE user_id = p_user_id AND status = 'active';
    
    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::UUID as transaction_id,
            0::NUMERIC as new_balance,
            'محفظة المستخدم غير موجودة أو غير نشطة' as error_message;
        RETURN;
    END IF;
    
    -- التحقق من كفاية الرصيد
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::UUID as transaction_id,
            v_current_balance as new_balance,
            'رصيد المحفظة غير كافي' as error_message;
        RETURN;
    END IF;
    
    -- حساب الرصيد الجديد
    v_new_balance := v_current_balance - p_amount;
    
    -- إضافة معاملة الخصم
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
        status
    ) VALUES (
        p_user_id,
        v_wallet_id,
        'commission',
        -p_amount,
        p_description,
        p_reference_id,
        p_reference_type,
        v_current_balance,
        v_new_balance,
        'completed'
    ) RETURNING id INTO v_transaction_id;
    
    -- تحديث رصيد المحفظة
    UPDATE public.user_wallets
    SET 
        balance = v_new_balance,
        total_spent = total_spent + p_amount,
        updated_at = timezone('utc', now())
    WHERE id = v_wallet_id;
    
    -- إرجاع النتيجة
    RETURN QUERY SELECT 
        true as success,
        v_transaction_id as transaction_id,
        v_new_balance as new_balance,
        NULL::TEXT as error_message;
        
END;
$$;

-- ===================================================================
-- Grant permissions for functions
-- ===================================================================

GRANT EXECUTE ON FUNCTION redeem_card_transaction(UUID, UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_service_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_commission(UUID, NUMERIC, TEXT, UUID, TEXT) TO authenticated;
