-- =====================================================================
-- Kistly 0016_echte_umlaute
--
-- Die Meldungen aus der Datenbank landen ueber {grund} direkt auf dem
-- Bildschirm. Sie standen in Ersatzschreibung da: "gehoert", "fuer",
-- "zusammenfuehren". Das liest sich nicht wie Deutsch.
--
-- Geaendert wird NUR der angezeigte Text. Die Funktionen werden aus ihrer
-- eigenen aktuellen Definition neu erzeugt, mit genau acht festen
-- Ersetzungen. So kann sich an der Logik nichts verschieben, auch nicht
-- versehentlich. Die Laenge jeder Definition sinkt nur um die
-- eingesparten Zeichen, das wurde vor dem Anwenden nachgerechnet.
--
-- Ersetzt werden vollstaendige Meldungen, nicht einzelne Woerter. Ein
-- einzelnes Wort haette auch einen Bezeichner treffen koennen.
-- =====================================================================

do $$
declare
  f record;
  neu text;
begin
  for f in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (select 1 from pg_aggregate a where a.aggfnoid = p.oid)
  loop
    neu := f.def;
    neu := replace(neu, 'Bereich % gehoert zu einem anderen Projekt',
                        'Bereich % gehört zu einem anderen Projekt');
    neu := replace(neu, 'Bereiche gehoeren zu verschiedenen Umzuegen',
                        'Bereiche gehören zu verschiedenen Umzügen');
    neu := replace(neu, 'Das Deckbild gehoert zu einem anderen Eintrag',
                        'Das Deckbild gehört zu einem anderen Eintrag');
    neu := replace(neu, 'Keine Berechtigung fuer diesen Umzug',
                        'Keine Berechtigung für diesen Umzug');
    neu := replace(neu, 'Keine Berechtigung fuer dieses Projekt',
                        'Keine Berechtigung für dieses Projekt');
    neu := replace(neu, 'Nur der Besitzer darf Rollen aendern',
                        'Nur der Besitzer darf Rollen ändern');
    neu := replace(neu, 'Zimmer und Person lassen sich nicht zusammenfuehren',
                        'Zimmer und Person lassen sich nicht zusammenführen');
    neu := replace(neu, '''Kueche''', '''Küche''');
    if neu <> f.def then
      execute neu;
      raise notice 'Text erneuert: %', f.proname;
    end if;
  end loop;
end $$;

-- Die Standardzimmer, die frueher angelegt wurden, tragen den alten
-- Namen. Umbenannt wird nur, was noch unveraendert der Standardname ist.
-- Wer sein Zimmer selbst anders genannt hat, behaelt seinen Namen.
update public.tags set name = 'Küche'
where kind = 'room' and name = 'Kueche' and short = 'K';
