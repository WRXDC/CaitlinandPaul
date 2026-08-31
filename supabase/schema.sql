-- ==========================================================================
-- SCHEMA — guests + rsvps tables, with Row Level Security locked down so
-- neither table is readable or writable from the browser except through the
-- security-definer functions in functions.sql (guests) or an authenticated
-- admin session (read-only, for rsvp-admin.html).
--
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query)
-- on a fresh project. Safe to re-run on an existing project too — every
-- statement is idempotent (IF NOT EXISTS / IF EXISTS / OR REPLACE), including
-- the ALTER TABLE block that migrates an older rsvps table (with
-- arrival/departure/transportation_needs) to the current shape.
-- ==========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- guests — the private guest list. Never queried directly from the browser.
-- `household` is a free-text label shared by everyone in the same party
-- (e.g. "The Uhrmacher Family") — find_invitation() uses it to return
-- everyone in a guest's household in one search, so they can RSVP for
-- their whole party in one sitting instead of everyone searching separately.
-- ---------------------------------------------------------------------
create table if not exists public.guests (
  id                  uuid primary key default gen_random_uuid(),
  first_name          text not null,
  last_name           text not null,
  email               text,
  household           text,
  invited_plus_one    boolean not null default false,
  plus_one_name       text,
  created_at          timestamptz not null default now()
);

-- Case-insensitive name lookups (used by find_invitation).
create index if not exists guests_name_idx
  on public.guests (lower(first_name), lower(last_name));

-- Case-insensitive household lookups (used by find_invitation to pull in
-- the rest of a guest's party).
create index if not exists guests_household_idx
  on public.guests (lower(trim(household)))
  where household is not null;

-- ---------------------------------------------------------------------
-- rsvps — one row per guest. unique(guest_id) is what makes the
-- "on conflict" upsert in submit_rsvp prevent duplicate RSVPs.
-- ---------------------------------------------------------------------
create table if not exists public.rsvps (
  id                      uuid primary key default gen_random_uuid(),
  guest_id                uuid not null references public.guests(id) on delete cascade,
  attending               boolean not null,
  guest_name              text,
  meal                    text,
  dietary                 text,
  plus_one_meal           text,
  plus_one_dietary        text,
  welcome_party           boolean,
  hotel                   text,
  notes                   text,
  submitted_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (guest_id)
);

-- Migrate an existing (pre-redesign) rsvps table to the current shape:
-- drop the arrival/departure/transportation fields we no longer ask for,
-- add welcome_party for the Friday welcome-party question, and give a
-- plus-one their own meal/dietary answers instead of sharing the inviting
-- guest's.
alter table public.rsvps drop column if exists arrival;
alter table public.rsvps drop column if exists departure;
alter table public.rsvps drop column if exists transportation_needs;
alter table public.rsvps add column if not exists welcome_party boolean;
alter table public.rsvps add column if not exists plus_one_meal text;
alter table public.rsvps add column if not exists plus_one_dietary text;

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Enabling RLS with no policy denies ALL access by default — including to
-- roles that hold table-level grants (Supabase grants `anon`/`authenticated`
-- table privileges automatically, but RLS still blocks every row unless a
-- policy explicitly allows it). That means:
--   - anon (public visitors)         -> zero access to guests or rsvps.
--   - authenticated (Caitlin & Paul) -> read-only access, for the admin
--                                       dashboard. No insert/update/delete
--                                       policy exists for anyone.
-- The only way the browser can read a single invitation or write an RSVP is
-- through find_invitation()/submit_rsvp() in functions.sql, which run with
-- elevated privileges inside Postgres and are called via supabase.rpc(...).
-- ---------------------------------------------------------------------
alter table public.guests enable row level security;
alter table public.rsvps  enable row level security;

drop policy if exists "Admins can read guests" on public.guests;
create policy "Admins can read guests" on public.guests
  for select to authenticated using (true);

drop policy if exists "Admins can read rsvps" on public.rsvps;
create policy "Admins can read rsvps" on public.rsvps
  for select to authenticated using (true);
