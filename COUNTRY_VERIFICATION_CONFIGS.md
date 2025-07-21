# 🌍 إعدادات التحقق حسب الدول العربية

## 📋 **مصفوفة المتطلبات حسب الدولة:**

### 🇦🇪 **دولة الإمارات العربية المتحدة:**
```json
{
  "country_code": "AE",
  "country_name_ar": "الإمارات العربية المتحدة",
  "languages": ["ar", "en"],
  "id_pattern": "^784-[0-9]{4}-[0-9]{7}-[0-9]$",
  "license_pattern": "^[0-9]{6,8}$",
  "driver_requirements": {
    "taxi_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3", "4", "5", "6"],
      "additional_docs": []
    },
    "transporter": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["2", "3", "4", "5", "6"],
      "additional_docs": ["vehicle_registration"],
      "transport_license_required": false
    },
    "event_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3", "4", "5", "6"],
      "additional_docs": []
    }
  }
}
```

### 🇸🇦 **المملكة العربية السعودية:**
```json
{
  "country_code": "SA",
  "country_name_ar": "المملكة العربية السعودية",
  "languages": ["ar"],
  "id_pattern": "^[12][0-9]{9}$",
  "license_pattern": "^[0-9]{10}$",
  "driver_requirements": {
    "taxi_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["خاص"],
      "additional_docs": []
    },
    "transporter": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["خاص", "عام صغير", "عام كبير"],
      "additional_docs": ["vehicle_registration"],
      "transport_license_required": true
    },
    "event_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["خاص"],
      "additional_docs": []
    }
  }
}
```

### 🇯🇴 **المملكة الأردنية الهاشمية:**
```json
{
  "country_code": "JO",
  "country_name_ar": "المملكة الأردنية الهاشمية",
  "languages": ["ar"],
  "id_pattern": "^[0-9]{10}$",
  "license_pattern": "^[0-9]{7,9}$",
  "driver_requirements": {
    "taxi_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3"],
      "additional_docs": []
    },
    "transporter": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3", "4", "5"],
      "additional_docs": ["vehicle_registration"],
      "transport_license_required": false
    },
    "event_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3"],
      "additional_docs": []
    }
  }
}
```

### 🇪🇬 **جمهورية مصر العربية:**
```json
{
  "country_code": "EG",
  "country_name_ar": "جمهورية مصر العربية",
  "languages": ["ar"],
  "id_pattern": "^[23][0-9]{13}$",
  "license_pattern": "^[0-9]{6,8}$",
  "driver_requirements": {
    "taxi_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["أولى"],
      "additional_docs": []
    },
    "transporter": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["أولى", "ثانية"],
      "additional_docs": ["vehicle_registration"],
      "transport_license_required": false
    },
    "event_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["أولى"],
      "additional_docs": []
    }
  }
}
```

### 🇰🇼 **دولة الكويت:**
```json
{
  "country_code": "KW",
  "country_name_ar": "دولة الكويت",
  "languages": ["ar", "en"],
  "id_pattern": "^[0-9]{12}$",
  "license_pattern": "^[0-9]{6,8}$",
  "driver_requirements": {
    "taxi_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3"],
      "additional_docs": []
    },
    "transporter": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3", "4", "5"],
      "additional_docs": ["vehicle_registration"],
      "transport_license_required": false
    },
    "event_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["3"],
      "additional_docs": []
    }
  }
}
```

### 🇶🇦 **دولة قطر:**
```json
{
  "country_code": "QA",
  "country_name_ar": "دولة قطر",
  "languages": ["ar", "en"],
  "id_pattern": "^[0-9]{11}$",
  "license_pattern": "^[0-9]{7,9}$",
  "driver_requirements": {
    "taxi_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["4", "5", "6"],
      "additional_docs": []
    },
    "transporter": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["4", "5", "6", "7"],
      "additional_docs": ["vehicle_registration"],
      "transport_license_required": false
    },
    "event_driver": {
      "required_docs": ["national_id", "driving_license"],
      "license_categories": ["4", "5", "6"],
      "additional_docs": []
    }
  }
}
```

---

## 🔧 **نظام التكوين المرن:**

### 📊 **جدول إعدادات الدول:**
```sql
CREATE TABLE country_verification_config (
    country_code CHAR(2) PRIMARY KEY,
    country_name_ar TEXT NOT NULL,
    country_name_en TEXT,
    
    -- اللغات المدعومة
    supported_languages TEXT[] DEFAULT ARRAY['ar'],
    
    -- أنماط التحقق
    national_id_pattern TEXT,
    driving_license_pattern TEXT,
    vehicle_plate_pattern TEXT,
    
    -- إعدادات OCR
    ocr_languages TEXT[] DEFAULT ARRAY['ara'],
    
    -- متطلبات كل نوع سائق
    driver_requirements JSONB NOT NULL DEFAULT '{}',
    
    -- إعدادات خاصة
    special_settings JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🛠️ **API للحصول على إعدادات الدولة:**
```typescript
// utils/verification/country-config.ts

export interface CountryConfig {
  country_code: string;
  country_name_ar: string;
  languages: string[];
  id_pattern: string;
  license_pattern: string;
  driver_requirements: {
    [key: string]: {
      required_docs: string[];
      license_categories: string[];
      additional_docs: string[];
      transport_license_required?: boolean;
    }
  };
}

export const getCountryConfig = async (countryCode: string): Promise<CountryConfig> => {
  const { data, error } = await supabase
    .from('country_verification_config')
    .select('*')
    .eq('country_code', countryCode)
    .eq('is_active', true)
    .single();
    
  if (error || !data) {
    throw new Error(`لا توجد إعدادات للدولة: ${countryCode}`);
  }
  
  return data;
};

export const validateByCountryRules = (
  countryCode: string,
  driverType: string,
  extractedData: any,
  submittedData: any
): ValidationResult => {
  // منطق التحقق المرن حسب الدولة
};
```

---

## 🎯 **المرونة في التطبيق:**

### ✅ **مزايا النظام المرن:**
1. **إضافة دول جديدة** بسهولة عبر قاعدة البيانات
2. **تخصيص المتطلبات** لكل دولة منفصلة
3. **دعم اللغات المختلفة** (عربي فقط أو مع الإنجليزية)
4. **مرونة في الوثائق** (إجبارية أو اختيارية)
5. **تحديث القواعد** دون تغيير الكود

### 🔄 **كيفية إضافة دولة جديدة:**
```sql
-- مثال: إضافة لبنان
INSERT INTO country_verification_config (
    country_code, 
    country_name_ar, 
    supported_languages,
    national_id_pattern,
    driving_license_pattern,
    driver_requirements
) VALUES (
    'LB',
    'الجمهورية اللبنانية',
    ARRAY['ar'],
    '^[0-9]{11}$',
    '^[0-9]{6,8}$',
    '{
        "taxi_driver": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["ب"],
            "additional_docs": []
        },
        "transporter": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["ب", "ج"],
            "additional_docs": ["vehicle_registration"],
            "transport_license_required": false
        }
    }'
);
```

**هذا النظام يجعل التطبيق قابل للتشغيل في أي دولة عربية بمجرد إضافة إعداداتها!**
