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

type VisitedRow = { country_code: string; notes: string | null; visited_year: number | null };

type SaveCountryOptions = {
  isVisited: boolean;
  notes: string;
  visitedYear: number | null;
};

type VisitedCountriesValue = {
  visited: Set<string>;
  notesByCountry: Map<string, string>;
  yearByCountry: Map<string, number>;
  isLoading: boolean;
  error: string | null;
  toggle: (countryCode: string) => Promise<void>;
  saveCountry: (countryCode: string, options: SaveCountryOptions) => Promise<void>;
};

const EMPTY_VISITED: Set<string> = new Set();
const EMPTY_NOTES: Map<string, string> = new Map();
const EMPTY_YEARS: Map<string, number> = new Map();

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
  const [notesByCountry, setNotesByCountry] = useState<Map<string, string>>(EMPTY_NOTES);
  const [yearByCountry, setYearByCountry] = useState<Map<string, number>>(EMPTY_YEARS);
  const [loadedForUserId, setLoadedForUserId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    supabase
      .from('visited_countries')
      .select('country_code, notes, visited_year')
      .eq('user_id', userId)
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          const rows = data as VisitedRow[];
          setVisited(new Set(rows.map((row) => row.country_code)));
          setNotesByCountry(
            new Map(rows.filter((row) => row.notes).map((row) => [row.country_code, row.notes!]))
          );
          setYearByCountry(
            new Map(
              rows
                .filter((row) => row.visited_year != null)
                .map((row) => [row.country_code, row.visited_year!])
            )
          );
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
          setNotesByCountry((current) => {
            const next = new Map(current);
            if (payload.eventType === 'DELETE') {
              next.delete((payload.old as VisitedRow).country_code);
            } else {
              const row = payload.new as VisitedRow;
              if (row.notes) next.set(row.country_code, row.notes);
              else next.delete(row.country_code);
            }
            return next;
          });
          setYearByCountry((current) => {
            const next = new Map(current);
            if (payload.eventType === 'DELETE') {
              next.delete((payload.old as VisitedRow).country_code);
            } else {
              const row = payload.new as VisitedRow;
              if (row.visited_year != null) next.set(row.country_code, row.visited_year);
              else next.delete(row.country_code);
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
      if (isVisited) {
        setNotesByCountry((current) => {
          const next = new Map(current);
          next.delete(countryCode);
          return next;
        });
        setYearByCountry((current) => {
          const next = new Map(current);
          next.delete(countryCode);
          return next;
        });
      }

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

  const saveCountry = useCallback(
    async (countryCode: string, { isVisited, notes, visitedYear }: SaveCountryOptions) => {
      if (!userId) return;
      const wasVisited = visited.has(countryCode);
      const previousNotes = notesByCountry.get(countryCode);
      const previousYear = yearByCountry.get(countryCode);
      const trimmedNotes = notes.trim();

      setVisited((current) => {
        const next = new Set(current);
        if (isVisited) next.add(countryCode);
        else next.delete(countryCode);
        return next;
      });
      setNotesByCountry((current) => {
        const next = new Map(current);
        if (isVisited && trimmedNotes) next.set(countryCode, trimmedNotes);
        else next.delete(countryCode);
        return next;
      });
      setYearByCountry((current) => {
        const next = new Map(current);
        if (isVisited && visitedYear != null) next.set(countryCode, visitedYear);
        else next.delete(countryCode);
        return next;
      });

      const result = isVisited
        ? await supabase.from('visited_countries').upsert(
            {
              user_id: userId,
              country_code: countryCode,
              notes: trimmedNotes || null,
              visited_year: visitedYear,
            },
            { onConflict: 'user_id,country_code' }
          )
        : wasVisited
          ? await supabase
              .from('visited_countries')
              .delete()
              .eq('user_id', userId)
              .eq('country_code', countryCode)
          : { error: null };

      if (result.error) {
        setError(result.error.message);
        setVisited((current) => {
          const next = new Set(current);
          if (wasVisited) next.add(countryCode);
          else next.delete(countryCode);
          return next;
        });
        setNotesByCountry((current) => {
          const next = new Map(current);
          if (wasVisited && previousNotes) next.set(countryCode, previousNotes);
          else next.delete(countryCode);
          return next;
        });
        setYearByCountry((current) => {
          const next = new Map(current);
          if (wasVisited && previousYear != null) next.set(countryCode, previousYear);
          else next.delete(countryCode);
          return next;
        });
      }
    },
    [userId, visited, notesByCountry, yearByCountry]
  );

  const value = useMemo<VisitedCountriesValue>(() => {
    if (!userId) {
      return {
        visited: EMPTY_VISITED,
        notesByCountry: EMPTY_NOTES,
        yearByCountry: EMPTY_YEARS,
        isLoading: false,
        error,
        toggle,
        saveCountry,
      };
    }
    return {
      visited,
      notesByCountry,
      yearByCountry,
      isLoading: loadedForUserId !== userId,
      error,
      toggle,
      saveCountry,
    };
  }, [userId, visited, notesByCountry, yearByCountry, loadedForUserId, error, toggle, saveCountry]);

  return <VisitedCountriesContext.Provider value={value}>{children}</VisitedCountriesContext.Provider>;
}

export function useVisitedCountries() {
  const context = useContext(VisitedCountriesContext);
  if (!context) throw new Error('useVisitedCountries must be used within a VisitedCountriesProvider');
  return context;
}
