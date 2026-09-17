-- =====================================================================
-- Kistly 0011_markierungen_pruefen_und_merge_absichern
--
-- Zwei Loecher aus der Gegenpruefung von 0010:
--
-- 1. mark_symbol, tags.symbol und mark_color waren freier Text ohne
--    Pruefung. Stand dort etwas Unbekanntes, reagierten drei Stellen in
--    der Oberflaeche unterschiedlich: einmal verschwand das Zeichen
--    spurlos, einmal stand woertlich "marken.symbol_sofa" auf dem
--    Schirm, und eine ungueltige Farbe galt als gesetzt, war aber
--    unsichtbar. item_photos.art hatte seine Pruefung schon, diese drei
--    Spalten nicht.
--
-- 2. merge_tags laeuft als security definer, die Zeilen-Sicherheit ist
--    darin also ausser Kraft. Die Funktion beantwortete vier Fragen
--    ueber fremde Bereiche, bevor sie ueberhaupt die Berechtigung
--    pruefte. An den unterschiedlichen Fehlermeldungen liess sich
--    ablesen, ob eine fremde Kennung existiert, zu welchem fremden Umzug
--    sie gehoert und ob sie Zimmer oder Person ist.
-- =====================================================================

-- --------------------------------------------- 1. Markierungen pruefen
do $$ begin
  alter table public.items
    add constraint items_mark_symbol_check
    check (mark_symbol is null or mark_symbol in
      ('stern','haken','achtung','herz','flagge','kreis','blitz','schloss'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.items
    add constraint items_mark_color_check
    check (mark_color is null or mark_color ~ '^#[0-9A-Fa-f]{6}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.tags
    add constraint tags_symbol_check
    check (symbol is null or symbol in
      ('stern','haken','achtung','herz','flagge','kreis','blitz','schloss'));
exception when duplicate_object then null; end $$;

-- ------------------------------------------ 2. merge_tags absichern
-- Die Berechtigung wird gleich nach dem Lesen geprueft und VOR jeder
-- Auskunft. Fehlt sie, oder gibt es den Bereich nicht, kommt dieselbe
-- Antwort. So verraet die Funktion nichts ueber fremde Umzuege.
create or replace function public.merge_tags(p_von uuid, p_nach uuid)
returns integer
language plpgsql security definer set search_path = public as $fn$
declare
  t_von  public.tags;
  t_nach public.tags;
  v_zahl integer := 0;
begin
  select * into t_von  from public.tags where id = p_von;
  select * into t_nach from public.tags where id = p_nach;

  -- Erst die Berechtigung, dann alles andere. Ein Bereich, den man nicht
  -- sehen darf, und ein Bereich, den es nicht gibt, sind von aussen
  -- nicht zu unterscheiden.
  if t_von.id is null or t_nach.id is null
     or not public.is_editor(t_von.project_id)
     or not public.is_editor(t_nach.project_id) then
    raise exception 'Keine Berechtigung fuer diesen Umzug'
      using errcode = 'insufficient_privilege';
  end if;

  if t_von.id = t_nach.id then
    raise exception 'Quelle und Ziel sind derselbe Bereich' using errcode = 'check_violation';
  end if;
  if t_von.project_id <> t_nach.project_id then
    raise exception 'Bereiche gehoeren zu verschiedenen Umzuegen' using errcode = 'check_violation';
  end if;
  if t_von.kind <> t_nach.kind then
    raise exception 'Zimmer und Person lassen sich nicht zusammenfuehren'
      using errcode = 'check_violation';
  end if;

  if t_von.kind = 'room' then
    update public.items set room_id = p_nach where room_id = p_von;
  else
    update public.items set person_id = p_nach where person_id = p_von;
  end if;
  get diagnostics v_zahl = row_count;

  delete from public.tags where id = p_von;
  return v_zahl;
end $fn$;

revoke execute on function public.merge_tags(uuid, uuid) from public, anon;
grant  execute on function public.merge_tags(uuid, uuid) to authenticated;

-- Index fuer die Markierungsfilter der Ausgabeseite.
create index if not exists items_mark_idx
  on public.items(project_id)
  where mark_color is not null or mark_symbol is not null;
