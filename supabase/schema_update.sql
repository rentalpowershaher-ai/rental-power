-- =====================================================================
-- Rental Power - تحديث قاعدة البيانات (شغّله مرة واحدة في SQL Editor)
-- يفترض أن الجداول الستة الأصلية موجودة بالفعل
-- =====================================================================

-- ---------- 1) الحسابات والأقسام ----------
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dept text not null check (dept in ('general','finance','marketing','purchasing','warehouse','maintenance','equipment','hr'))
);

create or replace function current_dept() returns text
language sql stable security definer set search_path = public as
$$ select dept from profiles where user_id = auth.uid() $$;

-- ---------- 2) جداول جديدة ----------
create table if not exists scrap_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text,
  condition text default 'مستعمل' check (condition in ('مستعمل','خردة','تالف')),
  quantity int not null default 1,
  est_price numeric(10,2) default 0,
  notes text,
  status text default 'معلق_المخزن',   -- معلق_المخزن | مقبول | مرفوض
  reject_reason text,
  added_by text,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  dept text not null,
  title text not null,
  body text,
  url text default '/',
  created_at timestamptz default now()
);
create index if not exists notifications_dept_idx on notifications(dept, created_at desc);

create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dept text not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- ---------- 3) دالة الإشعار ----------
create or replace function notify(p_dept text, p_title text, p_body text, p_url text default '/')
returns void language sql security definer set search_path = public as
$$ insert into notifications(dept,title,body,url) values (p_dept,p_title,p_body,p_url) $$;

-- ---------- 4) استلام طلب الشراء وإضافته للمخزون ----------
create or replace function receive_purchase(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r purchase_requests;
begin
  if current_dept() not in ('warehouse','general') then raise exception 'غير مسموح'; end if;
  select * into r from purchase_requests where id = p_id and status = 'مقبول' for update;
  if not found then raise exception 'الطلب غير جاهز للاستلام'; end if;

  update inventory set quantity = quantity + r.quantity, unit_price = r.unit_price
   where name = r.item_name and category = r.category;
  if not found then
    insert into inventory(code,name,category,quantity,min_alert,unit_price,supplier)
    values ('INV-' || upper(substr(gen_random_uuid()::text,1,6)), r.item_name, r.category,
            r.quantity, coalesce(r.min_alert,5), r.unit_price, r.supplier);
  end if;
  update purchase_requests set status = 'تم_الاستلام' where id = p_id;
end $$;

-- ---------- 5) Triggers: كل حدث = إشعار لقسم ----------
-- طلبات الشراء
create or replace function trg_purchase_ins() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify('warehouse','🛒 طلب شراء جديد', new.item_name||' – كمية '||new.quantity);
  return new;
end $$;
drop trigger if exists purchase_ins on purchase_requests;
create trigger purchase_ins after insert on purchase_requests for each row execute function trg_purchase_ins();

create or replace function trg_purchase_upd() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'معلق_المالية' then
      perform notify('finance','💰 طلب شراء بانتظار موافقتك', new.item_name||' – '||new.total_price||' ج.م');
      perform notify('purchasing','✅ المخزن وافق على طلبك', new.item_name);
    elsif new.status = 'مرفوض' then
      perform notify('purchasing','❌ تم رفض طلب الشراء', new.item_name||coalesce(' – السبب: '||new.reject_reason,''));
    elsif new.status = 'مقبول' then
      perform notify('warehouse','📦 المالية وافقت – جاهز للاستلام', new.item_name||' – كمية '||new.quantity);
      perform notify('purchasing','✅ المالية وافقت على طلبك', new.item_name);
    elsif new.status = 'تم_الاستلام' then
      perform notify('purchasing','📥 تم استلام الطلب بالمخزن', new.item_name);
      perform notify('general','📥 تم استلام طلب شراء', new.item_name||' – '||new.total_price||' ج.م');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists purchase_upd on purchase_requests;
create trigger purchase_upd after update on purchase_requests for each row execute function trg_purchase_upd();

-- طلبات الإصلاح (الصيانة -> المالية)
create or replace function trg_repair_ins() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify('finance','🔧 طلب إصلاح من الصيانة', new.part_name||' ('||coalesce(new.equipment_code,'')||') – '||new.cost||' ج.م');
  perform notify('general','🔧 طلب إصلاح جديد', new.part_name||' – '||new.cost||' ج.م');
  return new;
end $$;
drop trigger if exists repair_ins on repair_requests;
create trigger repair_ins after insert on repair_requests for each row execute function trg_repair_ins();

