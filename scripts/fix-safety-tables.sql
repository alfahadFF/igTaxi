-- ملف إصلاح جداول الأمان - مُحدث
-- Fixed Safety Tables SQL - Updated Version

-- إصلاح سياسات الأمان للبطاقات الطبية
DROP POLICY IF EXISTS "Drivers can view passenger medical card during emergency" ON medical_emergency_cards;

CREATE POLICY "Drivers can view passenger medical card during emergency" ON medical_emergency_cards FOR SELECT USING (
    -- السماح للمستخدم برؤية بطاقته الخاصة
    auth.uid() = user_id
    OR
    -- السماح للسائق برؤية بطاقة الراكب في رحلة نشطة
    (
        is_visible = true 
        AND EXISTS (
            SELECT 1 FROM trips t 
            WHERE t.driver_id = auth.uid() 
            AND t.customer_id = medical_emergency_cards.user_id 
            AND t.status IN ('in_progress', 'emergency')
        )
    )
    OR 
    -- السماح بالوصول في حالات الطوارئ النشطة
    (
        is_visible = true 
        AND EXISTS (
            SELECT 1 FROM emergency_incidents ei 
            WHERE ei.user_id = medical_emergency_cards.user_id 
            AND ei.status = 'active'
            AND ei.created_at > now() - interval '2 hours'
        )
    )
);

-- إصلاح سياسات جداول البيانات الطبية
CREATE POLICY "Medical conditions follow card access" ON medical_conditions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_conditions.card_id 
        AND (
            mec.user_id = auth.uid()
            OR 
            (
                mec.is_visible = true 
                AND EXISTS (
                    SELECT 1 FROM trips t 
                    WHERE t.driver_id = auth.uid() 
                    AND t.customer_id = mec.user_id 
                    AND t.status IN ('in_progress', 'emergency')
                )
            )
            OR 
            (
                mec.is_visible = true 
                AND EXISTS (
                    SELECT 1 FROM emergency_incidents ei 
                    WHERE ei.user_id = mec.user_id 
                    AND ei.status = 'active'
                    AND ei.created_at > now() - interval '2 hours'
                )
            )
        )
    )
);

CREATE POLICY "Medications follow card access" ON current_medications FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = current_medications.card_id 
        AND (
            mec.user_id = auth.uid()
            OR 
            (
                mec.is_visible = true 
                AND EXISTS (
                    SELECT 1 FROM trips t 
                    WHERE t.driver_id = auth.uid() 
                    AND t.customer_id = mec.user_id 
                    AND t.status IN ('in_progress', 'emergency')
                )
            )
            OR 
            (
                mec.is_visible = true 
                AND EXISTS (
                    SELECT 1 FROM emergency_incidents ei 
                    WHERE ei.user_id = mec.user_id 
                    AND ei.status = 'active'
                    AND ei.created_at > now() - interval '2 hours'
                )
            )
        )
    )
);

CREATE POLICY "Allergies follow card access" ON medical_allergies FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_allergies.card_id 
        AND (
            mec.user_id = auth.uid()
            OR 
            (
                mec.is_visible = true 
                AND EXISTS (
                    SELECT 1 FROM trips t 
                    WHERE t.driver_id = auth.uid() 
                    AND t.customer_id = mec.user_id 
                    AND t.status IN ('in_progress', 'emergency')
                )
            )
            OR 
            (
                mec.is_visible = true 
                AND EXISTS (
                    SELECT 1 FROM emergency_incidents ei 
                    WHERE ei.user_id = mec.user_id 
                    AND ei.status = 'active'
                    AND ei.created_at > now() - interval '2 hours'
                )
            )
        )
    )
);

-- إضافة سياسات INSERT/UPDATE/DELETE للجداول المرتبطة
CREATE POLICY "Users can insert their own medical conditions" ON medical_conditions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_conditions.card_id 
        AND mec.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own medical conditions" ON medical_conditions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_conditions.card_id 
        AND mec.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own medical conditions" ON medical_conditions FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_conditions.card_id 
        AND mec.user_id = auth.uid()
    )
);

-- نفس السياسات للأدوية
CREATE POLICY "Users can insert their own medications" ON current_medications FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = current_medications.card_id 
        AND mec.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own medications" ON current_medications FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = current_medications.card_id 
        AND mec.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own medications" ON current_medications FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = current_medications.card_id 
        AND mec.user_id = auth.uid()
    )
);

