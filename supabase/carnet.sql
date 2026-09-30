-- Synchronisation du carnet de cuisine (menu, courses cochées, articles libres).
-- À coller une fois dans le SQL Editor de Supabase.
--
-- Pas de comptes : le « code du foyer » (une longue chaîne aléatoire, partagée par
-- lien) tient lieu de mot de passe. La table est fermée à l'API publique ; seules
-- ces deux fonctions y touchent, et il faut connaître le code pour les appeler.

create table if not exists public.carnet_sync (
  code       text primary key check (length(code) >= 20),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.carnet_sync enable row level security;   -- aucune policy : accès direct refusé
revoke all on public.carnet_sync from anon, authenticated;

create or replace function public.carnet_lire(p_code text)
returns table (data jsonb, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select s.data, s.updated_at from carnet_sync s where s.code = p_code and length(p_code) >= 20;
$$;

create or replace function public.carnet_ecrire(p_code text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if length(p_code) < 20 then raise exception 'code trop court'; end if;
  if pg_column_size(p_data) > 200000 then raise exception 'données trop volumineuses'; end if;
  insert into carnet_sync (code, data, updated_at) values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now()
  returning updated_at into t;
  return t;
end $$;

revoke all on function public.carnet_lire(text), public.carnet_ecrire(text, jsonb) from public;
grant execute on function public.carnet_lire(text), public.carnet_ecrire(text, jsonb) to anon;
