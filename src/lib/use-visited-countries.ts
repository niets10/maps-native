import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type VisitedRow = { country_code: string };

const EMPTY_VISITED: Set<string> = new Set();

export function useVisitedCountries() {
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

  return useMemo(() => {
    if (!userId) return { visited: EMPTY_VISITED, isLoading: false, error, toggle };
    return { visited, isLoading: loadedForUserId !== userId, error, toggle };
  }, [userId, visited, loadedForUserId, error, toggle]);
}
