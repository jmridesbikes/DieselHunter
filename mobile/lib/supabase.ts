import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (Platform.OS !== 'web' && !url) {
  console.warn('EXPO_PUBLIC_SUPABASE_URL is not set');
}
if (Platform.OS !== 'web' && !key) {
  console.warn(
    'Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Supabase API Keys → Publishable) or legacy EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** True when URL and a client-safe key (publishable or legacy anon) are set. */
export function hasSupabaseClientConfig(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
      (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  );
}
