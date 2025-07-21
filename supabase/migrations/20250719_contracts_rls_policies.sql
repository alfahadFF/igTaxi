-- تفعيل RLS على الجداول الحساسة
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_attachments ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يرى فقط عقوده
CREATE POLICY select_own_contracts ON contracts
  FOR SELECT USING (user_id = auth.uid()::text::bigint);

-- سياسة: المستخدم يعدل فقط عقوده
CREATE POLICY update_own_contracts ON contracts
  FOR UPDATE USING (user_id = auth.uid()::text::bigint);

-- سياسة: المستخدم يضيف عقد لنفسه فقط
CREATE POLICY insert_own_contracts ON contracts
  FOR INSERT WITH CHECK (user_id = auth.uid()::text::bigint);

-- سياسة: المستخدم يرى فقط المواقع المرتبطة بعقوده
CREATE POLICY select_own_locations ON contract_locations
  FOR SELECT USING (contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid()::text::bigint));

-- سياسة: المستخدم يرى فقط عروضه
CREATE POLICY select_own_offers ON contract_offers
  FOR SELECT USING (driver_id = auth.uid());

-- سياسة: المستخدم يرى فقط المرفقات المرتبطة بعقوده
CREATE POLICY select_own_attachments ON contract_attachments
  FOR SELECT USING (contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid()::text::bigint));

-- سياسة: المستخدم يرى فقط سجلاته في contract_users
CREATE POLICY select_own_contract_users ON contract_users
  FOR SELECT USING (user_id = auth.uid()::text::bigint);

-- ملاحظة: يمكن تخصيص سياسات INSERT/UPDATE/DELETE حسب الحاجة.
-- إذا كان لديك أدوار (admin/driver/owner) يمكن إضافة سياسات خاصة لكل دور.
