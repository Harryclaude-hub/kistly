-- =====================================================================
-- Kistly 0009_keine_email_bestaetigung
--
-- Vorgabe: dieses Programm verlangt keine E-Mail-Bestaetigung.
--
-- Der Schalter dafuer sitzt in der Supabase-Oberflaeche (Authentication,
-- Sign In, Email, "Confirm email") und laesst sich nicht aus der Datenbank
-- heraus umlegen. Damit die Vorgabe trotzdem auf Datenbankebene gilt,
-- bestaetigt dieser Trigger jedes neue Konto sofort selbst.
--
-- Was das loest:
--   Ein Konto kann nie im Zustand "angelegt, aber nicht bestaetigt"
--   haengenbleiben. Auch wenn der Schalter oben wieder angeht oder das
--   Projekt neu aufgesetzt wird, kann man sich sofort anmelden.
--
-- Was das NICHT loest:
--   Steht der Schalter auf "Confirm email an", versucht Supabase beim
--   Registrieren weiterhin, eine Mail zu verschicken, und laeuft in
--   "email rate limit exceeded". Diese Absage kommt, bevor ueberhaupt eine
--   Zeile entsteht, also bevor dieser Trigger feuern koennte. Dagegen hilft
--   nur der Schalter selbst.
--
-- Bewusste Folge: eine Adresse wird nicht geprueft. Wer sich anmeldet, kann
-- eine fremde E-Mail eintragen. Fuer ein privates Umzugswerkzeug ist das so
-- gewollt, es soll aber nicht unausgesprochen bleiben.
-- =====================================================================

create or replace function public.auto_confirm_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;

  -- GoTrue liest diese Spalten in nicht-nullbare Felder. Bleiben sie NULL,
  -- scheitert das Anmelden mit "Database error querying schema".
  new.confirmation_token         := coalesce(new.confirmation_token, '');
  new.recovery_token             := coalesce(new.recovery_token, '');
  new.email_change_token_new     := coalesce(new.email_change_token_new, '');
  new.email_change_token_current := coalesce(new.email_change_token_current, '');
  new.email_change               := coalesce(new.email_change, '');

  return new;
end $fn$;

drop trigger if exists kistly_auto_confirm on auth.users;
create trigger kistly_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

revoke execute on function public.auto_confirm_user() from public, anon, authenticated;

-- Konten, die vor diesem Trigger angelegt wurden und noch warten, werden
-- mit nachgezogen. Sonst haengen genau die fest, wegen derer der Trigger
-- gebaut wurde.
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
