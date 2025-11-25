import { createClient } from '@supabase/supabase-js';

// ✅ POR ENQUANTO: valores direto aqui
const SUPABASE_URL = 'https://wksbxreajxkzwhvngege.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrc2J4cmVhanhrendodm5nZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTUxOTgsImV4cCI6MjA3OTU5MTE5OH0.5Dto7MtTQthEdy86LjZDQhjhufzb_hShzz5Nwe0YqNI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);