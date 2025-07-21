// ===================================================================
// Recharge System Service - خدمات نظام الشحن
// ===================================================================

import { supabase } from './supabase';
import { CurrencyService } from './currency-service';

export interface RechargeCard {
  id: string;
  serial_number: string;
  redeem_code: string;
  qr_url?: string;
  value: number;
  status: 'unused' | 'used' | 'expired';
  type: 'driver' | 'company' | 'general';
  created_at: string;
  used_at?: string;
  used_by?: string;
  expires_at?: string;
  notes?: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  total_recharged: number;
  total_spent: number;
  status: 'active' | 'suspended' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: 'recharge' | 'deduction' | 'refund' | 'commission' | 'subscription';
  amount: number;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  metadata?: any;
}

export interface CommissionRate {
  id: string;
  user_type: 'driver' | 'company' | 'delivery';
  service_type: string;
  rate_percentage: number;
  fixed_amount: number;
  min_amount: number;
  max_amount?: number;
  is_active: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  user_type: 'driver' | 'company' | 'establishment';
  amount: number;
  duration_days: number;
  features: any;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  starts_at: string;
  expires_at: string;
  auto_renew: boolean;
  payment_method: string;
  plan?: SubscriptionPlan;
}

export class RechargeService {
  
  // ===================================================================
  // Card Management - إدارة البطاقات
  // ===================================================================

  /**
   * التحقق من صحة رمز البطاقة
   */
  static async validateCard(redeemCode: string): Promise<{
    success: boolean;
    card?: RechargeCard;
    error?: string;
  }> {
    try {
      const { data: card, error } = await supabase
        .from('igtaxi_cards')
        .select('*')
        .eq('redeem_code', redeemCode.toUpperCase())
        .single();

      if (error) {
        return {
          success: false,
          error: 'رمز البطاقة غير صحيح'
        };
      }

      if (!card) {
        return {
          success: false,
          error: 'البطاقة غير موجودة'
        };
      }

      if (card.status === 'used') {
        return {
          success: false,
          error: 'البطاقة مستخدمة مسبقاً'
        };
      }

      if (card.status === 'expired') {
        return {
          success: false,
          error: 'البطاقة منتهية الصلاحية'
        };
      }

      if (card.expires_at && new Date(card.expires_at) < new Date()) {
        return {
          success: false,
          error: 'البطاقة منتهية الصلاحية'
        };
      }

      return {
        success: true,
        card
      };
    } catch (error) {
      console.error('Error validating card:', error);
      return {
        success: false,
        error: 'حدث خطأ في التحقق من البطاقة'
      };
    }
  }

