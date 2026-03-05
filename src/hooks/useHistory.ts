'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getUserHistory,
  filterHistoryByPeriod,
  calculatePeriodStats,
} from '@/services/api/historyService';
import { useAuth } from '@/contexts';
import type { ChargingHistory } from '@/types';

const DEMO_EMAILS = ['demo@perun.sk', 'test@perun.sk'];

export type HistoryPeriod = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear';

export function useHistory(period: HistoryPeriod = 'all') {
  const { user } = useAuth();
  const isDemoAccount = user?.email ? DEMO_EMAILS.includes(user.email.toLowerCase()) : false;

  const query = useQuery({
    queryKey: ['history', isDemoAccount],
    queryFn: () => isDemoAccount ? getUserHistory() : Promise.resolve({ sessions: [], totalEnergy: 0, totalCost: 0, totalSessions: 0 }),
    staleTime: 60 * 1000, // 1 minúta
  });

  // Filtrovať podľa obdobia
  const filteredSessions = query.data
    ? filterHistoryByPeriod(query.data.sessions, period)
    : [];

  // Prepočítať štatistiky pre filtrované dáta
  const stats = calculatePeriodStats(filteredSessions);

  const filteredHistory: ChargingHistory | undefined = query.data
    ? {
        sessions: filteredSessions,
        totalEnergy: stats.totalEnergy,
        totalCost: stats.totalCost,
        totalSessions: stats.totalSessions,
      }
    : undefined;

  return {
    ...query,
    data: filteredHistory,
    stats,
  };
}
