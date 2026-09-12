-- ==========================================================================
-- SERVER-SIDE LOOKUP/SUBMIT FUNCTIONS
--
-- These are the only way the public site ever touches guest data. Both are
-- Postgres functions (called from the browser via supabase.rpc(...)), marked
-- `security definer` so they run with the privileges of the user that creates
-- them — that's you, running this file as the Supabase SQL Editor's postgres
-- role, which bypasses Row Level Security. `anon`/`authenticated` are only
-- ever granted EXECUTE on the functions themselves, never SELECT/INSERT on
-- the tables, so there is no direct client path to browse or download the
-- guest list — a mismatched or unknown name just gets "not found".
--
-- Run this once, after schema.sql, in the Supabase SQL Editor. Safe to
-- re-run — both functions are `create or replace`.
-- ==========================================================================

-- ---------------------------------------------------------------------
-- find_invitation — looks up one guest by first + last name, then returns
-- that guest's ENTIRE household (every guest row sharing the same
-- case-insensitive, trimmed `household` value), each with their own
-- existing RSVP if one was already submitted. A guest with no household
-- set is treated as a household of one. This is what lets one person
-- search their name and RSVP for their whole party in one sitting.
-- ---------------------------------------------------------------------
create or replace function public.find_invitation(p_first_name text, p_last_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_guest guests%rowtype;
  v_count int;
  v_members jsonb;
begin
  select count(*) into v_count
  from guests
  where lower(trim(first_name)) = lower(trim(p_first_name))
    and lower(trim(last_name))  = lower(trim(p_last_name));

  if v_count = 0 then
    return jsonb_build_object('found', false);
  elsif v_count > 1 then
    -- Two guests share this exact name — ask them to contact you directly
    -- rather than guessing which invitation to return.
    return jsonb_build_object('found', false, 'multiple', true);
  end if;

  select * into v_guest
  from guests
  where lower(trim(first_name)) = lower(trim(p_first_name))
    and lower(trim(last_name))  = lower(trim(p_last_name));

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'guestId', g.id,
      'firstName', g.first_name,
      'lastName', g.last_name,
      'invitedPlusOne', g.invited_plus_one,
      'plusOneName', g.plus_one_name,
      'existingRsvp', case when r.id is null then null else jsonb_build_object(
        'attending', r.attending,
        'plusOneFirstName', r.plus_one_first_name,
        'plusOneLastName', r.plus_one_last_name,
        'meal', r.meal,
        'dietary', r.dietary,
        'plusOneMeal', r.plus_one_meal,
        'plusOneDietary', r.plus_one_dietary,
        'welcomeParty', r.welcome_party,
        'hotel', r.hotel,
        'notes', r.notes
      ) end
    )
    order by g.first_name
  ), '[]'::jsonb)
  into v_members
  from guests g
  left join rsvps r on r.guest_id = g.id
  where
    case
      when v_guest.household is not null and trim(v_guest.household) <> ''
        then lower(trim(g.household)) = lower(trim(v_guest.household))
      else g.id = v_guest.id
    end;

  return jsonb_build_object(
    'found', true,
    'household', v_guest.household,
    'members', v_members
  );
end;
$func$;

