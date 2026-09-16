-- =====================================================================
-- Kistly 0006_hardening
-- Nacharbeit aus dem Supabase-Linter:
--   1. Jede Funktion bekommt einen festen search_path.
--   2. next_seq prueft die Mitgliedschaft. Vorher haette ein angemeldeter
--      Nutzer die Zaehler fremder Projekte hochdrehen koennen.
--   3. Ausfuehrrechte werden entzogen und gezielt wieder vergeben.
--      Trigger-Funktionen brauchen kein EXECUTE, Postgres prueft das bei
--      Triggern nicht. Funktionen, die in einer Policy vorkommen, brauchen
--      es dagegen zwingend, sonst sperrt sich die App selbst aus.
--   4. private.config haelt Serverschluessel ausserhalb der offenen API.
-- =====================================================================

-- ------------------------------------------------------- 1. search_path
alter function public.try_uuid(text)                       set search_path = public;
alter function public.tag_stats(uuid)                      set search_path = public;
alter function public.build_code(text, int, int)           set search_path = public;
alter function public.touch_updated_at()                   set search_path = public;
alter function public.assert_tag(uuid, uuid, public.tag_kind) set search_path = public;
alter function public.items_before_insert()                set search_path = public;
alter function public.items_before_update()                set search_path = public;

-- ------------------------------------------------ 2. Zaehler absichern
create or replace function public.next_seq(p_project uuid, p_prefix text)
returns int language plpgsql security definer set search_path = public as $fn$
declare v_seq int;
begin
  -- Ohne diese Pruefung koennte jeder Angemeldete die Nummerierung eines
  -- fremden Umzugs verschieben, weil die Funktion mit erhoehten Rechten
  -- laeuft.
  if not public.is_editor(p_project) then
    raise exception 'Keine Berechtigung fuer dieses Projekt'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.item_counters as c (project_id, prefix, last_seq)
  values (p_project, upper(p_prefix), 1)
  on conflict (project_id, prefix)
    do update set last_seq = c.last_seq + 1
  returning c.last_seq into v_seq;
  return v_seq;
end $fn$;

-- --------------------------------------------------- 3. Ausfuehrrechte
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;
grant  execute on all functions in schema public to service_role;

-- In Policies benutzt, darum zwingend fuer angemeldete Nutzer.
grant execute on function public.is_member(uuid)       to authenticated;
grant execute on function public.is_editor(uuid)       to authenticated;
grant execute on function public.is_owner(uuid)        to authenticated;
grant execute on function public.shares_project(uuid)  to authenticated;
grant execute on function public.call_project(uuid)    to authenticated;
grant execute on function public.try_uuid(text)        to authenticated;

-- Aus Trigger-Funktionen heraus aufgerufen, die als Aufrufer laufen.
grant execute on function public.build_code(text, int, int)              to authenticated;
grant execute on function public.next_seq(uuid, text)                    to authenticated;
grant execute on function public.assert_tag(uuid, uuid, public.tag_kind) to authenticated;

-- Die vier echten Schnittstellen der App.
grant execute on function public.create_project(text, text, boolean) to authenticated;
grant execute on function public.join_project(text)                  to authenticated;
grant execute on function public.resolve_code(uuid, text)            to authenticated;
grant execute on function public.tag_stats(uuid)                     to authenticated;

grant select on public.project_stats to authenticated;

-- --------------------------------------------- 4. Serverseitige Schluessel
-- Eigenes Schema, das nicht ueber die REST-Schnittstelle erreichbar ist.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.config (
  key        text primary key,
  value      text not null,
  note       text,
  updated_at timestamptz not null default now()
);
alter table private.config enable row level security;
revoke all on private.config from public, anon, authenticated;
grant select on private.config to service_role;
