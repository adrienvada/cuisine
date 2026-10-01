-- Carnet de cuisine partagé : UNE base pour tous, protégée par un mot de passe.
-- À exécuter dans le SQL Editor de Supabase, bloc par bloc (voir le README).
--
-- Le mot de passe n'est jamais stocké en clair (hash bcrypt) et il est vérifié
-- côté serveur à chaque lecture et chaque écriture. Les tables sont fermées à
-- l'API publique : seules les fonctions ci-dessous y touchent.

-- 1. Ménage de l'ancienne version (un foyer par code) et tables -----------------
drop function if exists public.carnet_lire(text);
drop function if exists public.carnet_ecrire(text, jsonb);
drop table if exists public.carnet_sync;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.carnet (
  id         int primary key default 1 check (id = 1),     -- une seule ligne
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.carnet_acces (
  id   int primary key default 1 check (id = 1),
  hash text not null
);
alter table public.carnet enable row level security;
alter table public.carnet_acces enable row level security;
revoke all on public.carnet, public.carnet_acces from anon, authenticated;

-- 2. Choisir le mot de passe (remplace MON_MOT_DE_PASSE) ------------------------
-- insert into public.carnet_acces (hash)
-- values (extensions.crypt('MON_MOT_DE_PASSE', extensions.gen_salt('bf')))
-- on conflict (id) do update set hash = excluded.hash;

-- 3. Fonctions ------------------------------------------------------------------
create or replace function public.carnet_verifier(p_mdp text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_mdp is null or not exists (select 1 from carnet_acces a where a.hash = crypt(p_mdp, a.hash)) then
    perform pg_sleep(1);                       -- freine les essais en rafale
    raise exception 'mot de passe incorrect';
  end if;
end $$;

create or replace function public.carnet_lire(p_mdp text)
returns table (data jsonb, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform carnet_verifier(p_mdp);
  return query select c.data, c.updated_at from carnet c;
end $$;

create or replace function public.carnet_ecrire(p_mdp text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public, extensions as $$
declare t timestamptz;
begin
  perform carnet_verifier(p_mdp);
  insert into carnet (id, data, updated_at) values (1, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now()
  returning carnet.updated_at into t;
  return t;
end $$;

revoke all on function public.carnet_verifier(text) from public, anon;
revoke all on function public.carnet_lire(text), public.carnet_ecrire(text, jsonb) from public;
grant execute on function public.carnet_lire(text), public.carnet_ecrire(text, jsonb) to anon;
