import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (Platform.OS !== 'web' && !url) {
  console.warn('EXPO_PUBLIC_SUPABASE_URL is not set');
}
if (Platform.OS !== 'web' && !key) {
  console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
