'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getUserHistory,
  filterHistoryByPeriod,
  calculatePeriodStats,
} from '@/services/api/historyService';
import type { ChargingHistory } from '@/types';

export type HistoryPeriod = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear';

export function useHistory(period: HistoryPeriod = 'all') {
  const query = useQuery({
    queryKey: ['history'],
    queryFn: () => getUserHistory(),
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
