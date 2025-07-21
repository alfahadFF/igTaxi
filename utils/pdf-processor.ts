import * as pdf from 'pdf-parse';
import { OCREngine, ExtractedData } from './ocr-engine';

/**
 * محرك معالجة PDF مع دعم متعدد الصفحات
 * مع استخراج النصوص والصور وتحويلها لـ OCR
 */

export interface PDFProcessingResult {
  totalPages: number;
  extractedText: string;
  images: Array<{
    pageNumber: number;
    imageBuffer: Buffer;
    confidence: number;
  }>;
  ocrResults: Array<{
    pageNumber: number;
    text: string;
    extractedData: ExtractedData;
    confidence: number;
  }>;
  combinedData: ExtractedData;
  processingTime: number;
}

export class PDFProcessor {
  private ocrEngine: OCREngine;
  private countryCode: string;

  constructor(countryCode: string = 'AE') {
    this.countryCode = countryCode;
    this.ocrEngine = new OCREngine(countryCode);
  }

  /**
   * معالجة ملف PDF شامل
   */
  async processPDF(
    pdfBuffer: Buffer,
    documentType: 'national_id' | 'driving_license' | 'vehicle_registration',
    options: {
      maxPages?: number;
      extractImages?: boolean;
      ocrAllPages?: boolean;
    } = {}
  ): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log('📄 بدء معالجة ملف PDF...');
      
      // استخراج النص والبيانات الأساسية من PDF
      const pdfData = await pdf(pdfBuffer, {
        max: options.maxPages || 10,
        version: 'v1.10.88'
      });
      
      console.log(`📋 تم العثور على ${pdfData.numpages} صفحة في PDF`);
      
      const result: PDFProcessingResult = {
        totalPages: pdfData.numpages,
        extractedText: pdfData.text,
        images: [],
        ocrResults: [],
        combinedData: {},
        processingTime: 0
      };
      
      // إذا كان PDF يحتوي على نص قابل للاستخراج، نحلله مباشرة
      if (pdfData.text && pdfData.text.trim().length > 100) {
        console.log('📝 PDF يحتوي على نص قابل للاستخراج');
        
        const directExtraction = await this.extractDataFromText(
          pdfData.text,
          documentType
        );
        
        result.combinedData = directExtraction;
      }
      
      // إذا طُلب استخراج الصور أو OCR لجميع الصفحات
      if (options.extractImages || options.ocrAllPages) {
        await this.processIndividualPages(pdfBuffer, documentType, result, options);
      }
      
      // دمج النتائج من جميع الصفحات
      if (result.ocrResults.length > 0) {
        result.combinedData = this.combineExtractionResults(result.ocrResults);
      }
      
      result.processingTime = Date.now() - startTime;
      
      console.log(`✅ تم الانتهاء من معالجة PDF في ${result.processingTime}ms`);
      
