-- =====================================================================
-- Kistly 0013_bilderkennung
--
-- Fotos werden von einer Bilderkennung ausgewertet, damit man den Inhalt
-- einer Kiste nicht von Hand abtippen muss.
--
-- Drei Dinge:
-- 1. Auch ein Zimmer darf Fotos haben. Bisher hing jedes Foto an einer
--    Kiste. item_photos bekommt darum tag_id, und genau eines von
--    item_id und tag_id ist gesetzt. Eine zweite Fototabelle waere eine
--    zweite Fassung derselben Regeln.
-- 2. photo_analyses haelt fest, was die Erkennung zu einem Bild gesagt
--    hat. Das Ergebnis bleibt liegen, damit dasselbe Bild nicht zweimal
--    Geld kostet, und damit nachvollziehbar ist, woher ein Eintrag kommt.
-- 3. item_contents bekommt quelle. Wer die Liste liest, sieht, was von
--    Hand eingetragen wurde und was ein Vorschlag der Erkennung war.
--
-- ACHTUNG: der Umbau von inherit_project_from_item in dieser Migration
-- war falsch und wird in 0014 zurueckgenommen. Er steht hier trotzdem,
-- weil eine Migration festhaelt, was wirklich passiert ist.
-- =====================================================================

-- --------------------------------------------------- 1. Fotos am Zimmer
alter table public.item_photos alter column item_id drop not null;
alter table public.item_photos add column if not exists tag_id uuid
  references public.tags(id) on delete cascade;

do $$ begin
  alter table public.item_photos
    add constraint item_photos_ziel_check
    check (num_nonnulls(item_id, tag_id) = 1);
exception when duplicate_object then null; end $$;

create index if not exists item_photos_tag_idx on public.item_photos(tag_id, created_at)
  where tag_id is not null;

create or replace function public.inherit_project_from_item()
returns trigger language plpgsql as $fn$
begin
  if new.project_id is null then
    if new.item_id is not null then
      select project_id into new.project_id from public.items where id = new.item_id;
    elsif to_jsonb(new) ? 'tag_id' and new.tag_id is not null then
      select project_id into new.project_id from public.tags where id = new.tag_id;
    end if;
  end if;
  if new.project_id is null then
    raise exception 'Kein Umzug zu diesem Eintrag gefunden' using errcode = 'not_null_violation';
  end if;
  return new;
end $fn$;

alter function public.inherit_project_from_item() set search_path = public;

-- ------------------------------------------- 2. Ergebnisse der Erkennung
create table if not exists public.photo_analyses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  photo_id    uuid not null references public.item_photos(id) on delete cascade,
  -- Die Sprache, in der die Erkennung geantwortet hat. Dasselbe Bild kann
  -- einmal auf Deutsch und einmal auf Arabisch ausgewertet sein.
  sprache     text not null check (sprache in ('de','ar')),
  status      text not null default 'fertig' check (status in ('fertig','fehler')),
  modell      text,
  -- Die erkannten Dinge, so wie das Modell sie geliefert hat. Roh, damit
  -- man spaeter nachsehen kann, was wirklich zurueckkam.
  ergebnis    jsonb not null default '[]'::jsonb,
  fehler      text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Dasselbe Bild in derselben Sprache wird nur einmal ausgewertet.
create unique index if not exists photo_analyses_einmal
  on public.photo_analyses(photo_id, sprache);
create index if not exists photo_analyses_project_idx
  on public.photo_analyses(project_id, created_at desc);

alter table public.photo_analyses enable row level security;

drop policy if exists analyses_select on public.photo_analyses;
create policy analyses_select on public.photo_analyses for select to authenticated
  using (public.is_member(project_id));

-- Geschrieben wird nur von der Edge Function mit dem Dienstschluessel.
-- Loeschen darf, wer bearbeiten darf, damit man eine Erkennung
-- wiederholen kann.
drop policy if exists analyses_delete on public.photo_analyses;
create policy analyses_delete on public.photo_analyses for delete to authenticated
  using (public.is_editor(project_id));

-- ------------------------------------------------- 3. Woher ein Eintrag kommt
alter table public.item_contents add column if not exists quelle text not null default 'hand';

do $$ begin
  alter table public.item_contents
    add constraint item_contents_quelle_check check (quelle in ('hand','bild'));
exception when duplicate_object then null; end $$;
