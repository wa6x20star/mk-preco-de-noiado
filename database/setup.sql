-- Run ONLY in the dedicated MK Supabase project, through the SQL Editor.
-- This script creates no admin. With an empty allowlist nobody can modify the catalog.
begin;
create table public.mk_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.mk_admins enable row level security;
revoke all on public.mk_admins from anon, authenticated;
grant select on public.mk_admins to authenticated;
create policy mk_admin_can_read_own_access on public.mk_admins for select to authenticated
 using(user_id=(select auth.uid()));

create table public.mk_products (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 1 and 80),
 price numeric(8,2) not null check(price>0 and price<=999999),
 category text not null check(category in ('Eletrônicos','Moda','Casa')),
 condition text not null check(condition in ('Novo','Seminovo','Usado')),
 description text not null default '' check(length(description)<=500),
 photo_path text not null check(photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
 unique_item boolean not null default true,
 sold boolean not null default false,
 created_at timestamptz not null default now()
);
create index mk_products_created_at on public.mk_products(created_at desc,id desc);
alter table public.mk_products enable row level security;
revoke all on public.mk_products from anon, authenticated;
grant select on public.mk_products to anon,authenticated;
grant insert,update,delete on public.mk_products to authenticated;
create policy mk_public_catalog on public.mk_products for select to anon,authenticated using(true);
create policy mk_admin_insert on public.mk_products for insert to authenticated
 with check(exists(select 1 from public.mk_admins where user_id=(select auth.uid())) and split_part(photo_path,'/',1)=(select auth.uid())::text);
create policy mk_admin_update on public.mk_products for update to authenticated
 using(exists(select 1 from public.mk_admins where user_id=(select auth.uid())))
 with check(exists(select 1 from public.mk_admins where user_id=(select auth.uid())) and split_part(photo_path,'/',1)=(select auth.uid())::text);
create policy mk_admin_delete on public.mk_products for delete to authenticated
 using(exists(select 1 from public.mk_admins where user_id=(select auth.uid())));

create table public.mk_settings (
 id integer primary key check(id=1),
 phone text not null default '' check(phone='' or phone ~ '^55[0-9]{10,11}$')
);
insert into public.mk_settings(id) values(1);
alter table public.mk_settings enable row level security;
revoke all on public.mk_settings from anon,authenticated;
grant select on public.mk_settings to anon,authenticated;
grant update on public.mk_settings to authenticated;
create policy mk_public_contact on public.mk_settings for select to anon,authenticated using(true);
create policy mk_admin_contact on public.mk_settings for update to authenticated
 using(exists(select 1 from public.mk_admins where user_id=(select auth.uid())))
 with check(exists(select 1 from public.mk_admins where user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('mk-products','mk-products',true,2097152,array['image/jpeg']);
create policy mk_admin_photo_upload on storage.objects for insert to authenticated
 with check(bucket_id='mk-products' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.mk_admins where user_id=(select auth.uid())));
create policy mk_admin_photo_select on storage.objects for select to authenticated
 using(bucket_id='mk-products' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.mk_admins where user_id=(select auth.uid())));
create policy mk_admin_photo_delete on storage.objects for delete to authenticated
 using(bucket_id='mk-products' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.mk_admins where user_id=(select auth.uid())));
commit;

-- AFTER creating the MK user in Authentication > Users, run separately:
-- insert into public.mk_admins(user_id) values ('REPLACE_WITH_MK_USER_UUID');
-- Put the SAME UUID in the MK_ADMIN_USER_ID environment variable in Vercel.
