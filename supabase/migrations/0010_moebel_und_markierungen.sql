-- =====================================================================
-- Kistly 0010_moebel_und_markierungen
--
-- Moebel bekommen KEINE eigene Tabelle. Sie sind Eintraege in items mit
-- kind = 'furniture'. items haengt bereits an Zimmer, Person, Code,
-- Status, Fotos, Inhaltsliste, Scanner, Etiketten und Chat-Verweisen.
-- Eine zweite Tabelle haette jede dieser Verbindungen ein zweites Mal
-- gebraucht, und genau dort laufen zwei Fassungen auseinander.
--
-- Der Teilekatalog zum Nachzaehlen ist item_contents. Text, Menge, Haken,
-- das gibt es schon und passt genau.
-- =====================================================================

-- ------------------------------------------------- Angaben zum Moebel
alter table public.items add column if not exists hersteller  text;
alter table public.items add column if not exists modell      text;
alter table public.items add column if not exists masse       text;
alter table public.items add column if not exists zerlegt     boolean not null default false;

-- --------------------------------------------- Markieren wie in Excel
-- Eigene Spalten, nicht die Zimmerfarbe missbrauchen. Die Zimmerfarbe
-- gehoert dem Zimmer, die Markierung gehoert der einzelnen Zeile.
alter table public.items add column if not exists mark_color  text;
alter table public.items add column if not exists mark_symbol text;
alter table public.tags  add column if not exists symbol      text;

-- ------------------------------------------- Fotos und Aufbauanleitung
-- art trennt gewoehnliche Fotos von abfotografierten oder hochgeladenen
-- Anleitungen. seite haelt fest, welche Seite zu sehen ist.
alter table public.item_photos add column if not exists art   text not null default 'foto';
alter table public.item_photos add column if not exists seite text;

do $$ begin
  alter table public.item_photos
    add constraint item_photos_art_check check (art in ('foto','anleitung'));
exception when duplicate_object then null; end $$;

create index if not exists items_kind_idx on public.items(project_id, kind);
create index if not exists item_photos_art_idx on public.item_photos(item_id, art);

-- Anleitungen duerfen PDF sein.
update storage.buckets
set allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/heic','image/heif',
      'application/pdf'
    ],
    file_size_limit = 26214400
where id = 'item-photos';

-- ------------------------------------------------ Zimmer zusammenfuehren
-- Alles vom einen Bereich auf den anderen umhaengen und den leeren
-- Bereich entfernen. Atomar, damit nie ein halber Zustand stehen bleibt.
-- Die Codes werden dabei vom items-Trigger neu vergeben, die alten
-- landen wie immer in item_code_history und bleiben scannbar.
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

  if t_von.id is null or t_nach.id is null then
    raise exception 'Bereich nicht gefunden' using errcode = 'no_data_found';
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
  if not public.is_editor(t_von.project_id) then
    raise exception 'Keine Berechtigung fuer diesen Umzug' using errcode = 'insufficient_privilege';
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
