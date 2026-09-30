/* Projet Supabase qui porte la synchronisation (voir supabase/carnet.sql).
   L'URL et la clé « anon » sont publiques par nature : ce qui protège les données,
   c'est le code du foyer. Tant que ces deux champs sont vides, rien ne se synchronise. */
const SYNC_CONFIG = { url: "", anonKey: "" };
