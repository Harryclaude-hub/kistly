-- =====================================================================
-- Kistly 0002_functions
-- Codevergabe, Trigger, RPCs. Die Code-Logik lebt genau hier, nirgends
-- sonst. Das Frontend rechnet keinen Code selbst aus.
-- =====================================================================

-- ------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end $fn$;

-- ------------------------------------------------- Profil bei Neuanmeldung
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.notification_prefs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $fn$;

-- ---------------------------------------------------------- Codevergabe
-- Format:  KUERZEL - GROESSE - LAUFNUMMER      z.B.  W-3-007
--   KUERZEL   = Kuerzel des Zimmers oder der Person
--   GROESSE   = 1 bis 10, wird in der Oberflaeche rot dargestellt
--   LAUFNUMMER= fortlaufend je Projekt und Kuerzel, dreistellig
create or replace function public.build_code(p_prefix text, p_size int, p_seq int)
returns text language sql immutable as $fn$
  select upper(p_prefix) || '-' || p_size::text || '-' || lpad(p_seq::text, 3, '0');
$fn$;

create or replace function public.next_seq(p_project uuid, p_prefix text)
returns int language plpgsql security definer set search_path = public as $fn$
declare v_seq int;
begin
  insert into public.item_counters as c (project_id, prefix, last_seq)
  values (p_project, upper(p_prefix), 1)
  on conflict (project_id, prefix)
    do update set last_seq = c.last_seq + 1
  returning c.last_seq into v_seq;
  return v_seq;
end $fn$;

-- Prueft, dass ein Bereich zum Projekt und zur erwarteten Art gehoert.
create or replace function public.assert_tag(p_tag uuid, p_project uuid, p_kind public.tag_kind)
returns public.tags language plpgsql stable as $fn$
declare t public.tags;
begin
  select * into t from public.tags where id = p_tag;
  if t.id is null then
    raise exception 'Bereich % existiert nicht', p_tag using errcode = 'foreign_key_violation';
  end if;
  if t.project_id <> p_project then
    raise exception 'Bereich % gehoert zu einem anderen Projekt', p_tag using errcode = 'check_violation';
  end if;
  if t.kind <> p_kind then
    raise exception 'Bereich % ist kein %', p_tag, p_kind using errcode = 'check_violation';
  end if;
  return t;
end $fn$;

create or replace function public.items_before_insert()
returns trigger language plpgsql as $fn$
declare
  t_room   public.tags;
  t_person public.tags;
  v_prefix text;
begin
  if new.room_id is not null then
    t_room := public.assert_tag(new.room_id, new.project_id, 'room');
  end if;
  if new.person_id is not null then
    t_person := public.assert_tag(new.person_id, new.project_id, 'person');
  end if;

  if new.room_id is null and new.person_id is null then
    raise exception 'Jede Kiste braucht mindestens ein Zimmer oder eine Person'
      using errcode = 'check_violation';
  end if;

  -- Welches Kuerzel steht vorne? Gewuenschte Quelle, sonst die vorhandene.
  if new.code_source = 'person' and new.person_id is not null then
    v_prefix := t_person.short;
  elsif new.code_source = 'room' and new.room_id is not null then
    v_prefix := t_room.short;
  elsif new.room_id is not null then
    v_prefix := t_room.short;
    new.code_source := 'room';
  else
    v_prefix := t_person.short;
    new.code_source := 'person';
  end if;

  new.prefix     := upper(v_prefix);
  new.seq        := public.next_seq(new.project_id, new.prefix);
  new.code       := public.build_code(new.prefix, new.size, new.seq);
  new.created_by := coalesce(new.created_by, auth.uid());
  if new.status = 'arrived' and new.arrived_at is null then
    new.arrived_at := now();
  end if;
  return new;
end $fn$;

create or replace function public.items_before_update()
returns trigger language plpgsql as $fn$
declare
  t_room     public.tags;
  t_person   public.tags;
  v_prefix   text;
  v_new_code text;
begin
  new.updated_at := now();
  new.project_id := old.project_id;   -- Projektwechsel ist nicht vorgesehen

  if new.room_id is not null then
    t_room := public.assert_tag(new.room_id, new.project_id, 'room');
  end if;
  if new.person_id is not null then
    t_person := public.assert_tag(new.person_id, new.project_id, 'person');
  end if;
  if new.room_id is null and new.person_id is null then
    raise exception 'Jede Kiste braucht mindestens ein Zimmer oder eine Person'
      using errcode = 'check_violation';
  end if;

  if new.code_source = 'person' and new.person_id is not null then
    v_prefix := upper(t_person.short);
  elsif new.code_source = 'room' and new.room_id is not null then
    v_prefix := upper(t_room.short);
  elsif new.room_id is not null then
    v_prefix := upper(t_room.short);
    new.code_source := 'room';
  else
    v_prefix := upper(t_person.short);
    new.code_source := 'person';
  end if;

  if v_prefix is distinct from old.prefix then
    -- Neues Kuerzel heisst neue Laufnummer in dieser Reihe.
    new.prefix := v_prefix;
    new.seq    := public.next_seq(new.project_id, v_prefix);
  else
    new.prefix := old.prefix;
    new.seq    := old.seq;
  end if;

  v_new_code := public.build_code(new.prefix, new.size, new.seq);
  if v_new_code is distinct from old.code then
    insert into public.item_code_history (item_id, project_id, code)
    values (old.id, old.project_id, old.code);
    new.code := v_new_code;
  else
    new.code := old.code;
  end if;

  if new.status = 'arrived' and old.status <> 'arrived' then
    new.arrived_at := now();
  elsif new.status <> 'arrived' then
    new.arrived_at := null;
  end if;

  return new;
