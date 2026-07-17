import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Degrade gracefully instead of throwing at module load. A top-level throw
  // here happens before React (and the error boundary / global reporters) is
  // ready, producing an unrecoverable blank screen. With a syntactically valid
  // placeholder the app still mounts; network calls then fail and are handled
  // by the existing try/catch + error boundary paths, and this message is
  // visible in the console for diagnosis.
  console.error(
    'Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
