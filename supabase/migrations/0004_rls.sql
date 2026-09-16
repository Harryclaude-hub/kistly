-- =====================================================================
-- Kistly 0004_rls
-- Alles ist standardmaessig zu. Zugriff gibt es nur ueber die
-- Projekt-Mitgliedschaft, geprueft in is_member / is_editor / is_owner.
-- =====================================================================

alter table public.profiles           enable row level security;
alter table public.projects           enable row level security;
alter table public.project_members    enable row level security;
alter table public.project_invites    enable row level security;
alter table public.tags               enable row level security;
alter table public.items              enable row level security;
alter table public.item_counters      enable row level security;
alter table public.item_code_history  enable row level security;
alter table public.item_contents      enable row level security;
alter table public.item_photos        enable row level security;
alter table public.item_events        enable row level security;
alter table public.messages           enable row level security;
alter table public.message_reactions  enable row level security;
alter table public.message_links      enable row level security;
alter table public.calls              enable row level security;
alter table public.call_participants  enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.push_log           enable row level security;

-- ------------------------------------------------------------- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_project(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------- projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using (public.is_member(id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (public.is_editor(id)) with check (public.is_editor(id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
  using (public.is_owner(id));

-- ------------------------------------------------------ project_members
drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members for select to authenticated
  using (public.is_member(project_id));

drop policy if exists members_insert on public.project_members;
create policy members_insert on public.project_members for insert to authenticated
  with check (public.is_owner(project_id));

-- Eigene Zeile darf jeder anfassen (Lesestand), die Rolle schuetzt ein
-- Trigger weiter unten.
drop policy if exists members_update on public.project_members;
create policy members_update on public.project_members for update to authenticated
  using (user_id = auth.uid() or public.is_owner(project_id))
  with check (user_id = auth.uid() or public.is_owner(project_id));

drop policy if exists members_delete on public.project_members;
create policy members_delete on public.project_members for delete to authenticated
  using (user_id = auth.uid() or public.is_owner(project_id));

create or replace function public.guard_member_role()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.role is distinct from old.role and not public.is_owner(new.project_id) then
    raise exception 'Nur der Besitzer darf Rollen aendern' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $fn$;

drop trigger if exists members_guard_role on public.project_members;
create trigger members_guard_role before update on public.project_members
  for each row execute function public.guard_member_role();

create or replace function public.guard_last_owner()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_owners int;
begin
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

drop trigger if exists members_guard_last_owner on public.project_members;
create trigger members_guard_last_owner before delete on public.project_members
  for each row execute function public.guard_last_owner();

-- ------------------------------------------------------ project_invites
drop policy if exists invites_select on public.project_invites;
create policy invites_select on public.project_invites for select to authenticated
  using (public.is_member(project_id));

drop policy if exists invites_write on public.project_invites;
create policy invites_write on public.project_invites for all to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));

-- ----------------------------------------------------------------- tags
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags for select to authenticated
  using (public.is_member(project_id));

drop policy if exists tags_write on public.tags;
create policy tags_write on public.tags for all to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));

-- ---------------------------------------------------------------- items
drop policy if exists items_select on public.items;
create policy items_select on public.items for select to authenticated
  using (public.is_member(project_id));

drop policy if exists items_write on public.items;
create policy items_write on public.items for all to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));

-- item_counters hat absichtlich keine Policy. Nur next_seq (security
-- definer) schreibt dort.

drop policy if exists code_history_select on public.item_code_history;
create policy code_history_select on public.item_code_history for select to authenticated
  using (public.is_member(project_id));

drop policy if exists code_history_insert on public.item_code_history;
create policy code_history_insert on public.item_code_history for insert to authenticated
  with check (public.is_editor(project_id));

drop policy if exists contents_select on public.item_contents;
create policy contents_select on public.item_contents for select to authenticated
  using (public.is_member(project_id));

drop policy if exists contents_write on public.item_contents;
create policy contents_write on public.item_contents for all to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));

drop policy if exists photos_select on public.item_photos;
create policy photos_select on public.item_photos for select to authenticated
  using (public.is_member(project_id));

drop policy if exists photos_write on public.item_photos;
create policy photos_write on public.item_photos for all to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));

drop policy if exists events_select on public.item_events;
create policy events_select on public.item_events for select to authenticated
  using (public.is_member(project_id));

drop policy if exists events_insert on public.item_events;
create policy events_insert on public.item_events for insert to authenticated
  with check (public.is_member(project_id));

-- ------------------------------------------------------------- messages
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.is_member(project_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (public.is_member(project_id) and sender_id = auth.uid());

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated
  using (sender_id = auth.uid() or public.is_owner(project_id));

drop policy if exists reactions_select on public.message_reactions;
create policy reactions_select on public.message_reactions for select to authenticated
  using (public.is_member(project_id));

drop policy if exists reactions_insert on public.message_reactions;
create policy reactions_insert on public.message_reactions for insert to authenticated
  with check (public.is_member(project_id) and user_id = auth.uid());

drop policy if exists reactions_delete on public.message_reactions;
create policy reactions_delete on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists links_select on public.message_links;
create policy links_select on public.message_links for select to authenticated
  using (public.is_member(project_id));

drop policy if exists links_insert on public.message_links;
create policy links_insert on public.message_links for insert to authenticated
  with check (public.is_member(project_id));

-- ---------------------------------------------------------------- calls
create or replace function public.call_project(c uuid)
returns uuid language sql stable security definer set search_path = public as $fn$
  select project_id from public.calls where id = c;
$fn$;

drop policy if exists calls_select on public.calls;
create policy calls_select on public.calls for select to authenticated
  using (public.is_member(project_id));

drop policy if exists calls_insert on public.calls;
create policy calls_insert on public.calls for insert to authenticated
  with check (public.is_member(project_id) and created_by = auth.uid());

drop policy if exists calls_update on public.calls;
create policy calls_update on public.calls for update to authenticated
  using (public.is_member(project_id)) with check (public.is_member(project_id));

drop policy if exists participants_select on public.call_participants;
create policy participants_select on public.call_participants for select to authenticated
  using (public.is_member(public.call_project(call_id)));

drop policy if exists participants_insert on public.call_participants;
create policy participants_insert on public.call_participants for insert to authenticated
  with check (public.is_member(public.call_project(call_id)));

drop policy if exists participants_update on public.call_participants;
create policy participants_update on public.call_participants for update to authenticated
  using (user_id = auth.uid() or public.is_member(public.call_project(call_id)))
  with check (user_id = auth.uid() or public.is_member(public.call_project(call_id)));

-- ----------------------------------------------------------------- push
drop policy if exists push_subs_all on public.push_subscriptions;
create policy push_subs_all on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists prefs_all on public.notification_prefs;
create policy prefs_all on public.notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_log_select on public.push_log;
create policy push_log_select on public.push_log for select to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------- Realtime
alter table public.messages          replica identity full;
alter table public.message_reactions replica identity full;
alter table public.items             replica identity full;
alter table public.calls             replica identity full;
alter table public.call_participants replica identity full;
alter table public.tags              replica identity full;

do $$
declare t text;
begin
  foreach t in array array[
    'messages','message_reactions','message_links','items','tags',
    'calls','call_participants','project_members','item_events'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
