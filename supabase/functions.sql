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
-- Run this once, after schema.sql, in the Supabase SQL Editor.
-- ==========================================================================

-- ---------------------------------------------------------------------
-- find_invitation — looks up one guest by first + last name.
-- Returns only that guest's own invitation details, never a list.
-- ---------------------------------------------------------------------
create or replace function public.find_invitation(p_first_name text, p_last_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest guests%rowtype;
  v_rsvp  rsvps%rowtype;
  v_count int;
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

  select * into v_rsvp from rsvps where guest_id = v_guest.id;

  return jsonb_build_object(
    'found', true,
    'guestId', v_guest.id,
    'firstName', v_guest.first_name,
    'lastName', v_guest.last_name,
    'household', v_guest.household,
    'invitedPlusOne', v_guest.invited_plus_one,
    'plusOneName', v_guest.plus_one_name,
    'existingRsvp', case when v_rsvp.id is null then null else jsonb_build_object(
      'attending', v_rsvp.attending,
      'guestName', v_rsvp.guest_name,
      'meal', v_rsvp.meal,
      'dietary', v_rsvp.dietary,
      'arrival', v_rsvp.arrival,
      'departure', v_rsvp.departure,
      'hotel', v_rsvp.hotel,
      'transportationNeeds', v_rsvp.transportation_needs,
      'notes', v_rsvp.notes
    ) end
  );
end;
$$;

revoke all on function public.find_invitation(text, text) from public;
grant execute on function public.find_invitation(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- submit_rsvp — inserts or updates the one RSVP row for a guest.
-- Re-checks first/last name against guest_id server-side (defense in depth
-- against someone guessing another guest's id), and the unique(guest_id)
-- constraint + upsert means a second submission always updates the same
-- row instead of creating a duplicate.
-- ---------------------------------------------------------------------
create or replace function public.submit_rsvp(
  p_guest_id uuid,
  p_first_name text,
  p_last_name text,
  p_attending boolean,
  p_guest_name text,
  p_meal text,
  p_dietary text,
  p_arrival date,
  p_departure date,
  p_hotel text,
  p_transportation_needs text,
  p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest guests%rowtype;
begin
  select * into v_guest from guests where id = p_guest_id;

  if v_guest.id is null
     or lower(trim(v_guest.first_name)) <> lower(trim(p_first_name))
     or lower(trim(v_guest.last_name))  <> lower(trim(p_last_name)) then
    raise exception 'Invitation not found';
  end if;

  insert into rsvps (
    guest_id, attending, guest_name, meal, dietary,
    arrival, departure, hotel, transportation_needs, notes,
    submitted_at, updated_at
  ) values (
    v_guest.id, p_attending,
    case when p_attending then p_guest_name else null end,
    case when p_attending then p_meal else null end,
    case when p_attending then p_dietary else null end,
    case when p_attending then p_arrival else null end,
    case when p_attending then p_departure else null end,
    case when p_attending then p_hotel else null end,
    case when p_attending then p_transportation_needs else null end,
    p_notes,
    now(), now()
  )
  on conflict (guest_id) do update set
    attending = excluded.attending,
    guest_name = excluded.guest_name,
    meal = excluded.meal,
    dietary = excluded.dietary,
    arrival = excluded.arrival,
    departure = excluded.departure,
    hotel = excluded.hotel,
    transportation_needs = excluded.transportation_needs,
    notes = excluded.notes,
    updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.submit_rsvp(uuid, text, text, boolean, text, text, text, date, date, text, text, text) from public;
grant execute on function public.submit_rsvp(uuid, text, text, boolean, text, text, text, date, date, text, text, text) to anon, authenticated;
