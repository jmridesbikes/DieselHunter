import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        setUserId(session.user.id);
        setReady(true);
        return;
      }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (error) {
        setAuthError(new Error(error.message));
        setReady(true);
        return;
      }
      setUserId(data.user?.id ?? null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { userId, ready, authError };
}
