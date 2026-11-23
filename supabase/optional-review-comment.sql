-- Execute no SQL Editor do projeto que já usa site-reviews.sql.
begin;

alter table public.site_reviews drop constraint if exists site_reviews_comment_check;
alter table public.site_reviews add constraint site_reviews_comment_check
  check (char_length(btrim(comment)) <= 2000);

create or replace function public.create_site_review(
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

commit;
