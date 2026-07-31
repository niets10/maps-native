import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setDisplayName(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Failed to load profile', error.message);
          setDisplayName(null);
        } else {
          setDisplayName(data?.display_name ?? null);
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { displayName, isLoading };
}
