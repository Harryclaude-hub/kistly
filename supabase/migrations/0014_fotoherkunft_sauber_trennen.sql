-- =====================================================================
-- Kistly 0014_fotoherkunft_sauber_trennen
--
-- Korrektur zu 0013. Dort wurde inherit_project_from_item umgebaut, damit
-- sie auch ein Foto am Zimmer versteht. Zwei Fehler steckten darin:
--
-- 1. Die neue Fassung setzte project_id nur, wenn es noch leer war. Das
--    Original ueberschreibt es IMMER, und genau darum geht es: die RLS
--    haengt an project_id, und was der Client schickt, darf nie zaehlen.
--    Die abgeschwaechte Fassung haette ein mitgeschicktes project_id
--    durchgelassen.
-- 2. Dieselbe Funktion haengt an item_contents, und diese Tabelle hat
--    keine Spalte tag_id. Das ging nur gut, weil Postgres den Ausdruck
--    abkuerzt. Darauf soll sich niemand verlassen muessen.
--
-- Darum jetzt zwei Funktionen, die zwei verschiedene Fragen beantworten.
-- =====================================================================

-- Wieder wie im Original: project_id kommt aus der Kiste, immer.
create or replace function public.inherit_project_from_item()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_project uuid;
begin
  select project_id into v_project from public.items where id = new.item_id;
  if v_project is null then
    raise exception 'Kiste % existiert nicht', new.item_id using errcode = 'foreign_key_violation';
  end if;
  new.project_id := v_project;
  return new;
end $fn$;

-- Ein Foto haengt entweder an einer Kiste oder an einem Bereich. Der
-- Umzug kommt von dort, nie vom Client.
create or replace function public.inherit_project_photo()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_project uuid;
begin
  if new.item_id is not null then
    select project_id into v_project from public.items where id = new.item_id;
  elsif new.tag_id is not null then
    select project_id into v_project from public.tags where id = new.tag_id;
  end if;
  if v_project is null then
    raise exception 'Weder Kiste noch Bereich gefunden'
      using errcode = 'foreign_key_violation';
  end if;
  new.project_id := v_project;
  return new;
end $fn$;

drop trigger if exists item_photos_project on public.item_photos;
create trigger item_photos_project before insert on public.item_photos
  for each row execute function public.inherit_project_photo();