revoke all on function public.find_invitation(text, text) from public;
grant execute on function public.find_invitation(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- submit_rsvp — inserts or updates the one RSVP row for a guest.
-- Re-checks first/last name against guest_id server-side (defense in depth
-- against someone guessing another guest's id), and the unique(guest_id)
-- constraint + upsert means a second submission always updates the same
-- row instead of creating a duplicate. Called once per household member
-- when a guest RSVPs for their whole party.
--
-- A plus-one is captured by first + last name (not a single combined
-- string) so rsvp-admin.html can log them as their own person in the
-- headcount, rather than just a note attached to whoever brought them.
-- ---------------------------------------------------------------------
-- Resend API key used by the email-notification block below. Never commit
-- the real key to this file (it's a public repo) - instead, run this once
-- yourself in the Supabase SQL Editor with your actual key substituted in:
--
--   select vault.create_secret('re_your_actual_key_here', 'resend_api_key');
--
-- Vault (schema `vault`) is enabled by default on every Supabase project and
-- stores the value encrypted at rest. To rotate the key later:
--
--   select vault.update_secret(id, 'new_key') from vault.decrypted_secrets where name = 'resend_api_key';
--
-- pg_net is what lets a Postgres function make an outbound HTTP call. On
-- Supabase, enable it via the dashboard (Database -> Extensions -> pg_net)
-- rather than a plain `create extension` here - it ships with a fixed
-- schema (net) and the dashboard toggle is the supported way to install it.

create or replace function public.submit_rsvp(
  p_guest_id uuid,
  p_first_name text,
  p_last_name text,
  p_attending boolean,
  p_plus_one_first_name text,
  p_plus_one_last_name text,
  p_meal text,
  p_dietary text,
  p_plus_one_meal text,
  p_plus_one_dietary text,
  p_welcome_party boolean,
  p_hotel text,
  p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_guest guests%rowtype;
  v_has_plus_one boolean;
  v_is_update boolean;
  v_resend_key text;
  v_subject text;
  v_body text;
begin
  select * into v_guest from guests where id = p_guest_id;

  if v_guest.id is null
     or lower(trim(v_guest.first_name)) <> lower(trim(p_first_name))
     or lower(trim(v_guest.last_name))  <> lower(trim(p_last_name)) then
    raise exception 'Invitation not found';
  end if;

  select exists(select 1 from rsvps where guest_id = p_guest_id) into v_is_update;

  -- Plus-one fields only make sense if this guest is attending AND actually
  -- named someone they're bringing.
  v_has_plus_one := p_attending and p_plus_one_first_name is not null and trim(p_plus_one_first_name) <> '';

  insert into rsvps (
    guest_id, attending, plus_one_first_name, plus_one_last_name, meal, dietary,
    plus_one_meal, plus_one_dietary, welcome_party, hotel, notes,
    submitted_at, updated_at
  ) values (
    v_guest.id, p_attending,
    case when v_has_plus_one then p_plus_one_first_name else null end,
    case when v_has_plus_one then p_plus_one_last_name else null end,
    case when p_attending then p_meal else null end,
    case when p_attending then p_dietary else null end,
    case when v_has_plus_one then p_plus_one_meal else null end,
    case when v_has_plus_one then p_plus_one_dietary else null end,
    case when p_attending then p_welcome_party else null end,
    case when p_attending then p_hotel else null end,
    p_notes,
    now(), now()
  )
  on conflict (guest_id) do update set
    attending = excluded.attending,
    plus_one_first_name = excluded.plus_one_first_name,
    plus_one_last_name = excluded.plus_one_last_name,
    meal = excluded.meal,
    dietary = excluded.dietary,
    plus_one_meal = excluded.plus_one_meal,
    plus_one_dietary = excluded.plus_one_dietary,
    welcome_party = excluded.welcome_party,
    hotel = excluded.hotel,
    notes = excluded.notes,
    updated_at = now();

  -- Fire-and-forget email notification, so every submission and every later
  -- update lands in your inbox the moment it happens - a real-time copy of
  -- the data that exists independently of Supabase. The Resend key lives in
  -- Vault (see the note above this function), never in this file. pg_net
  -- queues the HTTP call asynchronously and any failure here is swallowed,
  -- so a bad key or a Resend outage can never block or fail the RSVP save
  -- itself.
  begin
    select decrypted_secret into v_resend_key
    from vault.decrypted_secrets
    where name = 'resend_api_key';

    if v_resend_key is not null then
      v_subject := format('RSVP %s: %s %s (%s)',
        case when v_is_update then 'updated' else 'received' end,
        v_guest.first_name, v_guest.last_name,
        case when p_attending then 'attending' else 'declined' end
      );

      v_body := format(
        E'%s %s %s.\n\nAttending: %s\nMeal: %s\nDietary: %s\nWelcome party: %s\nHotel: %s\nPlus one: %s\nNotes: %s',
        v_guest.first_name, v_guest.last_name,
        case when v_is_update then 'updated their RSVP' else 'just submitted their RSVP' end,
        case when p_attending then 'Yes' else 'No' end,
        coalesce(p_meal, '-'),
        coalesce(p_dietary, '-'),
        case when p_welcome_party is null then '-' when p_welcome_party then 'Yes' else 'No' end,
        coalesce(p_hotel, '-'),
        case when v_has_plus_one then p_plus_one_first_name || ' ' || p_plus_one_last_name else '-' end,
        coalesce(p_notes, '-')
      );

      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_resend_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'RSVP Notifications <onboarding@resend.dev>',
          'to', jsonb_build_array('caitlinandpaul2027@gmail.com'),
          'subject', v_subject,
          'text', v_body
        )
      );
    end if;
  exception when others then
    null;
  end;

  return jsonb_build_object('success', true);
end;
$func$;

revoke all on function public.submit_rsvp(uuid, text, text, boolean, text, text, text, text, text, text, boolean, text, text) from public;
grant execute on function public.submit_rsvp(uuid, text, text, boolean, text, text, text, text, text, text, boolean, text, text) to anon, authenticated;

-- Drop old function signatures from before this redesign, so Postgres
-- doesn't keep stale overloads around after you re-run this file.
drop function if exists public.submit_rsvp(uuid, text, text, boolean, text, text, text, date, date, text, text, text);
drop function if exists public.submit_rsvp(uuid, text, text, boolean, text, text, text, boolean, text, text);
drop function if exists public.submit_rsvp(uuid, text, text, boolean, text, text, text, text, text, boolean, text, text);
