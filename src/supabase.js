import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loudly at startup rather than with a confusing network error on the
// first query. Placeholders count as unset: a .env copied from the example but
// never filled in is the failure that looks like everything is fine.
// A legacy anon key is a JWT of a few hundred characters; a publishable key is
// only 46, so it is recognised by prefix. sb_secret_ keys still fail here.
if (
  !url ||
  !key ||
  url.includes('xxxxx') ||
  url.includes('placeholder') ||
  (key.length < 60 && !key.startsWith('sb_publishable_'))
) {
  throw new Error(
    'Supabase belum dikonfigurasi. Salin .env.example jadi .env, lalu isi ' +
      'VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY dari Supabase → Settings → API.',
  );
}

export const supabase = createClient(url, key);
