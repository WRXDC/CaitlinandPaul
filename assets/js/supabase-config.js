/* ==========================================================================
   SUPABASE CONFIG
   Fill these in after creating your Supabase project — see the setup notes
   from Claude / the project README for exact steps.

   The URL + anon key are meant to be public: every request they authorize is
   still checked by Row Level Security and the find_invitation/submit_rsvp
   functions on the server, so this file holds no real secret. The one key
   that must NEVER go here (or anywhere in this repo) is the secret key
   (sb_secret_... / the legacy service_role key).
   ========================================================================== */
const SUPABASE_URL = "https://wdgzrbqherxrqlxndtnt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ixqcm3zfBamwr6FuQEK3sQ_qXWznn5L";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
