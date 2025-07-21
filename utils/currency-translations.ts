// ترجمات العملات والدول للعربية والإنجليزية
export const CURRENCY_TRANSLATIONS = {
  en: {
    currencies: {
      'SAR': 'Saudi Riyal',
      'AED': 'UAE Dirham',
      'KWD': 'Kuwaiti Dinar',
      'QAR': 'Qatari Riyal',
      'BHD': 'Bahraini Dinar',
      'OMR': 'Omani Rial',
      'JOD': 'Jordanian Dinar',
      'SYP': 'Syrian Pound',
      'LBP': 'Lebanese Pound',
      'ILS': 'Israeli Shekel',
      'EGP': 'Egyptian Pound',
      'LYD': 'Libyan Dinar',
      'TND': 'Tunisian Dinar',
      'DZD': 'Algerian Dinar',
      'MAD': 'Moroccan Dirham',
      'SDG': 'Sudanese Pound',
      'IQD': 'Iraqi Dinar',
      'TRY': 'Turkish Lira',
      'IRR': 'Iranian Rial',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'USD': 'US Dollar',
      'CAD': 'Canadian Dollar'
    },
    countries: {
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'KW': 'Kuwait',
      'QA': 'Qatar',
      'BH': 'Bahrain',
      'OM': 'Oman',
      'JO': 'Jordan',
      'SY': 'Syria',
      'LB': 'Lebanon',
      'PS': 'Palestine',
      'EG': 'Egypt',
      'LY': 'Libya',
      'TN': 'Tunisia',
      'DZ': 'Algeria',
      'MA': 'Morocco',
      'SD': 'Sudan',
      'IQ': 'Iraq',
      'TR': 'Turkey',
      'IR': 'Iran',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'GB': 'United Kingdom',
      'US': 'United States',
      'CA': 'Canada'
    }
  },
  ar: {
    currencies: {
      'SAR': 'ريال سعودي',
      'AED': 'درهم إماراتي',
      'KWD': 'دينار كويتي',
      'QAR': 'ريال قطري',
      'BHD': 'دينار بحريني',
      'OMR': 'ريال عماني',
      'JOD': 'دينار أردني',
      'SYP': 'ليرة سورية',
      'LBP': 'ليرة لبنانية',
      'ILS': 'شيكل',
      'EGP': 'جنيه مصري',
      'LYD': 'دينار ليبي',
      'TND': 'دينار تونسي',
      'DZD': 'دينار جزائري',
      'MAD': 'درهم مغربي',
      'SDG': 'جنيه سوداني',
      'IQD': 'دينار عراقي',
      'TRY': 'ليرة تركية',
      'IRR': 'ريال إيراني',
      'EUR': 'يورو',
      'GBP': 'جنيه إسترليني',
      'USD': 'دولار أمريكي',
      'CAD': 'دولار كندي'
    },
    countries: {
      'SA': 'المملكة العربية السعودية',
      'AE': 'دولة الإمارات العربية المتحدة',
      'KW': 'دولة الكويت',
      'QA': 'دولة قطر',
      'BH': 'مملكة البحرين',
      'OM': 'سلطنة عمان',
      'JO': 'المملكة الأردنية الهاشمية',
      'SY': 'الجمهورية العربية السورية',
      'LB': 'الجمهورية اللبنانية',
      'PS': 'فلسطين',
      'EG': 'جمهورية مصر العربية',
      'LY': 'دولة ليبيا',
      'TN': 'الجمهورية التونسية',
      'DZ': 'الجمهورية الجزائرية',
      'MA': 'المملكة المغربية',
      'SD': 'جمهورية السودان',
      'IQ': 'جمهورية العراق',
      'TR': 'الجمهورية التركية',
      'IR': 'جمهورية إيران الإسلامية',
      'FR': 'الجمهورية الفرنسية',
      'DE': 'جمهورية ألمانيا الاتحادية',
      'IT': 'الجمهورية الإيطالية',
      'ES': 'مملكة إسبانيا',
      'GB': 'المملكة المتحدة',
      'US': 'الولايات المتحدة الأمريكية',
      'CA': 'كندا'
    }
  }
};

/**
 * الحصول على اسم العملة بلغة محددة
 */
export function getCurrencyName(currencyCode: string, language: 'ar' | 'en' = 'ar'): string {
  const currencies = CURRENCY_TRANSLATIONS[language].currencies as Record<string, string>;
  return currencies[currencyCode] || currencyCode;
}

/**
 * الحصول على اسم الدولة بلغة محددة
 */
export function getCountryName(countryCode: string, language: 'ar' | 'en' = 'ar'): string {
  const countries = CURRENCY_TRANSLATIONS[language].countries as Record<string, string>;
  return countries[countryCode] || countryCode;
}
