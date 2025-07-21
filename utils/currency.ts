// نظام العملات حسب الدولة
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  nameAr: string;
}

// قاعدة بيانات العملات حسب الدولة
export const COUNTRY_CURRENCIES: Record<string, Currency> = {
  // دول الخليج العربي
  'SA': { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', nameAr: 'ريال سعودي' },
  'AE': { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي' },
  'KW': { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي' },
  'QA': { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', nameAr: 'ريال قطري' },
  'BH': { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', nameAr: 'دينار بحريني' },
  'OM': { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial', nameAr: 'ريال عماني' },
  
  // بلاد الشام
  'JO': { code: 'JOD', symbol: 'د.أ', name: 'Jordanian Dinar', nameAr: 'دينار أردني' },
  'SY': { code: 'SYP', symbol: 'ل.س', name: 'Syrian Pound', nameAr: 'ليرة سورية' },
  'LB': { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية' },
  'PS': { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', nameAr: 'شيكل' },
  
  // شمال أفريقيا
  'EG': { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري' },
  'LY': { code: 'LYD', symbol: 'د.ل', name: 'Libyan Dinar', nameAr: 'دينار ليبي' },
  'TN': { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar', nameAr: 'دينار تونسي' },
  'DZ': { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar', nameAr: 'دينار جزائري' },
  'MA': { code: 'MAD', symbol: 'د.م', name: 'Moroccan Dirham', nameAr: 'درهم مغربي' },
  'SD': { code: 'SDG', symbol: 'ج.س', name: 'Sudanese Pound', nameAr: 'جنيه سوداني' },
  
  // دول أخرى في المنطقة
  'IQ': { code: 'IQD', symbol: 'د.ع', name: 'Iraqi Dinar', nameAr: 'دينار عراقي' },
  'TR': { code: 'TRY', symbol: '₺', name: 'Turkish Lira', nameAr: 'ليرة تركية' },
  'IR': { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', nameAr: 'ريال إيراني' },
  
  // دول أوروبية
  'FR': { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'يورو' },
  'DE': { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'يورو' },
  'IT': { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'يورو' },
  'ES': { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'يورو' },
  'GB': { code: 'GBP', symbol: '£', name: 'British Pound', nameAr: 'جنيه إسترليني' },
  
  // أمريكا الشمالية
  'US': { code: 'USD', symbol: '$', name: 'US Dollar', nameAr: 'دولار أمريكي' },
  'CA': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', nameAr: 'دولار كندي' },
};

// العملة الافتراضية (دينار أردني)
export const DEFAULT_CURRENCY: Currency = {
  code: 'JOD',
  symbol: 'د.أ',
  name: 'Jordanian Dinar',
  nameAr: 'دينار أردني'
};

/**
 * الحصول على العملة حسب كود الدولة
 */
export function getCurrencyByCountry(countryCode: string | null): Currency {
  if (!countryCode) {
    return DEFAULT_CURRENCY;
  }
  
  return COUNTRY_CURRENCIES[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}

/**
 * الحصول على العملة حسب الإحداثيات الجغرافية
 */
export async function getCurrencyByLocation(latitude: number, longitude: number): Promise<Currency> {
  try {
    // استخدام خدمة geocoding للحصول على معلومات الدولة
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }
    
    const data = await response.json();
    const countryCode = data.countryCode;
    
    return getCurrencyByCountry(countryCode);
  } catch (error) {
    console.error('Error getting currency by location:', error);
    return DEFAULT_CURRENCY;
  }
}

/**
 * تنسيق المبلغ مع العملة
 */
export function formatCurrency(amount: number, currency: Currency): string {
  return `${amount} ${currency.symbol}`;
}

/**
 * تنسيق نطاق الأسعار
 */
export function formatPriceRange(min: number, max: number, currency: Currency): string {
  return `${min} - ${max} ${currency.symbol}`;
}

/**
 * الحصول على قائمة بجميع العملات المتاحة
 */
export function getAllCurrencies(): Currency[] {
  const uniqueCurrencies = new Map<string, Currency>();
  
  Object.values(COUNTRY_CURRENCIES).forEach(currency => {
    uniqueCurrencies.set(currency.code, currency);
  });
  
  return Array.from(uniqueCurrencies.values()).sort((a, b) => 
    a.nameAr.localeCompare(b.nameAr, 'ar')
  );
}
