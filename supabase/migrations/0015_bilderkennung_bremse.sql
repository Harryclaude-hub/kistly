-- =====================================================================
-- Kistly 0015_bilderkennung_bremse
--
-- Jede Bildauswertung kostet echtes Geld, und zahlen tut der Besitzer des
-- Schluessels, nicht der, der tippt. Ohne Bremse kann ein Helfer mit
-- dreihundert Fotos eine ueberraschende Rechnung erzeugen.
--
-- Die Bremse ist darum kein Beiwerk, sondern die Bedingung dafuer, dass
-- man die Funktion ueberhaupt einschalten kann.
--
-- Mitgeschrieben wird auch das Modell, damit man hinterher nachrechnen
-- kann, statt zu raten.
-- =====================================================================

create table if not exists public.bild_lesen_log (
  id         bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  photo_id   uuid,
  modell     text,
  /* true, wenn wirklich beim Dienst gefragt wurde. Ein Treffer aus dem
   * Speicher kostet nichts und wird darum getrennt gezaehlt. */
  bezahlt    boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists bild_lesen_log_projekt_idx
  on public.bild_lesen_log(project_id, created_at desc);
create index if not exists bild_lesen_log_nutzer_idx
  on public.bild_lesen_log(user_id, created_at desc);

alter table public.bild_lesen_log enable row level security;

-- Lesen darf, wer im Umzug ist. So sieht jeder, wie viel schon
-- verbraucht wurde. Geschrieben wird nur mit dem Dienstschluessel.
drop policy if exists bild_log_select on public.bild_lesen_log;
create policy bild_log_select on public.bild_lesen_log for select to authenticated
  using (public.is_member(project_id));

-- Grenzen. Bewusst grosszuegig, aber wirksam.
create or replace function public.bild_lesen_rest(p_project uuid, p_user uuid)
returns table (rest_projekt integer, rest_nutzer integer)
language sql stable security definer set search_path = public as $fn$
  select
    greatest(0, 200 - (
      select count(*)::int from public.bild_lesen_log
      where project_id = p_project and bezahlt and created_at > now() - interval '1 day'
    )),
    greatest(0, 60 - (
      select count(*)::int from public.bild_lesen_log
      where user_id = p_user and bezahlt and created_at > now() - interval '1 hour'
    ));
$fn$;

revoke execute on function public.bild_lesen_rest(uuid, uuid) from public, anon;
grant  execute on function public.bild_lesen_rest(uuid, uuid) to service_role, authenticated;