create or replace function trg_repair_upd() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'مقبول' then
      perform notify('maintenance','✅ المالية وافقت على الإصلاح', new.part_name||' ('||coalesce(new.equipment_code,'')||')');
    elsif new.status = 'مرفوض' then
      perform notify('maintenance','❌ تم رفض طلب الإصلاح', new.part_name||coalesce(' – السبب: '||new.reject_reason,''));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists repair_upd on repair_requests;
create trigger repair_upd after update on repair_requests for each row execute function trg_repair_upd();

-- تغيير الزيت
create or replace function trg_oil_ins() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify('equipment','🛢️ تم تغيير زيت معدة', new.equipment_code||' – التغيير القادم عند '||new.next_hours||' ساعة');
  return new;
end $$;
drop trigger if exists oil_ins on oil_changes;
create trigger oil_ins after insert on oil_changes for each row execute function trg_oil_ins();

-- حالة المعدات
create or replace function trg_equipment_upd() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'في المخزن للصيانة' then
      perform notify('maintenance','⚠️ معدة وصلت للصيانة', new.name||' ('||new.code||')');
    elsif new.status = 'جاهز للعمل' then
      perform notify('marketing','⚡ معدة جاهزة للتأجير', new.name||' ('||new.code||') – '||new.power);
      perform notify('equipment','✅ معدة أصبحت جاهزة', new.name||' ('||new.code||')');
    elsif new.status = 'مؤجر' then
      perform notify('general','📋 معدة تم تأجيرها', new.name||' ('||new.code||')');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists equipment_upd on equipment;
create trigger equipment_upd after update on equipment for each row execute function trg_equipment_upd();

-- نفاد المخزون
create or replace function trg_inventory_low() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.quantity <= new.min_alert and (old.quantity is null or old.quantity > old.min_alert or old.min_alert is distinct from new.min_alert) then
    perform notify('warehouse','⚠️ صنف شارف على النفاد', new.name||' – المتبقي '||new.quantity);
    perform notify('purchasing','⚠️ صنف شارف على النفاد', new.name||' – المتبقي '||new.quantity);
    perform notify('general','⚠️ صنف شارف على النفاد', new.name||' – المتبقي '||new.quantity);
  end if;
  return new;
end $$;
drop trigger if exists inventory_low on inventory;
create trigger inventory_low after update on inventory for each row execute function trg_inventory_low();

-- الخردة والمستعمل
create or replace function trg_scrap_ins() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'معلق_المخزن' then
    perform notify('warehouse','♻️ طلب إضافة للخردة/المستعمل', new.name||' – كمية '||new.quantity);
  end if;
  return new;
end $$;
drop trigger if exists scrap_ins on scrap_items;
create trigger scrap_ins after insert on scrap_items for each row execute function trg_scrap_ins();

create or replace function trg_scrap_upd() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'مقبول' then
      perform notify('purchasing','✅ المخزن قبل صنف الخردة', new.name);
    elsif new.status = 'مرفوض' then
      perform notify('purchasing','❌ المخزن رفض صنف الخردة', new.name||coalesce(' – السبب: '||new.reject_reason,''));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists scrap_upd on scrap_items;
create trigger scrap_upd after update on scrap_items for each row execute function trg_scrap_upd();

-- ---------- 6) تنبيه موعد الزيت (يومياً) ----------
create or replace function check_oil_alerts() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select e.code, e.name, e.hours_meter, o.next_hours
    from equipment e
    join lateral (select * from oil_changes where equipment_code = e.code order by created_at desc limit 1) o on true
    where e.hours_meter >= o.next_hours - 25 or current_date >= o.alert_date
  loop
    perform notify('maintenance','⏰ موعد تغيير زيت', r.name||' ('||r.code||') – العداد '||r.hours_meter||' / '||r.next_hours);
    perform notify('equipment','⏰ موعد تغيير زيت', r.name||' ('||r.code||') – العداد '||r.hours_meter||' / '||r.next_hours);
  end loop;
end $$;

-- فعّل الإضافة من Database > Extensions ثم شغّل السطر التالي:
-- select cron.schedule('oil-alerts', '0 6 * * *', 'select check_oil_alerts()');

-- ---------- 7) الأمان RLS ----------
alter table profiles enable row level security;
alter table equipment enable row level security;
alter table inventory enable row level security;
alter table employees enable row level security;
alter table purchase_requests enable row level security;
alter table repair_requests enable row level security;
alter table oil_changes enable row level security;
alter table scrap_items enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;

-- profiles
drop policy if exists p_profiles_sel on profiles;
create policy p_profiles_sel on profiles for select to authenticated using (user_id = auth.uid());

