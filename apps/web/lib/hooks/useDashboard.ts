'use client';

import useSWR from 'swr';
import { api } from '@/lib/api/client';

async function fetcher(url: string) {
  const res = await api.get(url);
  return res.data.data;
}

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/analytics/dashboard', fetcher, {
    refreshInterval: 60_000, // refresh every minute
    revalidateOnFocus: false,
  });

  return {
    stats: data as {
      totalVideos: number;
      totalViews: number;
      totalWatchTime: number;
      totalLikes: number;
      avgViralScore: number;
      platformStats: Array<{ platform: string; _sum: { views: number } }>;
    } | undefined,
    isLoading,
    error,
    refresh: mutate,
  };
}
