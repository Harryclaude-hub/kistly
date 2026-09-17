-- =====================================================================
-- Kistly 0012_deckbild
--
-- Jede Kiste und jedes Moebelstueck bekommt ein Deckbild. Es ist das
-- Bild, das beim Scannen sofort erscheint, damit man ohne Lesen erkennt,
-- was man in der Hand haelt.
--
-- Das Deckbild ist ein Verweis auf ein vorhandenes Foto, kein zweiter
-- Pfad. Ein zweiter Pfad waere eine zweite Fassung derselben Angabe:
-- man loescht das Foto und das Deckbild zeigt ins Leere.
-- =====================================================================

alter table public.items
  add column if not exists cover_photo_id uuid
  references public.item_photos(id) on delete set null;

-- Ein Deckbild muss zu DIESER Kiste gehoeren. Ein Check-Constraint kann
-- das nicht pruefen, weil es dafuer in eine andere Tabelle sehen muesste.
-- Darum ein Trigger. Sich auf die Oberflaeche zu verlassen reicht nicht:
-- was die Datenbank nicht verbietet, passiert irgendwann.
create or replace function public.items_deckbild_pruefen()
returns trigger language plpgsql as $fn$
declare
  v_item uuid;
begin
  if new.cover_photo_id is null then
    return new;
  end if;
  select item_id into v_item from public.item_photos where id = new.cover_photo_id;
  if v_item is null then
    raise exception 'Deckbild nicht gefunden' using errcode = 'no_data_found';
  end if;
  if v_item <> new.id then
    raise exception 'Das Deckbild gehoert zu einem anderen Eintrag'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

alter function public.items_deckbild_pruefen() set search_path = public;

drop trigger if exists items_deckbild on public.items;
create trigger items_deckbild
  before insert or update of cover_photo_id on public.items
  for each row execute function public.items_deckbild_pruefen();

-- Wer das Deckbild sucht, sucht ueber die Kiste. Ein eigener Index lohnt
-- nur fuer den umgekehrten Weg: welches Foto ist irgendwo Deckbild.
create index if not exists items_cover_idx on public.items(cover_photo_id)
  where cover_photo_id is not null;