end $fn$;

-- ----------------------------------------------------------- Verlauf
create or replace function public.items_after_insert()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.item_events (project_id, item_id, user_id, type, data)
  values (new.project_id, new.id, auth.uid(), 'created',
          jsonb_build_object('code', new.code, 'status', new.status));
  return new;
end $fn$;

create or replace function public.items_after_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status is distinct from old.status then
    insert into public.item_events (project_id, item_id, user_id, type, data)
    values (new.project_id, new.id, auth.uid(), 'status',
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.code is distinct from old.code then
    insert into public.item_events (project_id, item_id, user_id, type, data)
    values (new.project_id, new.id, auth.uid(), 'code',
            jsonb_build_object('from', old.code, 'to', new.code));
  end if;
  return new;
end $fn$;

-- project_id an Kindtabellen immer aus dem Item ziehen, nie vom Client
-- glauben. Sonst haengt die RLS an einer Angabe, die manipulierbar waere.
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

-- ---------------------------------------------------------- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists items_bi on public.items;
create trigger items_bi before insert on public.items
  for each row execute function public.items_before_insert();

drop trigger if exists items_bu on public.items;
create trigger items_bu before update on public.items
  for each row execute function public.items_before_update();

drop trigger if exists items_ai on public.items;
create trigger items_ai after insert on public.items
  for each row execute function public.items_after_insert();

drop trigger if exists items_au on public.items;
create trigger items_au after update on public.items
  for each row execute function public.items_after_update();

drop trigger if exists item_contents_project on public.item_contents;
create trigger item_contents_project before insert on public.item_contents
  for each row execute function public.inherit_project_from_item();

drop trigger if exists item_photos_project on public.item_photos;
create trigger item_photos_project before insert on public.item_photos
  for each row execute function public.inherit_project_from_item();

-- =====================================================================
-- RPCs
-- =====================================================================

-- Projekt anlegen, Besitzer eintragen, optional Standardzimmer. Atomar,
-- damit nie ein Projekt ohne Mitgliedschaft entsteht.
create or replace function public.create_project(
  p_name text,
  p_note text default null,
  p_with_defaults boolean default true
) returns public.projects
language plpgsql security definer set search_path = public as $fn$
declare
  v_project public.projects;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_name,''))) = 0 then
    raise exception 'Projektname fehlt' using errcode = 'check_violation';
  end if;

  insert into public.projects (name, note, owner_id)
  values (btrim(p_name), nullif(btrim(coalesce(p_note,'')),''), v_uid)
  returning * into v_project;

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, v_uid, 'owner');

  if p_with_defaults then
    insert into public.tags (project_id, kind, name, short, color, sort) values
      (v_project.id, 'room', 'Wohnzimmer',    'W',  '#2563EB', 10),
      (v_project.id, 'room', 'Kueche',        'K',  '#F97316', 20),
      (v_project.id, 'room', 'Schlafzimmer',  'SZ', '#7C3AED', 30),
      (v_project.id, 'room', 'Kinderzimmer',  'KZ', '#0EA5E9', 40),
      (v_project.id, 'room', 'Bad',           'B',  '#14B8A6', 50),
      (v_project.id, 'room', 'Flur',          'FL', '#64748B', 60),
      (v_project.id, 'room', 'Keller',        'KE', '#A16207', 70);
  end if;

  return v_project;
end $fn$;

-- Einladungscode einloesen.
create or replace function public.join_project(p_code text)
returns public.projects
language plpgsql security definer set search_path = public as $fn$
declare
  v_invite public.project_invites;
  v_project public.projects;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege';
  end if;

  select * into v_invite from public.project_invites
  where upper(code) = upper(btrim(p_code)) for update;

  if v_invite.id is null then
    raise exception 'Code unbekannt' using errcode = 'no_data_found';
  end if;
  if not v_invite.active then
    raise exception 'Code ist deaktiviert' using errcode = 'check_violation';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Code ist abgelaufen' using errcode = 'check_violation';
  end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'Code ist aufgebraucht' using errcode = 'check_violation';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_invite.project_id, v_uid, v_invite.role)
  on conflict (project_id, user_id) do nothing;

  if found then
    update public.project_invites set uses = uses + 1 where id = v_invite.id;
  end if;

  select * into v_project from public.projects where id = v_invite.project_id;
  return v_project;
end $fn$;

-- Code aufloesen, auch alte, bereits ersetzte Codes.
create or replace function public.resolve_code(p_project uuid, p_code text)
returns table (item_id uuid, code text, is_old boolean)
language sql stable security definer set search_path = public as $fn$
  select i.id, i.code, false
  from public.items i
  where i.project_id = p_project
    and upper(i.code) = upper(btrim(p_code))
    and public.is_member(p_project)
  union all
  select h.item_id, h.code, true
  from public.item_code_history h
  where h.project_id = p_project
    and upper(h.code) = upper(btrim(p_code))
    and public.is_member(p_project)
  limit 5;
$fn$;

-- Zaehlwerte je Projekt. security_invoker, damit RLS greift.
create or replace view public.project_stats
with (security_invoker = true) as
select
  p.id as project_id,
  count(i.id)                                           as items_total,
  count(i.id) filter (where i.status = 'arrived')       as items_arrived,
  count(i.id) filter (where i.status = 'transit')       as items_transit,
  count(i.id) filter (where i.status = 'open')          as items_open
from public.projects p
left join public.items i on i.project_id = p.id
group by p.id;
