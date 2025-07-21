-- دوال قاعدة البيانات لنظام الأمان والطوارئ
-- يجب تشغيل هذا الملف بعد إنشاء الجداول

-- دالة للحصول على جهات الاتصال الطارئة الأساسية
CREATE OR REPLACE FUNCTION get_primary_emergency_contacts(user_uuid UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_name TEXT,
    contact_phone TEXT,
    relationship TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.id,
        ec.name,
        ec.phone,
        ec.relationship
    FROM emergency_contacts ec
    WHERE ec.user_id = user_uuid
    AND ec.is_primary = true
    AND ec.is_active = true
    ORDER BY ec.created_at ASC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء حادثة طوارئ مع إشعارات تلقائية
CREATE OR REPLACE FUNCTION create_emergency_incident_with_notifications(
    p_user_id UUID,
    p_incident_type incident_type_enum,
    p_location JSONB,
    p_description TEXT,
    p_priority priority_enum,
    p_trip_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    incident_id UUID;
    contact_record RECORD;
BEGIN
    -- إنشاء الحادثة
    INSERT INTO emergency_incidents (
        user_id, incident_type, location, description, priority, trip_id, status
    ) VALUES (
        p_user_id, p_incident_type, p_location, p_description, p_priority, p_trip_id, 'active'
    ) RETURNING id INTO incident_id;

    -- إرسال إشعارات لجهات الاتصال الأساسية
    FOR contact_record IN 
        SELECT id, name FROM emergency_contacts 
        WHERE user_id = p_user_id 
        AND is_primary = true 
        AND is_active = true
    LOOP
        INSERT INTO emergency_notifications (
            incident_id,
            recipient_id,
            notification_type,
            message,
            status
        ) VALUES (
            incident_id,
            contact_record.id,
            'emergency_contact',
            'حالة طوارئ: ' || contact_record.name || ' يحتاج للمساعدة الفورية.',
            'sent'
        );
    END LOOP;

    -- تحديث حالة الإشعارات في الحادثة
    UPDATE emergency_incidents 
    SET emergency_contacts_notified = true
    WHERE id = incident_id;

    RETURN incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على البطاقة الطبية في حالات الطوارئ
CREATE OR REPLACE FUNCTION get_medical_card_for_emergency(
    passenger_id UUID,
    driver_id UUID
)
RETURNS TABLE (
    card_id UUID,
    personal_info JSONB,
    emergency_info JSONB,
    conditions JSONB,
    medications JSONB,
    allergies JSONB
) AS $$
DECLARE
    has_active_trip BOOLEAN := false;
    has_emergency BOOLEAN := false;
BEGIN
    -- التحقق من وجود رحلة نشطة
    SELECT EXISTS(
        SELECT 1 FROM trips 
        WHERE customer_id = passenger_id 
        AND driver_id = driver_id 
        AND status IN ('in_progress', 'emergency')
    ) INTO has_active_trip;

    -- التحقق من وجود حالة طوارئ نشطة
    IF NOT has_active_trip THEN
        SELECT EXISTS(
            SELECT 1 FROM emergency_incidents 
            WHERE user_id = passenger_id 
            AND status = 'active'
            AND created_at > NOW() - INTERVAL '2 hours'
        ) INTO has_emergency;
    END IF;

    -- التحقق من الصلاحية
    IF NOT (has_active_trip OR has_emergency) THEN
        RAISE EXCEPTION 'No active trip or emergency found';
    END IF;

    -- جلب البطاقة الطبية
    RETURN QUERY
    SELECT 
        mec.id,
        mec.personal_info,
        mec.emergency_info,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'condition', condition_name,
                    'severity', severity,
                    'notes', notes
                )
            ) FROM medical_conditions WHERE medical_card_id = mec.id),
            '[]'::jsonb
        ) as conditions,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'name', medication_name,
                    'dosage', dosage,
                    'frequency', frequency,
                    'is_critical', is_critical,
                    'notes', notes
                )
            ) FROM current_medications WHERE medical_card_id = mec.id),
            '[]'::jsonb
        ) as medications,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'allergen', allergen,
                    'severity', severity,
                    'reaction', reaction,
                    'notes', notes
                )
            ) FROM medical_allergies WHERE medical_card_id = mec.id),
            '[]'::jsonb
        ) as allergies
    FROM medical_emergency_cards mec
    WHERE mec.user_id = passenger_id
    AND mec.is_active = true
    AND mec.is_public_in_emergency = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء مشاركة رحلة
CREATE OR REPLACE FUNCTION create_trip_share_with_recipients(
    p_trip_id UUID,
    p_shared_by UUID,
    p_recipients JSONB
)
RETURNS TEXT AS $$
DECLARE
    share_code TEXT;
    trip_share_id UUID;
    recipient JSONB;