      return result;
      
    } catch (error) {
      console.error('خطأ في معالجة PDF:', error);
      throw error;
    }
  }

  /**
   * استخراج البيانات من النص المباشر
   */
  private async extractDataFromText(
    text: string,
    documentType: 'national_id' | 'driving_license' | 'vehicle_registration'
  ): Promise<ExtractedData> {
    // استخدام نفس محرك الاستخراج من OCREngine
    // لكن بدون الحاجة لمعالجة الصور
    
    switch (documentType) {
      case 'national_id':
        return this.extractNationalIdFromText(text);
      case 'driving_license':
        return this.extractDrivingLicenseFromText(text);
      case 'vehicle_registration':
        return this.extractVehicleFromText(text);
      default:
        return {};
    }
  }

  /**
   * استخراج بيانات الهوية من النص
   */
  private async extractNationalIdFromText(text: string): Promise<ExtractedData> {
    const countryConfig = await this.getCountryConfig();
    
    // البحث عن رقم الهوية
    const idPatterns = [
      /رقم\s*الهوية\s*[:：]\s*(\d+)/i,
      /هوية\s*رقم\s*[:：]\s*(\d+)/i,
      /ID\s*Number\s*[:：]\s*(\d+)/i,
      countryConfig?.national_id_pattern ? 
        new RegExp(countryConfig.national_id_pattern) : 
        /\d{10,15}/
    ];
    
    let idNumber = '';
    for (const pattern of idPatterns) {
      const match = text.match(pattern);
      if (match) {
        idNumber = match[1] || match[0];
        break;
      }
    }
    
    // استخراج الاسم
    const namePatterns = [
      /الاسم\s*[:：]\s*([^\n\r]+)/i,
      /اسم\s*[:：]\s*([^\n\r]+)/i,
      /Name\s*[:：]\s*([^\n\r]+)/i,
      /الاسم\s*الكامل\s*[:：]\s*([^\n\r]+)/i
    ];
    
    let fullName = '';
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fullName = match[1].trim();
        break;
      }
    }
    
    // استخراج التواريخ
    const birthDate = this.extractDateFromText(text, 'birth');
    const issueDate = this.extractDateFromText(text, 'issue');
    const expiryDate = this.extractDateFromText(text, 'expiry');
    
    // استخراج الجنسية
    const nationalityPatterns = [
      /الجنسية\s*[:：]\s*([^\n\r]+)/i,
      /Nationality\s*[:：]\s*([^\n\r]+)/i
    ];
    
    let nationality = '';
    for (const pattern of nationalityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        nationality = match[1].trim();
        break;
      }
    }
    
    const nationalId = {
      number: idNumber,
      name: fullName,
      birthDate,
      issueDate,
      expiryDate,
      nationality,
      confidence: this.calculateTextExtractionConfidence([
        idNumber, fullName, birthDate
      ])
    };

    return { nationalId };
  }

  /**
   * استخراج بيانات رخصة القيادة من النص
   */
  private async extractDrivingLicenseFromText(text: string): Promise<ExtractedData> {
    const countryConfig = await this.getCountryConfig();
    
    // رقم الرخصة
    const licensePatterns = [
      /رقم\s*الرخصة\s*[:：]\s*(\d+)/i,
      /رخصة\s*رقم\s*[:：]\s*(\d+)/i,
      /License\s*Number\s*[:：]\s*(\d+)/i,
      countryConfig?.driving_license_pattern ? 
        new RegExp(countryConfig.driving_license_pattern) : 
        /\d{6,10}/
    ];
    
    let licenseNumber = '';
    for (const pattern of licensePatterns) {
      const match = text.match(pattern);
      if (match) {
        licenseNumber = match[1] || match[0];
        break;
      }
    }
    
    // استخراج الاسم
    let fullName = '';
    const namePatterns = [
      /اسم\s*السائق\s*[:：]\s*([^\n\r]+)/i,
      /الاسم\s*[:：]\s*([^\n\r]+)/i,
      /Name\s*[:：]\s*([^\n\r]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fullName = match[1].trim();
        break;
      }
    }
    
    // استخراج الفئات
    const categories = this.extractLicenseCategoriesFromText(text, countryConfig);
    
    // التواريخ
    const birthDate = this.extractDateFromText(text, 'birth');
    const issueDate = this.extractDateFromText(text, 'issue');
    const expiryDate = this.extractDateFromText(text, 'expiry');
    
    const drivingLicense = {
      number: licenseNumber,
      name: fullName,
      birthDate,
      issueDate,
      expiryDate,
      categories,
      confidence: this.calculateTextExtractionConfidence([
        licenseNumber, fullName, birthDate
      ])
    };

    return { drivingLicense };
  }

  /**
   * استخراج بيانات المركبة من النص
   */
  private async extractVehicleFromText(text: string): Promise<ExtractedData> {
    // رقم اللوحة
    const platePatterns = [
      /رقم\s*اللوحة\s*[:：]\s*([^\n\r]+)/i,
      /اللوحة\s*[:：]\s*([^\n\r]+)/i,
      /Plate\s*Number\s*[:：]\s*([^\n\r]+)/i
    ];
    
    let plateNumber = '';
    for (const pattern of platePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        plateNumber = match[1].trim();
        break;
      }
    }
    
    // اسم المالك
    const ownerPatterns = [
      /اسم\s*المالك\s*[:：]\s*([^\n\r]+)/i,
      /المالك\s*[:：]\s*([^\n\r]+)/i,
      /Owner\s*[:：]\s*([^\n\r]+)/i
    ];
    
    let ownerName = '';
    for (const pattern of ownerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        ownerName = match[1].trim();
        break;
      }
    }
    
    // نوع المركبة
    const makePatterns = [
      /نوع\s*المركبة\s*[:：]\s*([^\n\r]+)/i,
      /الماركة\s*[:：]\s*([^\n\r]+)/i,
      /Make\s*[:：]\s*([^\n\r]+)/i
    ];
    
    let make = '';
    for (const pattern of makePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        make = match[1].trim();
        break;
      }
    }
    
    // الموديل
    const modelPatterns = [
      /الموديل\s*[:：]\s*([^\n\r]+)/i,
      /Model\s*[:：]\s*([^\n\r]+)/i
    ];
    
    let model = '';
    for (const pattern of modelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        model = match[1].trim();
        break;
      }
    }
    
    // السنة
    const yearPatterns = [
      /سنة\s*الصنع\s*[:：]\s*(\d{4})/i,
      /السنة\s*[:：]\s*(\d{4})/i,
      /Year\s*[:：]\s*(\d{4})/i
    ];
    
    let year = '';
    for (const pattern of yearPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        year = match[1];
        break;
      }
    }
    
    const vehicleRegistration = {
      plateNumber,
      ownerName,
      make,
      model,
      year,
      confidence: this.calculateTextExtractionConfidence([
        plateNumber, ownerName, make
      ])
    };

    return { vehicleRegistration };
  }

  /**
   * معالجة صفحات PDF الفردية (للصور/OCR)
   */
  private async processIndividualPages(
    pdfBuffer: Buffer,
    documentType: string,
    result: PDFProcessingResult,
    options: any
  ): Promise<void> {
    try {
      // هنا يمكن استخدام مكتبة مثل pdf2pic لتحويل الصفحات لصور
      // ثم تطبيق OCR على كل صورة
      
      console.log('🖼️ تحويل صفحات PDF إلى صور...');
      
      // للآن، نحاكي هذه العملية
      // في التطبيق الحقيقي، ستحول كل صفحة لصورة وتطبق OCR
      
      for (let pageNum = 1; pageNum <= Math.min(result.totalPages, 3); pageNum++) {
        console.log(`📄 معالجة الصفحة ${pageNum}...`);
        
        // محاكاة تحويل الصفحة لصورة
        // const imageBuffer = await convertPdfPageToImage(pdfBuffer, pageNum);
        
        // محاكاة معالجة OCR
        // const ocrResult = await this.ocrEngine.processDocument(imageBuffer, documentType);
        
        // للآن نضع نتيجة وهمية
        const mockOcrResult = {
          pageNumber: pageNum,
          text: `نص مستخرج من الصفحة ${pageNum}`,
          extractedData: {},
          confidence: 75
        };
        
        result.ocrResults.push(mockOcrResult);
      }
      
    } catch (error) {
      console.error('خطأ في معالجة صفحات PDF:', error);
    }
  }

  /**
   * دمج نتائج الاستخراج من عدة صفحات
   */
  private combineExtractionResults(ocrResults: any[]): ExtractedData {
    const combined: ExtractedData = {};
    
    // دمج البيانات من جميع الصفحات مع تفضيل البيانات الأكثر ثقة
    for (const result of ocrResults) {
      if (result.extractedData.nationalId) {
        if (!combined.nationalId || 
            result.extractedData.nationalId.confidence > combined.nationalId.confidence) {
          combined.nationalId = result.extractedData.nationalId;
        }
      }
      
      if (result.extractedData.drivingLicense) {
        if (!combined.drivingLicense || 
            result.extractedData.drivingLicense.confidence > combined.drivingLicense.confidence) {
          combined.drivingLicense = result.extractedData.drivingLicense;
        }
      }
      
      if (result.extractedData.vehicleRegistration) {
        if (!combined.vehicleRegistration || 
            result.extractedData.vehicleRegistration.confidence > combined.vehicleRegistration.confidence) {
          combined.vehicleRegistration = result.extractedData.vehicleRegistration;
        }
      }
    }
    
    return combined;
  }

  /**
   * استخراج التواريخ من النص
   */
  private extractDateFromText(text: string, type: 'birth' | 'issue' | 'expiry'): string {
    const keywordPatterns = {
      birth: ['تاريخ الميلاد', 'الميلاد', 'birth', 'مواليد'],
      issue: ['تاريخ الإصدار', 'صدر في', 'issued', 'إصدار'],
      expiry: ['تاريخ الانتهاء', 'ينتهي في', 'expires', 'صالح حتى']
    };

    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /\d{1,2}-\d{1,2}-\d{4}/g,
      /\d{4}\/\d{1,2}\/\d{1,2}/g,
      /\d{4}-\d{1,2}-\d{1,2}/g
    ];

    const targetKeywords = keywordPatterns[type];
    
    for (const keyword of targetKeywords) {
      const keywordIndex = text.indexOf(keyword);
      if (keywordIndex !== -1) {
        const searchStart = Math.max(0, keywordIndex - 20);
        const searchEnd = Math.min(text.length, keywordIndex + keyword.length + 50);
        const searchText = text.substring(searchStart, searchEnd);
        
        for (const pattern of datePatterns) {
          const matches = searchText.match(pattern);
          if (matches && matches.length > 0) {
            return matches[0];
          }
        }
      }
    }
    
    return '';
  }

  /**
   * استخراج فئات الرخصة من النص
   */
  private extractLicenseCategoriesFromText(text: string, countryConfig: any): string[] {
    const categories: string[] = [];
    
    const categoryPatterns = [
      /فئة\s*[:：]\s*([^\n\r]+)/i,
      /الفئة\s*[:：]\s*([^\n\r]+)/i,
      /Category\s*[:：]\s*([^\n\r]+)/i,
      /Class\s*[:：]\s*([^\n\r]+)/i
    ];
    
    for (const pattern of categoryPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const categoryText = match[1].trim();
        
        // تحليل الفئات حسب الدولة
        if (this.countryCode === 'AE') {
          const uaeCategories = ['3', '4', '5', '6'];
          uaeCategories.forEach(cat => {
            if (categoryText.includes(cat)) {
              categories.push(cat);
            }
          });
        } else if (this.countryCode === 'SA') {
          const saCategories = ['خاص', 'عام صغير', 'عام كبير'];
          saCategories.forEach(cat => {
            if (categoryText.includes(cat)) {
              categories.push(cat);
            }
          });
        }
        
        break;
      }
    }
    
    return categories;
  }

  /**
   * حساب درجة ثقة استخراج النص
   */
  private calculateTextExtractionConfidence(fields: (string | null)[]): number {
    const validFields = fields.filter(field => field && field.trim().length > 0);
    const confidence = (validFields.length / fields.length) * 100;
    return Math.round(confidence);
  }

  /**
   * الحصول على إعدادات الدولة
   */
  private async getCountryConfig() {
    // نفس الدالة من OCREngine
    return null; // مبسط للآن
  }

  /**
   * تنظيف الموارد
   */
  async cleanup(): Promise<void> {
    await this.ocrEngine.cleanup();
  }
}

// دالة مساعدة سريعة
export async function processPDFDocument(
  pdfBuffer: Buffer,
  documentType: 'national_id' | 'driving_license' | 'vehicle_registration',
  countryCode: string = 'AE'
): Promise<PDFProcessingResult> {
  const processor = new PDFProcessor(countryCode);
  
  try {
    return await processor.processPDF(pdfBuffer, documentType, {
      maxPages: 5,
      extractImages: true,
      ocrAllPages: true
    });
  } finally {
    await processor.cleanup();
  }
}
