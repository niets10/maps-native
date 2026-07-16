import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import { SetupScreen } from '@/components/setup-screen';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
