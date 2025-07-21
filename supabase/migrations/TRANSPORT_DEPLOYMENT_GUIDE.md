# تعليمات تشغيل نظام النقل

## الآن تم فصل الملفات لتجنب الأخطاء:

### 1. ملف إنشاء الجداول (يجب تشغيله أولاً):
```
20250119_011_create_transport_tables.sql
```

### 2. ملف سياسات RLS (يُشغل بعد إنشاء الجداول):
```
20250119_012_transport_rls_policies.sql
```

## طرق التشغيل:

### الطريقة الأولى: من Supabase Dashboard
1. اذهب إلى Supabase Dashboard
2. اختر مشروعك
3. انقر على "SQL Editor"
4. انسخ محتوى الملف الأول والصقه واضغط "Run"
5. كرر نفس العملية للملف الثاني

### الطريقة الثانية: من خلال Supabase CLI
```bash
supabase migration up
```

### الطريقة الثالثة: تشغيل مباشر
```bash
# إذا كان لديك psql مثبت
psql "postgresql://postgres:[password]@[host]:5432/postgres" -f 20250119_011_create_transport_tables.sql
psql "postgresql://postgres:[password]@[host]:5432/postgres" -f 20250119_012_transport_rls_policies.sql
```

## الجداول التي سيتم إنشاؤها:
- ✅ transport_requests (طلبات النقل)
- ✅ transport_offers (عروض الناقلين) 
- ✅ transport_trips (رحلات النقل المؤكدة)
- ✅ transporter_profiles (ملفات الناقلين)
- ✅ transport_contracts (عقود النقل)

## بعد التشغيل الناجح:
- سيكون لديك نظام نقل كامل مع عمولة 10%
- تطبيق النقل سيعمل مع قاعدة البيانات
- يمكن اختبار النظام من الشاشات الثلاث
