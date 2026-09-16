-- =====================================================================
-- Kistly 0003_chat_calls_push
-- Chat mit Antworten, Reaktionen, Sprachnachrichten und Verweisen auf
-- Kisten und Bereiche. Dazu Anrufe und Push-Abos.
-- =====================================================================

do $$ begin
  create type public.message_kind as enum ('text','image','voice','file','system','call');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.call_status as enum ('ringing','active','ended','missed','declined');
exception when duplicate_object then null; end $$;

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  sender_id       uuid references auth.users(id) on delete set null,
  kind            public.message_kind not null default 'text',
  body            text,
  attachment_path text,
  attachment_meta jsonb not null default '{}'::jsonb,
  reply_to        uuid references public.messages(id) on delete set null,
  call_id         uuid,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists messages_project_idx on public.messages(project_id, created_at desc);
create index if not exists messages_reply_idx   on public.messages(reply_to);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null check (length(emoji) between 1 and 16),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists message_reactions_msg_idx on public.message_reactions(message_id);

-- Verweise aus dem Chat auf eine Kiste oder einen Bereich. Im Text steht
-- der Marker, hier liegt die auswertbare Verknuepfung.
create table if not exists public.message_links (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  target_type text not null check (target_type in ('item','tag')),
  target_id   uuid not null,
  label       text
);
create index if not exists message_links_msg_idx    on public.message_links(message_id);
create index if not exists message_links_target_idx on public.message_links(target_type, target_id);

-- ------------------------------------------------------------- Anrufe
create table if not exists public.calls (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  video      boolean not null default false,
  status     public.call_status not null default 'ringing',
  started_at timestamptz,
  ended_at   timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists calls_project_idx on public.calls(project_id, created_at desc);

create table if not exists public.call_participants (
  call_id   uuid not null references public.calls(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  state     text not null default 'invited' check (state in ('invited','joined','left','declined','missed')),
  joined_at timestamptz,
  left_at   timestamptz,
  primary key (call_id, user_id)
);
create index if not exists call_participants_user_idx on public.call_participants(user_id);

-- --------------------------------------------------------------- Push
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat    boolean not null default true,
  calls   boolean not null default true,
  items   boolean not null default true
);

-- Fehlgeschlagene oder nicht zustellbare Pushes landen sichtbar hier,
-- statt still verloren zu gehen.
create table if not exists public.push_log (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete set null,
  endpoint   text,
  ok         boolean not null,
  status     int,
  detail     text,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists push_log_created_idx on public.push_log(created_at desc);
