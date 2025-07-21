-- جدول العقود الرئيسي (مثال عام)
CREATE TABLE contracts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL, -- صاحب العقد
  contract_type VARCHAR(32) NOT NULL, -- نوع العقد (corporate, school, hotel, employee, personal, workers)
  duration VARCHAR(32) NOT NULL,
  status VARCHAR(32) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول تفاصيل العقود (بيانات إضافية لكل نوع عقد)
CREATE TABLE contract_details (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
  key VARCHAR(64) NOT NULL, -- اسم الحقل (companyName, employeeCount, ...)
  value TEXT -- قيمة الحقل
);

-- جدول النقاط المرتبطة بالعقد (استلام/توصيل/مواقع عمل)
CREATE TABLE contract_locations (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL, -- pickup/dropoff/project/worksite
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  point_order INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول عروض السائقين على العقود
CREATE TABLE contract_offers (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL,
  offer_amount NUMERIC(12,2) NOT NULL,
  commission NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(32) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول ربط العقود بالمستخدمين (للتاريخ أو التتبع)
CREATE TABLE contract_users (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  role VARCHAR(32) NOT NULL, -- owner/driver/participant
  created_at TIMESTAMP DEFAULT NOW()
);
