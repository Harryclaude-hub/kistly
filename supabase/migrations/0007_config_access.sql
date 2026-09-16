-- =====================================================================
-- Kistly 0007_config_access
-- Das Schema private haengt bewusst nicht an der REST-Schnittstelle.
-- Damit die Edge Function trotzdem an die Schluessel kommt, gibt es genau
-- eine Funktion im offenen Schema, und die darf nur der Dienstschluessel
-- aufrufen.
-- =====================================================================

create or replace function public.app_config()
returns table (key text, value text)
language sql stable security definer set search_path = public as $fn$
  select c.key, c.value from private.config c;
$fn$;

revoke execute on function public.app_config() from public, anon, authenticated;
grant  execute on function public.app_config() to service_role;