-- نفس السياسات للحساسيات
CREATE POLICY "Users can insert their own allergies" ON medical_allergies FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_allergies.card_id 
        AND mec.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own allergies" ON medical_allergies FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_allergies.card_id 
        AND mec.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own allergies" ON medical_allergies FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM medical_emergency_cards mec 
        WHERE mec.id = medical_allergies.card_id 
        AND mec.user_id = auth.uid()
    )
);

-- إضافة سياسات للجداول الأخرى
CREATE POLICY "Users can view trip shares by code" ON trip_shares FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
        SELECT 1 FROM trip_share_recipients tsr
        JOIN emergency_contacts ec ON ec.id = tsr.contact_id
        WHERE tsr.trip_share_id = trip_shares.id
        AND trip_shares.is_active = true
    )
);

CREATE POLICY "Recipients can view trip location history" ON trip_location_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM trip_shares ts
        WHERE ts.id = trip_location_history.trip_share_id
        AND (
            ts.user_id = auth.uid()
            OR 
            EXISTS (
                SELECT 1 FROM trip_share_recipients tsr
                JOIN emergency_contacts ec ON ec.id = tsr.contact_id
                WHERE tsr.trip_share_id = ts.id
                AND ts.is_active = true
            )
        )
    )
);

-- إصلاح تعريفات ENUM إذا لم تكن موجودة
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_type_enum') THEN
        CREATE TYPE incident_type_enum AS ENUM ('medical', 'security', 'accident', 'panic', 'sos');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_enum') THEN
        CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
END $$;

-- تحديث جدول emergency_incidents لاستخدام ENUM إذا لم يكن موجود
DO $$
BEGIN
    -- التحقق من وجود الجدول وتحديثه
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_incidents') THEN
        -- إضافة عمود مؤقت بنوع ENUM
        ALTER TABLE emergency_incidents ADD COLUMN IF NOT EXISTS incident_type_new incident_type_enum;
        ALTER TABLE emergency_incidents ADD COLUMN IF NOT EXISTS priority_new priority_enum;
        
        -- نسخ البيانات مع التحويل
        UPDATE emergency_incidents 
        SET incident_type_new = incident_type::incident_type_enum,
            priority_new = priority::priority_enum
        WHERE incident_type_new IS NULL OR priority_new IS NULL;
        
        -- حذف الأعمدة القديمة وإعادة تسمية الجديدة (اختياري - يمكن تشغيله لاحقاً)
        -- ALTER TABLE emergency_incidents DROP COLUMN IF EXISTS incident_type_old;
        -- ALTER TABLE emergency_incidents DROP COLUMN IF EXISTS priority_old;
        -- ALTER TABLE emergency_incidents RENAME COLUMN incident_type_new TO incident_type;
        -- ALTER TABLE emergency_incidents RENAME COLUMN priority_new TO priority;
    END IF;
END $$;

-- إنشاء فهارس إضافية للأداء
CREATE INDEX IF NOT EXISTS idx_medical_cards_visible ON medical_emergency_cards(user_id, is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_active ON emergency_incidents(user_id, status, created_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_trips_active_emergency ON trips(driver_id, customer_id, status) WHERE status IN ('in_progress', 'emergency');

-- تحديث تعليقات للوضوح
COMMENT ON POLICY "Drivers can view passenger medical card during emergency" ON medical_emergency_cards IS 'يسمح للسائقين برؤية البطاقة الطبية للراكب في الرحلات النشطة أو حالات الطوارئ فقط';
COMMENT ON POLICY "Medical conditions follow card access" ON medical_conditions IS 'الحالات الطبية تتبع نفس صلاحيات الوصول للبطاقة الطبية';
COMMENT ON POLICY "Medications follow card access" ON current_medications IS 'الأدوية تتبع نفس صلاحيات الوصول للبطاقة الطبية';
COMMENT ON POLICY "Allergies follow card access" ON medical_allergies IS 'الحساسيات تتبع نفس صلاحيات الوصول للبطاقة الطبية';

-- رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح جداول الأمان بنجاح - Safety tables fixed successfully';
END $$;
