-- =====================================================
-- TRANSPORT SYSTEM RLS POLICIES
-- يجب تشغيل هذا الملف بعد إنشاء الجداول والتأكد من وجود نظام المصادقة
-- =====================================================

-- تفعيل RLS للجداول
ALTER TABLE transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_contracts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- سياسات جدول طلبات النقل
-- =====================================================

-- العملاء يمكنهم رؤية طلباتهم فقط
CREATE POLICY "Users can view their own transport requests" 
ON transport_requests FOR SELECT 
USING (user_id = auth.uid());

-- العملاء يمكنهم إنشاء طلبات جديدة
CREATE POLICY "Users can create transport requests" 
ON transport_requests FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- العملاء يمكنهم تعديل طلباتهم فقط
CREATE POLICY "Users can update their own transport requests" 
ON transport_requests FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- الناقلون يمكنهم رؤية الطلبات المفتوحة
CREATE POLICY "Transporters can view open requests" 
ON transport_requests FOR SELECT 
USING (
    status IN ('pending', 'offers_received') AND
    EXISTS (SELECT 1 FROM transporter_profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- سياسات جدول عروض الناقلين
-- =====================================================

-- الناقلون يمكنهم رؤية عروضهم
CREATE POLICY "Transporters can view their own offers" 
ON transport_offers FOR SELECT 
USING (transporter_id = auth.uid());

-- الناقلون يمكنهم إنشاء عروض
CREATE POLICY "Transporters can create offers" 
ON transport_offers FOR INSERT 
WITH CHECK (
    transporter_id = auth.uid() AND
    EXISTS (SELECT 1 FROM transporter_profiles WHERE user_id = auth.uid())
);

-- الناقلون يمكنهم تعديل عروضهم
CREATE POLICY "Transporters can update their own offers" 
ON transport_offers FOR UPDATE 
USING (transporter_id = auth.uid()) 
WITH CHECK (transporter_id = auth.uid());

-- العملاء يمكنهم رؤية العروض لطلباتهم
CREATE POLICY "Customers can view offers for their requests" 
ON transport_offers FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM transport_requests 
        WHERE id = request_id AND user_id = auth.uid()
    )
);

-- العملاء يمكنهم قبول/رفض العروض لطلباتهم
CREATE POLICY "Customers can update offers for their requests" 
ON transport_offers FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM transport_requests 
        WHERE id = request_id AND user_id = auth.uid()
    )
);

-- =====================================================
-- سياسات جدول رحلات النقل
-- =====================================================

-- العملاء يمكنهم رؤية رحلاتهم
CREATE POLICY "Customers can view their own trips" 
ON transport_trips FOR SELECT 
USING (customer_id = auth.uid());

-- الناقلون يمكنهم رؤية رحلاتهم
CREATE POLICY "Transporters can view their own trips" 
ON transport_trips FOR SELECT 
USING (transporter_id = auth.uid());

-- إنشاء رحلة جديدة (النظام فقط)
CREATE POLICY "System can create trips" 
ON transport_trips FOR INSERT 
WITH CHECK (true); -- سيتم تحديثها حسب منطق النظام

-- العملاء والناقلون يمكنهم تحديث رحلاتهم
CREATE POLICY "Participants can update trips" 
ON transport_trips FOR UPDATE 
USING (customer_id = auth.uid() OR transporter_id = auth.uid()) 
WITH CHECK (customer_id = auth.uid() OR transporter_id = auth.uid());

-- =====================================================
-- سياسات جدول ملفات الناقلين
-- =====================================================

-- الناقلون يمكنهم رؤية ملفهم الشخصي فقط
CREATE POLICY "Transporters can view their own profile" 
ON transporter_profiles FOR SELECT 
USING (user_id = auth.uid());

-- الناقلون يمكنهم إنشاء ملفهم الشخصي
CREATE POLICY "Transporters can create their profile" 
ON transporter_profiles FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- الناقلون يمكنهم تعديل ملفهم الشخصي
CREATE POLICY "Transporters can update their profile" 
ON transporter_profiles FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- العملاء يمكنهم رؤية ملفات الناقلين المتاحين
CREATE POLICY "Customers can view available transporters" 
ON transporter_profiles FOR SELECT 
USING (is_active = true AND verification_status = 'verified');

-- =====================================================
-- سياسات جدول العقود
-- =====================================================

-- العملاء يمكنهم رؤية عقودهم
CREATE POLICY "Customers can view their contracts" 
ON transport_contracts FOR SELECT 
USING (customer_id = auth.uid());

-- الناقلون يمكنهم رؤية عقودهم
CREATE POLICY "Transporters can view their contracts" 
ON transport_contracts FOR SELECT 
USING (transporter_id = auth.uid());

-- العملاء يمكنهم إنشاء عقود جديدة
CREATE POLICY "Customers can create contracts" 
ON transport_contracts FOR INSERT 
WITH CHECK (customer_id = auth.uid());

-- العملاء والناقلون يمكنهم تحديث عقودهم
CREATE POLICY "Participants can update contracts" 
ON transport_contracts FOR UPDATE 
USING (customer_id = auth.uid() OR transporter_id = auth.uid()) 
WITH CHECK (customer_id = auth.uid() OR transporter_id = auth.uid());
