-- =====================================================================
-- Kistly 0008_fix_project_delete
--
-- Gefunden vom Smoketest: ein Umzug liess sich nicht loeschen.
--
-- Beim Loeschen eines Projekts raeumt Postgres die Mitgliedschaften per
-- Fremdschluessel mit ab. Dabei feuerte guard_last_owner und brach mit
-- "Das Projekt braucht mindestens einen Besitzer" ab. Da jedes Projekt
-- genau einen Besitzer hat, war Loeschen damit nie moeglich.
--
-- Der Waechter soll nur greifen, wenn jemand eine einzelne Mitgliedschaft
-- entfernt. Verschwindet das Projekt selbst, ist die Zeile ohnehin
-- gegenstandslos. Beim Kaskadenloeschen ist die Projektzeile bereits weg,
-- wenn dieser Trigger laeuft, daran erkennt man den Fall.
-- =====================================================================

create or replace function public.guard_last_owner()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_owners int;
begin
  if not exists (select 1 from public.projects where id = old.project_id) then
    return old;  -- das ganze Projekt wird geloescht, nichts zu schuetzen
  end if;

  if old.role = 'owner' then
    select count(*) into v_owners from public.project_members
    where project_id = old.project_id and role = 'owner';
    if v_owners <= 1 then
      raise exception 'Das Projekt braucht mindestens einen Besitzer'
        using errcode = 'check_violation';
    end if;
  end if;
  return old;
end $fn$;
