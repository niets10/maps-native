import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const isWeb = Platform.OS === 'web';

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // On web, supabase-js falls back to `window.localStorage` automatically.
        // On native we need AsyncStorage so sessions survive app restarts.
        storage: isWeb ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: isWeb,
        lock: isWeb ? undefined : processLock,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
