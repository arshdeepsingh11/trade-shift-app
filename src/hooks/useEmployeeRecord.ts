import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import type { Employee } from '../types';

export function useEmployeeRecord() {
  const { profile } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'employee') {
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('employees')
      .select('*')
      .eq('user_id', profile.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load employee record:', error);
        }
        setEmployee(data as Employee | null);
        setLoading(false);
      });
  }, [profile]);

  return { employee, loading };
}