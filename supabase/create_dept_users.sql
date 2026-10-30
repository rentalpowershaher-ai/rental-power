-- شغّله مرة واحدة في SQL Editor (بعد schema_update.sql)
-- بينشئ 8 حسابات ويربطها بالأقسام. كلمة السر = RP@ + الرقم القديم + !
create extension if not exists pgcrypto with schema extensions;

do $$
declare d record; uid uuid; mail text;
begin
  for d in select * from (values
    ('general','8956'),('finance','4287'),('marketing','8573'),('purchasing','5719'),
    ('warehouse','6183'),('maintenance','9437'),('equipment','9371'),('hr','6384')
  ) as t(dept, pin)
  loop
    mail := d.dept || '@rentalpower.app';
    select id into uid from auth.users where email = mail;
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
        raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
        confirmation_token,email_change,email_change_token_new,recovery_token)
      values ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',mail,
        extensions.crypt('RP@'||d.pin||'!', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
      insert into auth.identities (id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
      values (gen_random_uuid(),uid,uid::text,
        jsonb_build_object('sub',uid::text,'email',mail,'email_verified',true),'email',now(),now(),now());
    else
      update auth.users set encrypted_password = extensions.crypt('RP@'||d.pin||'!', extensions.gen_salt('bf')), updated_at = now() where id = uid;
    end if;
    insert into profiles(user_id, dept) values (uid, d.dept)
      on conflict (user_id) do update set dept = excluded.dept;
  end loop;
end $$;
