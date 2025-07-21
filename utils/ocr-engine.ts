import * as Tesseract from 'tesseract.js';
import { supabase } from './supabase';

/**
 * محرك OCR الذكي مع دعم اللغة العربية والإنجليزية
 * مع تحسين خاص للوثائق الحكومية العربية
 */

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  blocks: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

export interface ExtractedData {
  // بيانات الهوية الوطنية
  nationalId?: {
    number: string;
    name: string;
    birthDate: string;
    issueDate?: string;
    expiryDate?: string;
    nationality?: string;
    confidence: number;
  };
  
  // بيانات رخصة القيادة
  drivingLicense?: {
    number: string;
    name: string;
    birthDate: string;
    issueDate?: string;
    expiryDate?: string;
    categories: string[];
    confidence: number;
  };
  
  // بيانات تسجيل المركبة
  vehicleRegistration?: {
    plateNumber: string;
    ownerName: string;
    make: string;
    model: string;
    year: string;
    confidence: number;
  };
}

export class OCREngine {
  private worker: Tesseract.Worker | null = null;
  private countryCode: string = 'AE'; // افتراضي للإمارات
  
  constructor(countryCode: string = 'AE') {
    this.countryCode = countryCode;
  }

  /**
   * تهيئة محرك OCR
   */
  async initialize(): Promise<void> {
    try {
      this.worker = await Tesseract.createWorker('ara+eng');
      
      // إعدادات OCR محسنة للوثائق العربية
      await this.worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789أبتثجحخدذرزسشصضطظعغفقكلمنهويءآإئؤة',
        preserve_interword_spaces: '1',
        tessedit_create_hocr: '1',
      });
    } catch (error) {
      console.error('خطأ في تهيئة OCR:', error);
      throw error;
    }
  }

  /**
   * معالجة صورة وثيقة
   */
  async processDocument(
    imageBuffer: Buffer | File,
    documentType: 'national_id' | 'driving_license' | 'vehicle_registration'
  ): Promise<{
    ocrResult: OCRResult;
    extractedData: ExtractedData;
    confidence: number;
  }> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      console.log(`🔍 بدء معالجة وثيقة: ${documentType}`);
      
      // تحسين الصورة قبل OCR
      const enhancedImage = await this.enhanceImage(imageBuffer);
      
      // تشغيل OCR
      const result = await this.worker!.recognize(enhancedImage);
      
      // تحويل النتائج
      const ocrResult: OCRResult = {
        text: result.data.text,
        confidence: result.data.confidence,
        words: [], // سنملأ هذا لاحقاً عند الحاجة
        blocks: [] // سنملأ هذا لاحقاً عند الحاجة
      };

      // استخراج البيانات المنظمة
      const extractedData = await this.extractStructuredData(ocrResult, documentType);
      
      // حساب درجة الثقة الإجمالية
      const overallConfidence = this.calculateOverallConfidence(ocrResult, extractedData);
      
      console.log(`✅ تم استخراج البيانات بثقة: ${overallConfidence}%`);
      
      return {
        ocrResult,
        extractedData,
        confidence: overallConfidence
      };
      
    } catch (error) {
      console.error('خطأ في معالجة الوثيقة:', error);
      throw error;
    }
  }

  /**
   * تحسين جودة الصورة قبل OCR
   */
  private async enhanceImage(imageBuffer: Buffer | File): Promise<Buffer | File> {
    // هنا يمكن إضافة تحسينات على الصورة:
    // - تحسين التباين
    // - إزالة الضوضاء
    // - تصحيح الدوران
    // - تحسين الوضوح
    
    // للآن نرجع الصورة كما هي، لكن يمكن تطوير هذا لاحقاً
    return imageBuffer;
  }

  /**
   * استخراج البيانات المنظمة من نص OCR
   */
  private async extractStructuredData(
    ocrResult: OCRResult,
    documentType: string
  ): Promise<ExtractedData> {
    const text = ocrResult.text;
    const countryConfig = await this.getCountryConfig();
    
    switch (documentType) {
      case 'national_id':
        return this.extractNationalIdData(text, countryConfig);
      case 'driving_license':
        return this.extractDrivingLicenseData(text, countryConfig);
      case 'vehicle_registration':
        return this.extractVehicleData(text, countryConfig);
      default:
        return {};
    }
  }

  /**
   * استخراج بيانات الهوية الوطنية
   */
  private extractNationalIdData(text: string, countryConfig: any): ExtractedData {
    const patterns = this.getExtractionPatterns(countryConfig, 'national_id');
    
    // البحث عن رقم الهوية
    const idMatch = text.match(patterns.id_number);
    const nameMatch = this.extractArabicName(text);
    const birthDateMatch = this.extractDate(text, 'birth');
    const issueDateMatch = this.extractDate(text, 'issue');
    const expiryDateMatch = this.extractDate(text, 'expiry');
    
    const nationalId = {
      number: idMatch?.[0] || '',
      name: nameMatch || '',
      birthDate: birthDateMatch || '',
      issueDate: issueDateMatch || '',
      expiryDate: expiryDateMatch || '',
      nationality: this.extractNationality(text),
      confidence: this.calculateFieldConfidence([idMatch, nameMatch, birthDateMatch])
    };

    return { nationalId };
  }

  /**
   * استخراج بيانات رخصة القيادة
   */
  private extractDrivingLicenseData(text: string, countryConfig: any): ExtractedData {
    const patterns = this.getExtractionPatterns(countryConfig, 'driving_license');
    
    const licenseMatch = text.match(patterns.license_number);
    const nameMatch = this.extractArabicName(text);
    const birthDateMatch = this.extractDate(text, 'birth');
    const issueDateMatch = this.extractDate(text, 'issue');
    const expiryDateMatch = this.extractDate(text, 'expiry');
    const categoriesMatch = this.extractLicenseCategories(text, countryConfig);
    
    const drivingLicense = {
      number: licenseMatch?.[0] || '',
      name: nameMatch || '',
      birthDate: birthDateMatch || '',
      issueDate: issueDateMatch || '',
      expiryDate: expiryDateMatch || '',
      categories: categoriesMatch,
      confidence: this.calculateFieldConfidence([licenseMatch, nameMatch, birthDateMatch])
    };

    return { drivingLicense };
  }

  /**
   * استخراج بيانات تسجيل المركبة
   */
  private extractVehicleData(text: string, countryConfig: any): ExtractedData {
    const patterns = this.getExtractionPatterns(countryConfig, 'vehicle_registration');
    
    const plateMatch = text.match(patterns.plate_number);
    const ownerMatch = this.extractArabicName(text);
    const makeMatch = this.extractVehicleMake(text);
    const modelMatch = this.extractVehicleModel(text);
    const yearMatch = this.extractVehicleYear(text);
    
    const vehicleRegistration = {
      plateNumber: plateMatch?.[0] || '',
      ownerName: ownerMatch || '',
      make: makeMatch || '',
      model: modelMatch || '',
      year: yearMatch || '',
      confidence: this.calculateFieldConfidence([plateMatch, ownerMatch, makeMatch])
    };

    return { vehicleRegistration };
  }

  /**
   * استخراج الأسماء العربية
   */
  private extractArabicName(text: string): string {
    // البحث عن الأسماء العربية (كلمات تحتوي على أحرف عربية)
    const arabicNamePattern = /[أ-ي\s]{6,50}/g;
    const matches = text.match(arabicNamePattern);
    
    if (matches) {
      // اختيار أطول اسم (غالباً يكون الاسم الكامل)
      return matches
        .map(name => name.trim())
        .filter(name => name.length > 5)
        .sort((a, b) => b.length - a.length)[0] || '';
    }
    
    return '';
  }

  /**
   * استخراج التواريخ بناءً على الكلمات المجاورة
   */
  private extractDate(text: string, type: 'birth' | 'issue' | 'expiry'): string {
    // تحديد الكلمات المفتاحية لكل نوع تاريخ
    const keywordPatterns = {
      birth: [
        'تاريخ الميلاد', 'الميلاد', 'مولود في', 'ولد في', 'تولد', 'birth', 'born', 'date of birth',
        'مواليد', 'المولود', 'تاريخ المولد'
      ],
      issue: [
        'تاريخ الإصدار', 'صدر في', 'أصدر', 'إصدار', 'issued', 'issue date', 'date of issue',
        'تاريخ الصدور', 'صادر في', 'أجيز في'
      ],
      expiry: [
        'تاريخ الانتهاء', 'ينتهي في', 'انتهاء الصلاحية', 'expires', 'expiry', 'valid until',
        'صالح حتى', 'منتهي في', 'تنتهي صلاحيته'
      ]
    };

    // أنماط التواريخ المختلفة
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/g,     // DD/MM/YYYY
      /\d{1,2}-\d{1,2}-\d{4}/g,      // DD-MM-YYYY
      /\d{4}\/\d{1,2}\/\d{1,2}/g,    // YYYY/MM/DD
      /\d{4}-\d{1,2}-\d{1,2}/g,      // YYYY-MM-DD
      /\d{1,2}\.\d{1,2}\.\d{4}/g,    // DD.MM.YYYY
      /\d{1,2}\s+\d{1,2}\s+\d{4}/g,  // DD MM YYYY
    ];

    const targetKeywords = keywordPatterns[type];
    
    // البحث عن تاريخ قريب من الكلمات المفتاحية
    for (const keyword of targetKeywords) {
      const keywordIndex = text.indexOf(keyword);
      if (keywordIndex !== -1) {
        // البحث في نطاق 100 حرف من الكلمة المفتاحية
        const searchStart = Math.max(0, keywordIndex - 50);
        const searchEnd = Math.min(text.length, keywordIndex + keyword.length + 100);
        const searchText = text.substring(searchStart, searchEnd);
        
        // البحث عن التاريخ في هذا النطاق
        for (const pattern of datePatterns) {
          const matches = searchText.match(pattern);
          if (matches && matches.length > 0) {
            // التحقق من صحة التاريخ
            const validDate = this.validateDate(matches[0], type);
            if (validDate) {
              return validDate;
            }
          }
        }
      }
    }
    
    // إذا لم نجد تاريخ مرتبط بكلمة مفتاحية، نبحث عن جميع التواريخ ونختار الأنسب
    let allDates: string[] = [];
    
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        allDates = allDates.concat(matches);
      }
    }
    
    // ترتيب التواريخ وفلترتها حسب النوع
    if (allDates.length > 0) {
      return this.selectBestDateByType(allDates, type);
    }
    
    return '';
  }

  /**
   * التحقق من صحة التاريخ وتنسيقه
   */
  private validateDate(dateStr: string, type: 'birth' | 'issue' | 'expiry'): string | null {
    try {
      // تطبيع التاريخ
      const normalized = dateStr.replace(/[.\s]/g, '/');
      const parts = normalized.split('/');
      
      if (parts.length !== 3) return null;
      
      let day: number, month: number, year: number;
      
      // تحديد التنسيق (DD/MM/YYYY أو YYYY/MM/DD)
      if (parseInt(parts[0]) > 12 && parseInt(parts[0]) <= 31) {
        // DD/MM/YYYY
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else if (parseInt(parts[2]) > 12 && parseInt(parts[2]) <= 31) {
        // YYYY/MM/DD
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      } else {
        // MM/DD/YYYY أو DD/MM/YYYY (نفترض DD/MM/YYYY للدول العربية)
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      }
      
      // التحقق من منطقية التاريخ
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      if (year < 1900 || year > 2050) return null;
      
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
      }
      
      const currentYear = new Date().getFullYear();
      
      // فحص منطقية التاريخ حسب النوع
      switch (type) {
        case 'birth':
          if (year > currentYear - 16 || year < currentYear - 100) return null;
          break;
        case 'issue':
          if (year > currentYear || year < currentYear - 50) return null;
          break;
        case 'expiry':
          if (year < currentYear - 5 || year > currentYear + 20) return null;
          break;
      }
      
      // إرجاع التاريخ بتنسيق موحد
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * اختيار أفضل تاريخ حسب النوع
   */
  private selectBestDateByType(dates: string[], type: 'birth' | 'issue' | 'expiry'): string {
    const validDates = dates
      .map(date => this.validateDate(date, type))
      .filter(date => date !== null) as string[];
    
    if (validDates.length === 0) return '';
    
    // ترتيب التواريخ حسب النوع
    validDates.sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      
      switch (type) {
        case 'birth':
          return dateA.getTime() - dateB.getTime(); // أقدم تاريخ
        case 'issue':
          return dateB.getTime() - dateA.getTime(); // أحدث تاريخ إصدار
        case 'expiry':
          return dateB.getTime() - dateA.getTime(); // أحدث تاريخ انتهاء
        default:
          return 0;
      }
    });
    
    return validDates[0];
  }

  /**
   * استخراج فئات الرخصة
   */
  private extractLicenseCategories(text: string, countryConfig: any): string[] {
    const categories: string[] = [];
    
    // فئات شائعة حسب الدولة
    if (this.countryCode === 'AE') {
      const patterns = ['3', '4', '5', '6'];
      patterns.forEach(pattern => {
        if (text.includes(pattern)) {
          categories.push(pattern);
        }
      });
    } else if (this.countryCode === 'SA') {
      const patterns = ['خاص', 'عام صغير', 'عام كبير'];
      patterns.forEach(pattern => {
        if (text.includes(pattern)) {
          categories.push(pattern);
        }
      });
    }
    
    return categories;
  }

  /**
   * استخراج معلومات المركبة المحسنة
   */
  private extractVehicleMake(text: string): string {
    const carBrands = [
      // ماركات يابانية
      'تويوتا', 'toyota', 'نيسان', 'nissan', 'هونداي', 'hyundai', 'كيا', 'kia',
      'مازدا', 'mazda', 'سوبارو', 'subaru', 'ميتسوبيشي', 'mitsubishi', 'هوندا', 'honda',
      'إينفينيتي', 'infiniti', 'لكزس', 'lexus', 'أكورا', 'acura',
      
      // ماركات ألمانية
      'مرسيدس', 'mercedes', 'بي ام دبليو', 'bmw', 'أودي', 'audi', 'فولكس واجن', 'volkswagen',
      'بورش', 'porsche', 'أوبل', 'opel', 'مان', 'man', 'مرسيدس بنز', 'mercedes-benz',
      
      // ماركات أمريكية
      'فورد', 'ford', 'شفروليه', 'chevrolet', 'جي ام سي', 'gmc', 'كاديلاك', 'cadillac',
      'كرايسلر', 'chrysler', 'دودج', 'dodge', 'جيب', 'jeep', 'لينكولن', 'lincoln',
      
      // ماركات أوروبية أخرى
      'رينو', 'renault', 'بيجو', 'peugeot', 'سيتروين', 'citroen', 'فيات', 'fiat',
      'ألفا روميو', 'alfa romeo', 'لاندا', 'lancia', 'فولفو', 'volvo', 'ساب', 'saab',
      
      // ماركات آسيوية أخرى
      'داتسون', 'datsun', 'سوزوكي', 'suzuki', 'إيسوزو', 'isuzu', 'سانغ يونغ', 'ssangyong',
      
      // ماركات فاخرة
      'بنتلي', 'bentley', 'رولز رويس', 'rolls-royce', 'لامبورغيني', 'lamborghini',
      'فيراري', 'ferrari', 'مازيراتي', 'maserati', 'أستون مارتن', 'aston martin',
      'جاكوار', 'jaguar', 'لاند روفر', 'land rover', 'رينج روفر', 'range rover'
    ];
    
    // البحث مع مرونة في الكتابة
    for (const brand of carBrands) {
      const regex = new RegExp(brand.replace(/\s/g, '\\s*'), 'i');
      if (regex.test(text)) {
        return brand;
      }
    }
    
    // البحث عن أنماط مختلفة للماركات
    const brandPatterns = [
      /ماركة\s*[:：]\s*([^\n\r]+)/i,
      /النوع\s*[:：]\s*([^\n\r]+)/i,
      /الصانع\s*[:：]\s*([^\n\r]+)/i,
      /make\s*[:：]\s*([^\n\r]+)/i,
      /brand\s*[:：]\s*([^\n\r]+)/i
    ];
    
    for (const pattern of brandPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extractedBrand = match[1].trim();
        // التحقق إذا كان الماركة المستخرجة معروفة
        for (const brand of carBrands) {
          if (extractedBrand.toLowerCase().includes(brand.toLowerCase())) {
            return brand;
          }
        }
        return extractedBrand;
      }
    }
    
    return '';
  }

  private extractVehicleModel(text: string): string {
    // أنماط البحث عن الموديل
    const modelPatterns = [
      /موديل\s*[:：]\s*([^\n\r]+)/i,
      /الطراز\s*[:：]\s*([^\n\r]+)/i,
      /model\s*[:：]\s*([^\n\r]+)/i,
      /الموديل\s*[:：]\s*([^\n\r]+)/i,
      /النموذج\s*[:：]\s*([^\n\r]+)/i
    ];
    
    for (const pattern of modelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const model = match[1].trim();
        // تنظيف النص من الأرقام والرموز غير المرغوبة
        const cleanModel = model.replace(/[^\u0600-\u06FFa-zA-Z0-9\s-]/g, '').trim();
        if (cleanModel.length > 0) {
          return cleanModel;
        }
      }
    }
    
    // البحث عن موديلات شائعة
    const commonModels = [
      // تويوتا
      'كامري', 'camry', 'كورولا', 'corolla', 'أفالون', 'avalon', 'راف4', 'rav4',
      'هايلندر', 'highlander', 'برادو', 'prado', 'لاند كروزر', 'land cruiser',
      'هايس', 'hiace', 'ياريس', 'yaris', 'أكوا', 'aqua',
      
      // نيسان
      'التيما', 'altima', 'صني', 'sunny', 'سنترا', 'sentra', 'مكسيما', 'maxima',
      'باترول', 'patrol', 'إكس تريل', 'x-trail', 'كاشكاي', 'qashqai',
      
      // هونداي
      'سوناتا', 'sonata', 'إلنترا', 'elantra', 'أكسنت', 'accent', 'توسان', 'tucson',
      'سانتا في', 'santa fe', 'أزيرا', 'azera', 'فيلوستر', 'veloster',
      
      // مرسيدس
      'س كلاس', 's-class', 'إي كلاس', 'e-class', 'سي كلاس', 'c-class',
      'جي كلاس', 'g-class', 'جي إل إي', 'gle', 'جي إل سي', 'glc'
    ];
    
    for (const model of commonModels) {
      const regex = new RegExp(model.replace(/\s/g, '\\s*'), 'i');
      if (regex.test(text)) {
        return model;
      }
    }
    
    return '';
  }

  private extractVehicleYear(text: string): string {
    // البحث عن أنماط السنة
    const yearPatterns = [
      /سنة\s*الصنع\s*[:：]\s*(\d{4})/i,
      /موديل\s*[:：]\s*(\d{4})/i,
      /السنة\s*[:：]\s*(\d{4})/i,
      /year\s*[:：]\s*(\d{4})/i,
      /(\d{4})\s*م/g,  // 2020م
      /(20[0-9]{2})/g  // أي سنة من 2000 إلى 2099
    ];
    
    for (const pattern of yearPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const year = parseInt(match[1]);
        const currentYear = new Date().getFullYear();
        
        // التحقق من منطقية السنة (بين 1980 و السنة الحالية + 2)
        if (year >= 1980 && year <= currentYear + 2) {
          return year.toString();
        }
      }
    }
    
    return '';
  }

  /**
   * استخراج فئة المركبة (سيدان، SUV، إلخ)
   */
  private extractVehicleCategory(text: string): string {
    const categories = [
      'سيدان', 'sedan', 'هاتشباك', 'hatchback', 'كوبيه', 'coupe',
      'SUV', 'اس يو في', 'دفع رباعي', '4x4', 'كروس أوفر', 'crossover',
      'بيك أب', 'pickup', 'فان', 'van', 'ميكروباص', 'microbus',
      'شاحنة', 'truck', 'حافلة', 'bus', 'دراجة نارية', 'motorcycle'
    ];
    
    for (const category of categories) {
      const regex = new RegExp(category, 'i');
      if (regex.test(text)) {
        return category;
      }
    }
    
    return '';
  }

  /**
   * استخراج الجنسية
   */
  private extractNationality(text: string): string {
    const nationalities = ['إماراتي', 'سعودي', 'أردني', 'مصري', 'كويتي', 'قطري'];
    
    for (const nationality of nationalities) {
      if (text.includes(nationality)) {
        return nationality;
      }
    }
    
    return '';
  }

  /**
   * الحصول على أنماط الاستخراج حسب الدولة
   */
  private getExtractionPatterns(countryConfig: any, documentType: string) {
    const patterns: any = {
      national_id: {
        id_number: countryConfig?.national_id_pattern ? 
          new RegExp(countryConfig.national_id_pattern) : 
          /\d{10,15}/,
      },
      driving_license: {
        license_number: countryConfig?.driving_license_pattern ? 
          new RegExp(countryConfig.driving_license_pattern) : 
          /\d{6,10}/,
      },
      vehicle_registration: {
        plate_number: countryConfig?.vehicle_plate_pattern ? 
          new RegExp(countryConfig.vehicle_plate_pattern) : 
          /[A-Z]{1,3}\s?\d{1,5}/,
      }
    };
    
    return patterns[documentType] || {};
  }

  /**
   * حساب درجة الثقة للحقول
   */
  private calculateFieldConfidence(matches: (RegExpMatchArray | string | null)[]): number {
    const validMatches = matches.filter(match => match && match.length > 0);
    return (validMatches.length / matches.length) * 100;
  }

  /**
   * حساب درجة الثقة الإجمالية
   */
  private calculateOverallConfidence(ocrResult: OCRResult, extractedData: ExtractedData): number {
    let totalConfidence = ocrResult.confidence;
    
    // إضافة درجات ثقة الحقول المستخرجة
    if (extractedData.nationalId) {
      totalConfidence = (totalConfidence + extractedData.nationalId.confidence) / 2;
    }
    if (extractedData.drivingLicense) {
      totalConfidence = (totalConfidence + extractedData.drivingLicense.confidence) / 2;
    }
    if (extractedData.vehicleRegistration) {
      totalConfidence = (totalConfidence + extractedData.vehicleRegistration.confidence) / 2;
    }
    
    return Math.round(totalConfidence);
  }

  /**
   * الحصول على إعدادات الدولة
   */
  private async getCountryConfig() {
    try {
      const { data, error } = await supabase
        .from('country_verification_config')
        .select('*')
        .eq('country_code', this.countryCode)
        .single();
        
      if (error) {
        console.warn('تعذر الحصول على إعدادات الدولة:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('خطأ في جلب إعدادات الدولة:', error);
      return null;
    }
  }

  /**
   * تنظيف الموارد
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// تصدير دالة مساعدة سريعة
export async function extractTextFromImage(
  imageBuffer: Buffer | File,
  documentType: 'national_id' | 'driving_license' | 'vehicle_registration',
  countryCode: string = 'AE'
): Promise<{
  text: string;
  extractedData: ExtractedData;
  confidence: number;
}> {
  const ocrEngine = new OCREngine(countryCode);
  
  try {
    const result = await ocrEngine.processDocument(imageBuffer, documentType);
    return {
      text: result.ocrResult.text,
      extractedData: result.extractedData,
      confidence: result.confidence
    };
  } finally {
    await ocrEngine.cleanup();
  }
}
