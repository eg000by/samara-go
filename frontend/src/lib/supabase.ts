import { createClient } from '@supabase/supabase-js';

// anon-ключ публичный по дизайну — доступ ограничивает RLS на стороне Supabase.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
