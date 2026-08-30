# Caitlin & Paul — Wedding Site

Static site for our wedding, October 16, 2027 in Mexico City.

## Pages

- `index.html` — home
- `our-story.html` — our story
- `the-wedding.html` — ceremony/weekend schedule, dress code, transportation
- `registry.html` — registry (coming soon)
- `travel.html` — travel info
- `stay.html` — neighborhoods and hotels
- `explore-cdmx.html` — things to do in Mexico City
- `faq.html` — FAQ
- `rsvp.html` — RSVP form (public)
- `rsvp-admin.html` — RSVP dashboard (private, login required — not linked from the nav)

## Editing content

Most editable text (dates, venue, schedule, hotels, FAQ answers, etc.) lives in
`assets/js/content.js` — update it there rather than in the HTML. Search for
`TBD` to find placeholders that still need real info.

## Running locally

No build step — just serve the folder:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Site password

Every public page (everything except `rsvp-admin.html`, which has its own real
login) is behind a simple shared password: **susie** (not case-sensitive).

- Entering it once stores a flag in the browser's `localStorage`, so a visitor
  isn't asked again on that device/browser.
- **This is not real security.** The password lives in plain text in
  `assets/js/site-gate.js`, visible to anyone who views page source. It's just
  a soft gate to keep search engines and randos who stumble on the URL from
  seeing wedding details before we're ready to share it widely — don't rely on
  it to hide anything sensitive.
- **To change the password**: edit the `PASSWORD` constant in
  `assets/js/site-gate.js`. Anyone who already unlocked the old password stays
  unlocked (the flag doesn't check which password was used) unless you also
  change `STORAGE_KEY` in that file to a new value, which forces everyone to
  re-enter it.
- **To remove the gate entirely** later (e.g. once the wedding's passed): 1)
  delete `assets/js/site-gate.js`, 2) remove the `<script src="assets/js/
  site-gate.js"></script>` line from each page, and 3) remove the inline
  `<script>if(localStorage.getItem('siteUnlocked')...</script>` snippet from
  each page's `<head>`.

## RSVP system (Supabase)

The RSVP form and admin dashboard are backed by a [Supabase](https://supabase.com)
project (Postgres + auth), not a custom server. There's no build step involved —
the browser talks to Supabase directly using the files below.

### How it works

- **`guests`** is the private guest list (name, household, email, plus-one info).
  It is never queried directly from the browser — RLS (Row Level Security) blocks
  all public access to it.
- **`rsvps`** holds one row per guest (`unique(guest_id)`), so a second submission
  always updates the existing row instead of creating a duplicate.
- On `rsvp.html`, a guest types their first + last name and the page calls the
  `find_invitation` Postgres function (via `supabase.rpc(...)`). That function
  runs with elevated privileges inside the database, looks the name up, and
  returns *only that guest's own invitation* — never a list. A guest can search
  again later to pull up and edit an existing RSVP.
- Submitting the form calls `submit_rsvp`, which re-checks the name against the
  guest id server-side (so knowing/guessing a guest id alone isn't enough to
  edit someone else's RSVP) and then inserts or updates their one `rsvps` row.
- `rsvp-admin.html` is gated by Supabase Auth (email + password). Only signed-in
  users can read `guests`/`rsvps` (via an `authenticated`-only RLS policy) —
  everyone else, including anyone who loads the page URL, sees nothing but the
  login form.
- The Supabase URL + anon/publishable key in `assets/js/supabase-config.js` are
  meant to be public — every request they authorize is still checked by RLS and
  the two functions above. The **secret key** (`sb_secret_...` / legacy
  `service_role` key) is never used anywhere in this repo — don't add it here,
  even to a "config" file, since it bypasses RLS entirely.

Where things live:

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Creates `guests` + `rsvps` tables and RLS policies |
| `supabase/functions.sql` | Creates `find_invitation` + `submit_rsvp` |
| `assets/js/supabase-config.js` | Project URL + public key (fill in once, per project) |
| `assets/js/rsvp.js` | Find-invitation + submit logic on `rsvp.html` |
| `assets/js/rsvp-admin.js` | Login + dashboard logic on `rsvp-admin.html` |

### One-time setup (new Supabase project)

1. **Create the project** — [supabase.com](https://supabase.com) → New Project.
   Set a database password (save it somewhere safe) and wait for it to provision.
2. **Create the tables** — SQL Editor → New query → paste all of
   `supabase/schema.sql` → Run. ("No rows returned" is the expected success
   message for `CREATE TABLE`/`GRANT` statements — it's not an error. An actual
   failure shows a red error message with details.)
3. **Create the lookup/submit functions** — SQL Editor → New query → paste all
   of `supabase/functions.sql` → Run.
4. **Connect the site** — Project Settings → API → copy the **Project URL** and
   the **anon public** (or "Default API Key" / `sb_publishable_...`) key into
   `assets/js/supabase-config.js` (`SUPABASE_URL` / `SUPABASE_ANON_KEY`). Never
   copy the **secret key** here.
5. **Import the guest list** — Table Editor → `guests` table → Insert →
   "Import data from CSV". Columns needed: `first_name, last_name, email,
   household, invited_plus_one, plus_one_name` (`invited_plus_one` is
   `true`/`false`; leave `id`/`created_at` out, they're generated automatically).
6. **Create admin logins** — Authentication → Users → Add user, once each for
   Caitlin and Paul (set an email + password directly). Then go to
   Authentication → Providers → Email and turn **off** "Allow new users to
   sign up," so no one else can create an account.

### Testing checklist

Do this once after setup, and again any time you change `schema.sql` or
`functions.sql`:

1. **Add a test guest** — Table Editor → `guests` → Insert row → your own
   first/last name (delete it when you're done, or leave it and just don't
   count it in the real headcount).
2. **Search for yourself** on `rsvp.html` → should land on the "Invitation
   found" step with your name.
3. **Submit an RSVP** → should show the confirmation screen.
4. **Check it saved** — Table Editor → `rsvps` should have one new row with
   your `guest_id`.
5. **Search again with the same name** → the form should come back pre-filled
   with what you just submitted, and the button should read "Update RSVP"
   instead of "Send RSVP." Submit a change and confirm the same row updated
   (not a second row) — this is the duplicate-prevention check.
6. **Sign in to the dashboard** — `rsvp-admin.html`, using one of the admin
   logins from setup step 6. You should see your test RSVP, correct stat
   counts, and be able to search/filter/export it.
7. **Confirm guests can't browse the list** — while signed out (or in an
   incognito window), visiting `rsvp-admin.html` should show only a login form,
   and searching an unknown name on `rsvp.html` should say "we couldn't find
   an invitation," never expose any other guest's info.

### Ongoing maintenance

- **Add/edit guests**: Table Editor → `guests`, any time — no code changes
  needed.
- **Add another admin**: Authentication → Users → Add user.
- **If the secret key is ever exposed** (pasted somewhere public, shared by
  accident): Project Settings → API → regenerate it. It isn't used in this
  repo, so rotating it breaks nothing here.
- **Changing RSVP form fields**: update the form fields in `rsvp.html`, the
  columns in `supabase/schema.sql`, and the parameters in `submit_rsvp` inside
  `supabase/functions.sql` together — they need to stay in sync.