-- القراءة لكل مسجّل (ماعدا الموظفين)
do $$ declare t text; begin
  foreach t in array array['equipment','inventory','purchase_requests','repair_requests','oil_changes','scrap_items'] loop
    execute format('drop policy if exists p_%1$s_sel on %1$s', t);
    execute format('create policy p_%1$s_sel on %1$s for select to authenticated using (current_dept() is not null)', t);
  end loop;
end $$;

-- equipment
drop policy if exists p_equipment_ins on equipment;
drop policy if exists p_equipment_upd on equipment;
drop policy if exists p_equipment_del on equipment;
create policy p_equipment_ins on equipment for insert to authenticated with check (current_dept() in ('equipment','general'));
create policy p_equipment_upd on equipment for update to authenticated using (current_dept() in ('equipment','general','maintenance'));
create policy p_equipment_del on equipment for delete to authenticated using (current_dept() in ('equipment','general'));

-- inventory
drop policy if exists p_inventory_ins on inventory;
drop policy if exists p_inventory_upd on inventory;
drop policy if exists p_inventory_del on inventory;
create policy p_inventory_ins on inventory for insert to authenticated with check (current_dept() in ('warehouse','general'));
create policy p_inventory_upd on inventory for update to authenticated using (current_dept() in ('warehouse','general'));
create policy p_inventory_del on inventory for delete to authenticated using (current_dept() in ('warehouse','general'));

-- employees (بيانات حساسة: HR والمدير فقط)
drop policy if exists p_employees_all on employees;
create policy p_employees_all on employees for all to authenticated
  using (current_dept() in ('hr','general')) with check (current_dept() in ('hr','general'));

-- purchase_requests
drop policy if exists p_pr_ins on purchase_requests;
drop policy if exists p_pr_upd on purchase_requests;
create policy p_pr_ins on purchase_requests for insert to authenticated
  with check (current_dept() in ('purchasing','general') and status = 'معلق_المخزن');
create policy p_pr_upd on purchase_requests for update to authenticated
  using (current_dept() in ('warehouse','finance','general'));

-- repair_requests
drop policy if exists p_rr_ins on repair_requests;
drop policy if exists p_rr_upd on repair_requests;
create policy p_rr_ins on repair_requests for insert to authenticated
  with check (current_dept() in ('maintenance','general') and status = 'معلق_المالية');
create policy p_rr_upd on repair_requests for update to authenticated
  using (current_dept() in ('finance','general'));

-- oil_changes
drop policy if exists p_oil_ins on oil_changes;
create policy p_oil_ins on oil_changes for insert to authenticated
  with check (current_dept() in ('maintenance','equipment','general'));

-- scrap_items
drop policy if exists p_scrap_ins_pur on scrap_items;
drop policy if exists p_scrap_ins_wh on scrap_items;
drop policy if exists p_scrap_upd on scrap_items;
create policy p_scrap_ins_pur on scrap_items for insert to authenticated
  with check (current_dept() = 'purchasing' and status = 'معلق_المخزن');
create policy p_scrap_ins_wh on scrap_items for insert to authenticated
  with check (current_dept() in ('warehouse','general'));
create policy p_scrap_upd on scrap_items for update to authenticated
  using (current_dept() in ('warehouse','general'));

-- notifications: كل قسم يرى إشعاراته فقط
drop policy if exists p_notif_sel on notifications;
create policy p_notif_sel on notifications for select to authenticated using (dept = current_dept());

-- push_subscriptions: الجهاز الخاص بالمستخدم فقط
drop policy if exists p_push_sel on push_subscriptions;
drop policy if exists p_push_ins on push_subscriptions;
drop policy if exists p_push_upd on push_subscriptions;
drop policy if exists p_push_del on push_subscriptions;
create policy p_push_sel on push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy p_push_ins on push_subscriptions for insert to authenticated with check (user_id = auth.uid() and dept = current_dept());
create policy p_push_upd on push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and dept = current_dept());
create policy p_push_del on push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- ---------- 8) Realtime ----------
do $$ declare t text; begin
  foreach t in array array['notifications','equipment','inventory','employees','purchase_requests','repair_requests','oil_changes','scrap_items'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ---------- 9) ربط المستخدمين بالأقسام ----------
-- بعد إنشاء 8 مستخدمين من Authentication > Users بالإيميلات:
-- general@rentalpower.app, finance@..., marketing@..., purchasing@..., warehouse@..., maintenance@..., equipment@..., hr@...
-- شغّل:
-- insert into profiles(user_id, dept)
-- select id, split_part(email,'@',1) from auth.users where email like '%@rentalpower.app'
-- on conflict (user_id) do update set dept = excluded.dept;
