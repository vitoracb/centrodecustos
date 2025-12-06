import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Carrega variáveis de ambiente
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 
                     process.env.EXPO_PUBLIC_SUPABASE_URL ||
                     'https://wksbxreajxkzwhvngege.supabase.co';

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey ||
                          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrc2J4cmVhanhrendodm5nZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTUxOTgsImV4cCI6MjA3OTU5MTE5OH0.5Dto7MtTQthEdy86LjZDQhjhufzb_hShzz5Nwe0YqNI';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});