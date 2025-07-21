-- تحويل جميع الحقول المرتبطة بالمستخدمين إلى uuid بدلاً من bigint
-- 1. تعديل الحقول في contracts
ALTER TABLE contracts ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
-- 2. تعديل الحقول في contract_offers
ALTER TABLE contract_offers ALTER COLUMN driver_id TYPE uuid USING driver_id::text::uuid;
-- 3. تعديل الحقول في contract_users
ALTER TABLE contract_users ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
-- 4. تعديل الحقول المرتبطة إذا كان لديك جداول أخرى مرتبطة بالمستخدمين
-- ملاحظة: يجب أن تكون جميع القيم الحالية في user_id/driver_id قابلة للتحويل إلى uuid

-- تحديث الفهارس إذا لزم الأمر (عادة لا تحتاج تعديل)

-- بعد ذلك يمكنك تعديل سياسات RLS لتكون:
-- user_id = auth.uid() (بدون تحويل)
-- driver_id = auth.uid()

-- مثال على السياسات بعد التعديل:
-- CREATE POLICY select_own_contracts ON contracts FOR SELECT USING (user_id = auth.uid());
-- CREATE POLICY select_own_offers ON contract_offers FOR SELECT USING (driver_id = auth.uid());
-- CREATE POLICY select_own_contract_users ON contract_users FOR SELECT USING (user_id = auth.uid());
