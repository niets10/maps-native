import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type VisitedRow = { country_code: string };

type VisitedCountriesValue = {
  visited: Set<string>;
  isLoading: boolean;
  error: string | null;
  toggle: (countryCode: string) => Promise<void>;
};

const EMPTY_VISITED: Set<string> = new Set();

const VisitedCountriesContext = createContext<VisitedCountriesValue | undefined>(undefined);

/**
 * Owns the single Supabase realtime subscription for the signed-in user's visited countries.
 * Must wrap every screen that reads `useVisitedCountries()` — Supabase reuses one channel per
 * topic, so subscribing to the same topic twice (e.g. from multiple mounted tab screens) throws
 * "cannot add postgres_changes callbacks ... after subscribe()".
 */
export function VisitedCountriesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [visited, setVisited] = useState<Set<string>>(EMPTY_VISITED);
  const [loadedForUserId, setLoadedForUserId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    supabase
      .from('visited_countries')
      .select('country_code')
      .eq('user_id', userId)
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setVisited(new Set((data as VisitedRow[]).map((row) => row.country_code)));
        }
        setLoadedForUserId(userId);
      });

    const channel = supabase
      .channel(`visited_countries:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visited_countries', filter: `user_id=eq.${userId}` },
        (payload) => {
          setVisited((current) => {
            const next = new Set(current);
            if (payload.eventType === 'DELETE') {
              next.delete((payload.old as VisitedRow).country_code);
            } else {
              next.add((payload.new as VisitedRow).country_code);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const toggle = useCallback(
    async (countryCode: string) => {
      if (!userId) return;
      const isVisited = visited.has(countryCode);

      setVisited((current) => {
        const next = new Set(current);
        if (isVisited) next.delete(countryCode);
        else next.add(countryCode);
        return next;
      });

      const result = isVisited
        ? await supabase
            .from('visited_countries')
            .delete()
            .eq('user_id', userId)
            .eq('country_code', countryCode)
        : await supabase
            .from('visited_countries')
            .insert({ user_id: userId, country_code: countryCode });

      if (result.error) {
        setError(result.error.message);
        setVisited((current) => {
          const next = new Set(current);
          if (isVisited) next.add(countryCode);
          else next.delete(countryCode);
          return next;
        });
      }
    },
    [userId, visited]
  );

  const value = useMemo<VisitedCountriesValue>(() => {
    if (!userId) return { visited: EMPTY_VISITED, isLoading: false, error, toggle };
    return { visited, isLoading: loadedForUserId !== userId, error, toggle };
  }, [userId, visited, loadedForUserId, error, toggle]);

  return <VisitedCountriesContext.Provider value={value}>{children}</VisitedCountriesContext.Provider>;
}

export function useVisitedCountries() {
  const context = useContext(VisitedCountriesContext);
  if (!context) throw new Error('useVisitedCountries must be used within a VisitedCountriesProvider');
  return context;
}
