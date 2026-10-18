-- Run this small update in the dedicated MK project's SQL Editor.
-- Safe to run again: existing labels, including deliberately empty ones, are preserved.
begin;
alter table public.mk_products add column if not exists badge_text text;
update public.mk_products
 set badge_text=case when unique_item then 'Peça única' else '' end
 where badge_text is null;
alter table public.mk_products alter column badge_text set default 'Preço de noiado';
alter table public.mk_products alter column badge_text set not null;
do $$
begin
 if not exists(select 1 from pg_constraint where conname='mk_products_badge_text_check' and conrelid='public.mk_products'::regclass) then
  alter table public.mk_products add constraint mk_products_badge_text_check
   check(char_length(badge_text)<=24 and badge_text !~ '[[:cntrl:]]');
 end if;
end $$;
commit;