  /**
   * استخدام البطاقة وشحن الرصيد
   */
  static async redeemCard(redeemCode: string, userId: string): Promise<{
    success: boolean;
    transaction?: WalletTransaction;
    wallet?: UserWallet;
    error?: string;
  }> {
    try {
      // التحقق من البطاقة أولاً
      const validation = await this.validateCard(redeemCode);
      if (!validation.success || !validation.card) {
        return validation;
      }

      const card = validation.card;

      // الحصول على محفظة المستخدم
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return {
          success: false,
          error: 'لم يتم العثور على محفظة المستخدم'
        };
      }

      // بدء المعاملة
      const { data: transaction, error: transactionError } = await supabase.rpc(
        'redeem_card_transaction',
        {
          p_user_id: userId,
          p_card_id: card.id,
          p_redeem_code: redeemCode.toUpperCase(),
          p_amount: card.value
        }
      );

      if (transactionError) {
        console.error('Error redeeming card:', transactionError);
        return {
          success: false,
          error: transactionError.message || 'حدث خطأ في شحن البطاقة'
        };
      }

      // الحصول على المحفظة المحدثة
      const updatedWallet = await this.getUserWallet(userId);

      return {
        success: true,
        transaction,
        wallet: updatedWallet || undefined
      };
    } catch (error) {
      console.error('Error redeeming card:', error);
      return {
        success: false,
        error: 'حدث خطأ في شحن البطاقة'
      };
    }
  }

  // ===================================================================
  // Wallet Management - إدارة المحفظة
  // ===================================================================

  /**
   * الحصول على محفظة المستخدم
   */
  static async getUserWallet(userId: string): Promise<UserWallet | null> {
    try {
      const { data: wallet, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error getting user wallet:', error);
        return null;
      }

      return wallet;
    } catch (error) {
      console.error('Error getting user wallet:', error);
      return null;
    }
  }

  /**
   * إنشاء محفظة جديدة للمستخدم
   */
  static async createUserWallet(userId: string): Promise<UserWallet | null> {
    try {
      const { data: wallet, error } = await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          balance: 0,
          total_recharged: 0,
          total_spent: 0,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user wallet:', error);
        return null;
      }

      return wallet;
    } catch (error) {
      console.error('Error creating user wallet:', error);
      return null;
    }
  }

  /**
   * خصم مبلغ من المحفظة
   */
  static async deductFromWallet(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{
    success: boolean;
    transaction?: WalletTransaction;
    error?: string;
  }> {
    try {
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return {
          success: false,
          error: 'لم يتم العثور على محفظة المستخدم'
        };
      }

      if (wallet.balance < amount) {
        return {
          success: false,
          error: 'رصيد المحفظة غير كافي'
        };
      }

      const { data: transaction, error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          wallet_id: wallet.id,
          type: 'deduction',
          amount: -amount,
          description,
          reference_id: referenceId,
          reference_type: referenceType,
          balance_before: wallet.balance,
          balance_after: wallet.balance - amount,
          status: 'completed'
        })
        .select()
        .single();

      if (error) {
        console.error('Error deducting from wallet:', error);
        return {
          success: false,
          error: 'حدث خطأ في خصم المبلغ'
        };
      }

      return {
        success: true,
        transaction
      };
    } catch (error) {
      console.error('Error deducting from wallet:', error);
      return {
        success: false,
        error: 'حدث خطأ في خصم المبلغ'
      };
    }
  }

  /**
   * الحصول على معاملات المحفظة
   */
  static async getWalletTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    try {
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting wallet transactions:', error);
        return [];
      }

      return transactions || [];
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      return [];
    }
  }

  // ===================================================================
  // Commission & Subscription Management
  // ===================================================================

  /**
   * الحصول على معدل العمولة
   */
  static async getCommissionRate(
    userType: string,
    serviceType: string
  ): Promise<CommissionRate | null> {
    try {
      const { data: rate, error } = await supabase
        .from('commission_rates')
        .select('*')
        .eq('user_type', userType)
        .eq('service_type', serviceType)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error getting commission rate:', error);
        return null;
      }

      return rate;
    } catch (error) {
      console.error('Error getting commission rate:', error);
      return null;
    }
  }

  /**
   * حساب العمولة
   */
  static async calculateCommission(
    userType: string,
    serviceType: string,
    amount: number
  ): Promise<number> {
    try {
      const rate = await this.getCommissionRate(userType, serviceType);
      if (!rate) return 0;

      let commission = (amount * rate.rate_percentage) / 100;
      commission += rate.fixed_amount;

      if (rate.min_amount && commission < rate.min_amount) {
        commission = rate.min_amount;
      }

      if (rate.max_amount && commission > rate.max_amount) {
        commission = rate.max_amount;
      }

      return commission;
    } catch (error) {
      console.error('Error calculating commission:', error);
      return 0;
    }
  }

  /**
   * الحصول على خطط الاشتراك
   */
  static async getSubscriptionPlans(
    userType?: string
  ): Promise<SubscriptionPlan[]> {
    try {
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      if (userType) {
        query = query.eq('user_type', userType);
      }

      const { data: plans, error } = await query.order('amount');

      if (error) {
        console.error('Error getting subscription plans:', error);
        return [];
      }

      return plans || [];
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      return [];
    }
  }

  /**
   * الحصول على اشتراك المستخدم النشط
   */
  static async getUserActiveSubscription(
    userId: string
  ): Promise<UserSubscription | null> {
    try {
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error) {
        console.error('Error getting user active subscription:', error);
        return null;
      }

      return subscription;
    } catch (error) {
      console.error('Error getting user active subscription:', error);
      return null;
    }
  }

  /**
   * التحقق من حالة الخدمة للمستخدم
   */
  static async checkServiceAccess(userId: string): Promise<{
    hasAccess: boolean;
    reason?: string;
    balance?: number;
    subscription?: UserSubscription;
  }> {
    try {
      const wallet = await this.getUserWallet(userId);
      const subscription = await this.getUserActiveSubscription(userId);

      // التحقق من حالة المحفظة
      if (!wallet || wallet.status !== 'active') {
        return {
          hasAccess: false,
          reason: 'محفظة المستخدم غير نشطة',
          balance: wallet?.balance || 0
        };
      }

      // التحقق من الرصيد (مطلوب رصيد أكثر من 0)
      if (wallet.balance <= 0) {
        return {
          hasAccess: false,
          reason: 'رصيد المحفظة غير كافي',
          balance: wallet.balance
        };
      }

      return {
        hasAccess: true,
        balance: wallet.balance,
        subscription: subscription || undefined
      };
    } catch (error) {
      console.error('Error checking service access:', error);
      return {
        hasAccess: false,
        reason: 'حدث خطأ في التحقق من الصلاحيات'
      };
    }
  }
  /**
   * الحصول على قيم البطاقات المتاحة
   */
  static getAvailableCardValues(): Array<{
    usd: number;
    local: number;
    formatted: string;
    code: string;
  }> {
    const values = CurrencyService.getCardValues();
    const currency = CurrencyService.getUserCurrency();
    
    return values.map(value => ({
      ...value,
      code: currency
    }));
  }

  /**
   * تنسيق عملة للعرض
   */
  static formatCurrency(amount: number, useArabicNumbers = false): string {
    if (useArabicNumbers) {
      return CurrencyService.formatCurrencyArabic(amount);
    }
    return CurrencyService.formatCurrency(amount);
  }

  /**
   * الحصول على رمز العملة
   */
  static getCurrencySymbol(): string {
    return CurrencyService.getCurrencySymbol();
  }

  /**
   * تحويل قيمة البطاقة للعملة المحلية (إذا كانت مخزنة بالدولار)
   */
  static convertCardValue(cardValue: number, isStoredInUSD = false): number {
    if (isStoredInUSD) {
      return CurrencyService.convertFromUSD(cardValue);
    }
    return cardValue;
  }

  /**
   * تهيئة نظام العملات
   */
  static initializeCurrency(): void {
    CurrencyService.initialize();
  }
}

export default RechargeService;
