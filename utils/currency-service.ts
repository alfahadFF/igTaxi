// ===================================================================
// Currency Service - خدمة العملات
// ===================================================================

export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number; // Rate relative to USD
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    rate: 3.75, // 1 USD = 3.75 SAR
    locale: 'ar-SA',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    rate: 1.0, // Base currency
    locale: 'en-US',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    rate: 0.85, // 1 USD = 0.85 EUR (approximate)
    locale: 'de-DE',
    decimals: 2,
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    rate: 3.67, // 1 USD = 3.67 AED
    locale: 'ar-AE',
    decimals: 2,
  },
  KWD: {
    code: 'KWD',
    symbol: 'د.ك',
    rate: 0.30, // 1 USD = 0.30 KWD
    locale: 'ar-KW',
    decimals: 3,
  },
  QAR: {
    code: 'QAR',
    symbol: 'ر.ق',
    rate: 3.64, // 1 USD = 3.64 QAR
    locale: 'ar-QA',
    decimals: 2,
  },
};

export class CurrencyService {
  private static defaultCurrency: string = 'SAR';
  private static userCurrency: string = 'SAR';

  /**
   * Set user's preferred currency
   */
  static setUserCurrency(currencyCode: string) {
    if (SUPPORTED_CURRENCIES[currencyCode]) {
      this.userCurrency = currencyCode;
    }
  }

  /**
   * Get user's current currency
   */
  static getUserCurrency(): string {
    return this.userCurrency;
  }

  /**
   * Get currency configuration
   */
  static getCurrencyConfig(currencyCode?: string): CurrencyConfig {
    const code = currencyCode || this.userCurrency;
    return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES[this.defaultCurrency];
  }

  /**
   * Convert amount from USD to target currency
   */
  static convertFromUSD(usdAmount: number, targetCurrency?: string): number {
    const currency = this.getCurrencyConfig(targetCurrency);
    return Number((usdAmount * currency.rate).toFixed(currency.decimals));
  }

  /**
   * Convert amount from source currency to USD
   */
  static convertToUSD(amount: number, sourceCurrency?: string): number {
    const currency = this.getCurrencyConfig(sourceCurrency);
    return Number((amount / currency.rate).toFixed(2));
  }

  /**
   * Convert between two currencies
   */
  static convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number {
    const usdAmount = this.convertToUSD(amount, fromCurrency);
    return this.convertFromUSD(usdAmount, toCurrency);
  }

  /**
   * Format currency amount for display
   */
  static formatCurrency(
    amount: number,
    currencyCode?: string,
    options?: Partial<Intl.NumberFormatOptions>
  ): string {
    const currency = this.getCurrencyConfig(currencyCode);
    
    const formatOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
      ...options,
    };

    try {
      return new Intl.NumberFormat(currency.locale, formatOptions).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${amount.toFixed(currency.decimals)} ${currency.symbol}`;
    }
  }

  /**
   * Format currency amount with custom symbol (for Arabic)
   */
  static formatCurrencyArabic(amount: number, currencyCode?: string): string {
    const currency = this.getCurrencyConfig(currencyCode);
    const formattedAmount = amount.toFixed(currency.decimals);
    
    // Arabic number formatting
    const arabicNumbers = formattedAmount.replace(/\d/g, (digit) => {
      const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
      return arabicDigits[parseInt(digit)];
    });

    return `${arabicNumbers} ${currency.symbol}`;
  }

  /**
   * Get available card values in user's currency
   */
  static getCardValues(): Array<{ usd: number; local: number; formatted: string }> {
    const usdValues = [5, 10, 15, 20, 25]; // Base USD values
    
    return usdValues.map(usd => {
      const local = this.convertFromUSD(usd);
      const formatted = this.formatCurrency(local);
      
      return { usd, local, formatted };
    });
  }

  /**
   * Get currency symbol for display
   */
  static getCurrencySymbol(currencyCode?: string): string {
    const currency = this.getCurrencyConfig(currencyCode);
    return currency.symbol;
  }

  /**
   * Parse currency string to number
   */
  static parseCurrency(currencyString: string, currencyCode?: string): number {
    const currency = this.getCurrencyConfig(currencyCode);
    
    // Remove currency symbols and non-numeric characters except decimal point
    const cleaned = currencyString
      .replace(new RegExp(currency.symbol, 'g'), '')
      .replace(/[^\d.-]/g, '')
      .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Auto-detect user's currency based on locale
   */
  static detectUserCurrency(): string {
    if (typeof window === 'undefined') return this.defaultCurrency;
    
    try {
      const locale = navigator.language || 'en-US';
      
      // Map common locales to currencies
      const localeMap: Record<string, string> = {
        'ar-SA': 'SAR',
        'en-SA': 'SAR',
        'ar-AE': 'AED',
        'en-AE': 'AED',
        'ar-KW': 'KWD',
        'en-KW': 'KWD',
        'ar-QA': 'QAR',
        'en-QA': 'QAR',
        'en-US': 'USD',
        'de-DE': 'EUR',
      };

      return localeMap[locale] || localeMap[locale.split('-')[0]] || this.defaultCurrency;
    } catch (error) {
      return this.defaultCurrency;
    }
  }

  /**
   * Initialize currency service
   */
  static initialize(): void {
    const detectedCurrency = this.detectUserCurrency();
    this.setUserCurrency(detectedCurrency);
  }

  /**
   * Get localized currency name
   */
  static getCurrencyName(currencyCode?: string, locale: string = 'ar'): string {
    const currency = this.getCurrencyConfig(currencyCode);
    
    const names: Record<string, Record<string, string>> = {
      SAR: { ar: 'ريال سعودي', en: 'Saudi Riyal' },
      USD: { ar: 'دولار أمريكي', en: 'US Dollar' },
      EUR: { ar: 'يورو', en: 'Euro' },
      AED: { ar: 'درهم إماراتي', en: 'UAE Dirham' },
      KWD: { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' },
      QAR: { ar: 'ريال قطري', en: 'Qatari Riyal' },
    };

    return names[currency.code]?.[locale] || currency.code;
  }

  /**
   * Validate currency code
   */
  static isValidCurrency(currencyCode: string): boolean {
    return !!SUPPORTED_CURRENCIES[currencyCode];
  }

  /**
   * Get all supported currencies
   */
  static getSupportedCurrencies(): CurrencyConfig[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }
}

export default CurrencyService;
