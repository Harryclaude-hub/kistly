-- =====================================================================
-- Kistly 0001_core
-- Profile, Projekte, Mitglieder, Einladungen, Bereiche (Zimmer/Personen),
-- Kisten inkl. Codevergabe, Inhalte, Fotos, Verlauf.
-- Jede Tabelle bekommt RLS in 0002_rls.sql.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- Typen
do $$ begin
  create type public.member_role as enum ('owner','editor','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tag_kind as enum ('room','person');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_kind as enum ('box','furniture','bag','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_status as enum ('open','transit','arrived');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- Profile
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email        text,
  avatar_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------ Projekte
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  note         text,
  from_address text,
  to_address   text,
  move_date    date,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects(owner_id);

create table if not exists public.project_members (
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.member_role not null default 'editor',
  last_read_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members(user_id);

-- ------------------------------------------------- Zugriffs-Hilfsfunktionen
-- security definer, damit die Policies nicht rekursiv auf project_members
-- zurueckgreifen. Genau eine Stelle, an der Mitgliedschaft geprueft wird.
create or replace function public.is_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p and m.user_id = auth.uid()
  );
$fn$;

create or replace function public.is_editor(p uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p and m.user_id = auth.uid()
      and m.role in ('owner','editor')
  );
$fn$;

create or replace function public.is_owner(p uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p and m.user_id = auth.uid() and m.role = 'owner'
  );
$fn$;

create or replace function public.shares_project(u uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1
    from public.project_members a
    join public.project_members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = u
  );
$fn$;

-- ---------------------------------------------------------- Einladungen
create table if not exists public.project_invites (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code       text not null unique,
  role       public.member_role not null default 'editor',
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  max_uses   int,
  uses       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists project_invites_project_idx on public.project_invites(project_id);

-- ------------------------------------------- Bereiche: Zimmer + Personen
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind       public.tag_kind not null,
  name       text not null check (length(btrim(name)) > 0),
  short      text not null check (short ~ '^[A-Za-z0-9]{1,4}$'),
  color      text not null default '#2563EB',
  note       text,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
-- Das Kuerzel treibt den Code, darum projektweit eindeutig, egal ob Zimmer
-- oder Person.
create unique index if not exists tags_project_short_key
  on public.tags(project_id, upper(short));
create index if not exists tags_project_idx on public.tags(project_id, kind, sort);

-- ------------------------------------------------------ Kisten und Moebel
create table if not exists public.item_counters (
  project_id uuid not null references public.projects(id) on delete cascade,
  prefix     text not null,
  last_seq   int  not null default 0,
  primary key (project_id, prefix)
);

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  kind        public.item_kind not null default 'box',
  title       text,
  room_id     uuid references public.tags(id) on delete set null,
  person_id   uuid references public.tags(id) on delete set null,
  code_source public.tag_kind not null default 'room',
  prefix      text not null,
  size        smallint not null default 5 check (size between 1 and 10),
  seq         int not null,
  code        text not null,
  status      public.item_status not null default 'open',
  note        text,
  fragile     boolean not null default false,
  target_room text,
  arrived_at  timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists items_project_code_key on public.items(project_id, code);
create index if not exists items_project_idx  on public.items(project_id, created_at desc);
create index if not exists items_room_idx     on public.items(room_id);
create index if not exists items_person_idx   on public.items(person_id);
create index if not exists items_status_idx   on public.items(project_id, status);

-- Alte Codes bleiben stehen, damit ein bereits geklebtes Etikett weiter
-- gefunden wird. Nichts wird still geloescht.
create table if not exists public.item_code_history (
  id          bigserial primary key,
  item_id     uuid not null references public.items(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  code        text not null,
  replaced_at timestamptz not null default now()
);
create index if not exists item_code_history_code_idx
  on public.item_code_history(project_id, code);

create table if not exists public.item_contents (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  text       text not null check (length(btrim(text)) > 0),
  qty        int not null default 1 check (qty > 0),
  checked    boolean not null default false,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists item_contents_item_idx on public.item_contents(item_id, sort);

create table if not exists public.item_photos (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  path       text not null,
  caption    text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists item_photos_item_idx on public.item_photos(item_id, created_at);

create table if not exists public.item_events (
  id         bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  item_id    uuid references public.items(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  type       text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists item_events_project_idx on public.item_events(project_id, created_at desc);
create index if not exists item_events_item_idx    on public.item_events(item_id, created_at desc);
