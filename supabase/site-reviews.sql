-- Execute uma vez no SQL Editor do projeto Supabase antes de publicar o site.
create schema if not exists vethome_private;
revoke all on schema vethome_private from public, anon, authenticated;

create table public.site_reviews (
  id uuid primary key,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) <= 2000),
  created_at timestamptz not null default now()
);

create index site_reviews_created_at_idx on public.site_reviews (created_at desc, id desc);

create table vethome_private.site_review_secrets (
  review_id uuid primary key references public.site_reviews(id) on delete cascade,
  secret_hash bytea not null
);
revoke all on vethome_private.site_review_secrets from public, anon, authenticated;

alter table public.site_reviews enable row level security;
revoke all on public.site_reviews from public, anon, authenticated;
grant select on public.site_reviews to anon, authenticated;
create policy "Public can read site reviews" on public.site_reviews
  for select to anon, authenticated using (true);

create function public.create_site_review(
  review_id uuid, review_name text, review_rating smallint, review_comment text, delete_secret text
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if review_id is null or review_name is null
    or review_rating is null or review_rating not between 1 and 5
    or char_length(btrim(review_name)) not between 1 and 80
    or char_length(btrim(coalesce(review_comment, ''))) > 2000
    or delete_secret is null or delete_secret !~ '^[0-9a-f]{64}$' then
    raise exception 'Dados da avaliação inválidos';
  end if;

  insert into public.site_reviews (id, name, rating, comment)
    values (review_id, btrim(review_name), review_rating, btrim(coalesce(review_comment, '')));
  insert into vethome_private.site_review_secrets (review_id, secret_hash)
    values (review_id, pg_catalog.sha256(pg_catalog.convert_to(delete_secret, 'UTF8')));
end;
$$;

create function public.delete_site_review(review_id uuid, delete_secret text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  removed integer;
begin
  if review_id is null or delete_secret is null or delete_secret !~ '^[0-9a-f]{64}$' then
    raise exception 'Dados de exclusão inválidos';
  end if;

  delete from public.site_reviews r
  where r.id = review_id and exists (
    select 1 from vethome_private.site_review_secrets s
    where s.review_id = r.id
      and s.secret_hash = pg_catalog.sha256(pg_catalog.convert_to(delete_secret, 'UTF8'))
  );
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;

create function public.site_reviews_summary()
returns table (review_count bigint, average_rating numeric)
language sql stable security definer set search_path = ''
as $$
  select count(*), avg(rating) from public.site_reviews;
$$;

revoke all on function public.create_site_review(uuid, text, smallint, text, text) from public;
revoke all on function public.delete_site_review(uuid, text) from public;
revoke all on function public.site_reviews_summary() from public;
grant execute on function public.create_site_review(uuid, text, smallint, text, text) to anon, authenticated;
grant execute on function public.delete_site_review(uuid, text) to anon, authenticated;
grant execute on function public.site_reviews_summary() to anon, authenticated;

alter publication supabase_realtime add table public.site_reviews;
