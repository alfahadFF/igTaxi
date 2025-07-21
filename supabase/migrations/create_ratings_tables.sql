-- تأكد من عدم وجود الجداول قبل الإنشاء
create table if not exists driver_ratings (
    id uuid default uuid_generate_v4() primary key,
    driver_id uuid references driver_profiles(id) on delete cascade,
    customer_id uuid references profiles(id) on delete set null,
    trip_id uuid,
    rating decimal(2,1) not null check (rating >= 1 and rating <= 5),
    service_quality int check (service_quality >= 1 and service_quality <= 5),
    vehicle_cleanliness int check (vehicle_cleanliness >= 1 and vehicle_cleanliness <= 5),
    punctuality int check (punctuality >= 1 and punctuality <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists driver_loyalty_points (
    id uuid default uuid_generate_v4() primary key,
    driver_id uuid references driver_profiles(id) on delete cascade unique,
    points integer default 0,
    level text default 'bronze' check (level in ('bronze', 'silver', 'gold', 'platinum')),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists driver_points_history (
    id uuid default uuid_generate_v4() primary key,
    driver_id uuid references driver_profiles(id) on delete cascade,
    points_change integer not null,
    reason text not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- إضافة عمود customer_id لجدول التقييمات
alter table driver_ratings 
add column if not exists customer_id uuid references profiles(id) on delete set null;

-- إضافة فهرس للعمود الجديد
create index if not exists idx_driver_ratings_customer_id on driver_ratings(customer_id);

-- إضافة Row Level Security (RLS)
alter table driver_ratings enable row level security;
alter table driver_loyalty_points enable row level security;
alter table driver_points_history enable row level security;

-- التأكد من إضافة الفهارس المهمة
create index if not exists idx_driver_ratings_driver_id on driver_ratings(driver_id);
create index if not exists idx_driver_ratings_trip_id on driver_ratings(trip_id);
create index if not exists idx_driver_points_history_driver_id on driver_points_history(driver_id);

-- سياسات الأمان
create policy "Public read access to driver ratings"
on driver_ratings for select
using (true);

create policy "Customers can create ratings"
on driver_ratings for insert
with check (auth.uid() = customer_id);

create policy "Drivers can view their own loyalty points"
on driver_loyalty_points for select
using (auth.uid() = driver_id);

create policy "System can manage loyalty points"
on driver_loyalty_points for all
using (auth.role() = 'service_role');

create policy "Drivers can view their points history"
on driver_points_history for select
using (auth.uid() = driver_id);

-- Functions لتحديث النقاط ومستوى الولاء
create or replace function update_driver_loyalty_level()
returns trigger as $$
begin
    update driver_loyalty_points
    set level = case
        when points >= 10000 then 'platinum'
        when points >= 5000 then 'gold'
        when points >= 1000 then 'silver'
        else 'bronze'
    end
    where id = new.id;
    return new;
end;
$$ language plpgsql;

-- Trigger لتحديث مستوى الولاء تلقائياً
create trigger update_loyalty_level
after update of points on driver_loyalty_points
for each row
execute function update_driver_loyalty_level();
