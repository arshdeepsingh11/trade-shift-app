import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import type { Employer } from '../types';

export function useEmployer() {
  const { profile } = useAuth();
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'employer') {
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('employers')
      .select('*')
      .eq('user_id', profile.id)
      .single()
      .then(({ data }) => {
        setEmployer(data as Employer | null);
        setLoading(false);
      });
  }, [profile]);

  return { employer, loading };
}