BEGIN
    -- توليد كود مشاركة فريد
    share_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- التحقق من عدم تكرار الكود
    WHILE EXISTS(SELECT 1 FROM trip_shares WHERE share_code = share_code) LOOP
        share_code := upper(substring(md5(random()::text) from 1 for 8));
    END LOOP;

    -- إنشاء مشاركة الرحلة
    INSERT INTO trip_shares (
        trip_id, shared_by, share_code, expires_at, is_active
    ) VALUES (
        p_trip_id, p_shared_by, share_code, NOW() + INTERVAL '24 hours', true
    ) RETURNING id INTO trip_share_id;

    -- إضافة المستقبلين
    FOR recipient IN SELECT * FROM jsonb_array_elements(p_recipients)
    LOOP
        INSERT INTO trip_share_recipients (
            trip_share_id,
            contact_name,
            contact_phone,
            notification_sent
        ) VALUES (
            trip_share_id,
            recipient->>'name',
            recipient->>'phone',
            false
        );
    END LOOP;

    RETURN share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتنظيف البيانات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_safety_data()
RETURNS void AS $$
BEGIN
    -- حذف مواقع الرحلات القديمة (أكثر من 30 يوم)
    DELETE FROM trip_location_history 
    WHERE timestamp < NOW() - INTERVAL '30 days';

    -- تعطيل مشاركات الرحلات المنتهية الصلاحية
    UPDATE trip_shares 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;

    -- حذف الإشعارات القديمة (أكثر من 90 يوم)
    DELETE FROM emergency_notifications 
    WHERE sent_at < NOW() - INTERVAL '90 days';

    -- إغلاق الحوادث القديمة غير المحلولة (أكثر من 7 أيام)
    UPDATE emergency_incidents 
    SET status = 'resolved', resolved_at = NOW()
    WHERE status = 'active' 
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للإحصائيات والتقارير
CREATE OR REPLACE FUNCTION get_safety_statistics(p_user_id UUID)
RETURNS TABLE (
    total_incidents INTEGER,
    resolved_incidents INTEGER,
    active_incidents INTEGER,
    total_trip_shares INTEGER,
    emergency_contacts_count INTEGER,
    has_medical_card BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM emergency_incidents WHERE user_id = p_user_id),
        (SELECT COUNT(*)::INTEGER FROM emergency_incidents WHERE user_id = p_user_id AND status = 'resolved'),
        (SELECT COUNT(*)::INTEGER FROM emergency_incidents WHERE user_id = p_user_id AND status = 'active'),
        (SELECT COUNT(*)::INTEGER FROM trip_shares WHERE shared_by = p_user_id),
        (SELECT COUNT(*)::INTEGER FROM emergency_contacts WHERE user_id = p_user_id AND is_active = true),
        (SELECT EXISTS(SELECT 1 FROM medical_emergency_cards WHERE user_id = p_user_id AND is_active = true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث موقع الرحلة في الوقت الفعلي
CREATE OR REPLACE FUNCTION update_trip_location(
    p_trip_share_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_speed DECIMAL DEFAULT NULL,
    p_heading DECIMAL DEFAULT NULL,
    p_accuracy DECIMAL DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- التحقق من أن مشاركة الرحلة نشطة
    IF NOT EXISTS(
        SELECT 1 FROM trip_shares 
        WHERE id = p_trip_share_id 
        AND is_active = true 
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'Trip share is not active or expired';
    END IF;

    -- إدراج الموقع الجديد
    INSERT INTO trip_location_history (
        trip_share_id, latitude, longitude, speed, heading, accuracy, timestamp
    ) VALUES (
        p_trip_share_id, p_latitude, p_longitude, p_speed, p_heading, p_accuracy, NOW()
    );

    -- تحديث وقت آخر مشاهدة لجميع المستقبلين
    UPDATE trip_share_recipients 
    SET last_viewed = NOW()
    WHERE trip_share_id = p_trip_share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء مهمة دورية لتنظيف البيانات (اختياري - يتطلب pg_cron)
-- SELECT cron.schedule('cleanup-safety-data', '0 2 * * *', 'SELECT cleanup_old_safety_data();');

COMMENT ON FUNCTION get_primary_emergency_contacts IS 'جلب جهات الاتصال الطارئة الأساسية للمستخدم';
COMMENT ON FUNCTION create_emergency_incident_with_notifications IS 'إنشاء حادثة طوارئ مع إرسال إشعارات تلقائية';
COMMENT ON FUNCTION get_medical_card_for_emergency IS 'جلب البطاقة الطبية للراكب في حالات الطوارئ';
COMMENT ON FUNCTION create_trip_share_with_recipients IS 'إنشاء مشاركة رحلة مع قائمة المستقبلين';
COMMENT ON FUNCTION cleanup_old_safety_data IS 'تنظيف البيانات القديمة من نظام الأمان';
COMMENT ON FUNCTION get_safety_statistics IS 'جلب إحصائيات الأمان للمستخدم';
COMMENT ON FUNCTION update_trip_location IS 'تحديث موقع الرحلة في الوقت الفعلي';
