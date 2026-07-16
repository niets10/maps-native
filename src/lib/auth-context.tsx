import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getRedirectUrl() {
  return Linking.createURL('auth/callback');
}

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.'
    );
  }
}

async function applySessionFromUrl(url: string) {
  const { params, errorCode } = QueryParamsFromUrl(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

function QueryParamsFromUrl(url: string) {
  const parsed = new URL(url.replace('#', '?'));
  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  const errorCode = params.error_code ?? params.error ?? null;
  return { params, errorCode };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web') return;

    const subscription = Linking.addEventListener('url', ({ url }) => {
      applySessionFromUrl(url).catch((error) => {
        console.warn('Failed to apply session from deep link', error);
      });
    });

    return () => subscription.remove();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      async signInWithPassword(email, password) {
        assertConfigured();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUpWithPassword(email, password) {
        assertConfigured();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: getRedirectUrl() },
        });
        if (error) throw error;
      },
      async signInWithMagicLink(email) {
        assertConfigured();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: getRedirectUrl() },
        });
        if (error) throw error;
      },
      async signInWithGoogle() {
        assertConfigured();
        const redirectTo = getRedirectUrl();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
        });
        if (error) throw error;
        if (Platform.OS === 'web' || !data?.url) return;

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          await applySessionFromUrl(result.url);
        }
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
