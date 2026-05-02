create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),

  username text not null,
  username_normalized text not null unique,

  password_hash text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index users_disabled_idx
on users(disabled_at);

create table welcome_keys (
  id uuid primary key default gen_random_uuid(),

  key_hash text not null unique,

  created_at timestamptz not null default now(),
  expires_at timestamptz,

  used_at timestamptz,
  used_by_user_id uuid references users(id) on delete set null,

  comment text
);

create index welcome_keys_unused_idx
on welcome_keys(created_at)
where used_at is null;

create table sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  session_hash text not null unique,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,

  user_agent text,
  ip_hash text
);

create index sessions_user_id_idx
on sessions(user_id);

create index sessions_active_idx
on sessions(expires_at)
where revoked_at is null;
