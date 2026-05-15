'use client';

import useSWR from 'swr';
import { api } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: 'FREE' | 'PRO' | 'BUSINESS';
  isAdmin: boolean;
}

async function fetchMe(): Promise<AuthUser> {
  const res = await api.get('/auth/me');
  return res.data.data;
}

export function useAuth() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<AuthUser>(
    typeof window !== 'undefined' && localStorage.getItem('autoviral_token')
      ? '/auth/me'
      : null,
    fetchMe,
    { revalidateOnFocus: false }
  );

  const logout = useCallback(() => {
    localStorage.removeItem('autoviral_token');
    router.replace('/login');
  }, [router]);

  return { user: data, error, isLoading, logout, mutate };
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('autoviral_token');
}
