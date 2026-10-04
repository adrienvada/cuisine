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

-- 4. Migration : contrôle de version à l'écriture (idempotente) ---------------------
-- À exécuter une fois, seule, sur un projet déjà en service (le reste du fichier
-- n'est à rejouer que pour une première installation : le bloc 1 efface les
-- anciennes fonctions). L'application relit le serveur, fusionne, puis écrit en
-- donnant la version qu'elle a vue (p_vu) : si quelqu'un a écrit entre-temps, rien
-- n'est écrit et { "ok": false, "updated_at": … } revient, l'appareil refusionne et
-- réessaie. p_vu est null tant que la table est vide. L'ancienne fonction à deux
-- arguments reste en place : une appli pas encore à jour, ou un serveur pas encore
-- migré, continuent de fonctionner.
create or replace function public.carnet_ecrire(p_mdp text, p_data jsonb, p_vu timestamptz)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare t timestamptz; actuel timestamptz; existe boolean;
begin
  perform carnet_verifier(p_mdp);
  -- Verrou sur la ligne : deux écritures simultanées passent l'une après l'autre.
  select c.updated_at, true into actuel, existe from carnet c where c.id = 1 for update;
  if existe then
    if p_vu is distinct from actuel then
      return jsonb_build_object('ok', false, 'updated_at', actuel);
    end if;
    update carnet c set data = p_data, updated_at = now() where c.id = 1 returning c.updated_at into t;
  else
    if p_vu is not null then
      return jsonb_build_object('ok', false, 'updated_at', null);
    end if;
    insert into carnet (id, data, updated_at) values (1, p_data, now())
    on conflict (id) do nothing
    returning carnet.updated_at into t;
    if t is null then                          -- une autre écriture initiale vient de passer
      return jsonb_build_object('ok', false, 'updated_at', (select c.updated_at from carnet c where c.id = 1));
    end if;
  end if;
  return jsonb_build_object('ok', true, 'updated_at', t);
end $$;

revoke all on function public.carnet_ecrire(text, jsonb, timestamptz) from public;
grant execute on function public.carnet_ecrire(text, jsonb, timestamptz) to anon;
