import type { ChargingSession, ChargingHistory } from '@/types';

interface HistoryFilters {
  startDate?: string;
  endDate?: string;
  stationId?: string;
  limit?: number;
  offset?: number;
}

// Získanie histórie nabíjaní používateľa
// TODO: Implementovať server-side proxy pre /api/ecarup/history keď bude API dostupné
export async function getUserHistory(filters?: HistoryFilters): Promise<ChargingHistory> {
  // Zatiaľ vrátime mock dáta - eCarUp API nepodporuje históriu pre client credentials
  console.log('getUserHistory: Using mock data (API not available for client credentials)', filters);
  return getMockHistory();
}

// Získanie histórie nabíjaní pre stanicu
export async function getStationHistory(stationId: string): Promise<ChargingSession[]> {
  // Zatiaľ vrátime prázdne pole - eCarUp API nepodporuje históriu pre client credentials
  console.log('getStationHistory: Using mock data (API not available)', stationId);
  return [];
}

// Získanie detailu relácie
export async function getSessionDetails(sessionId: string): Promise<ChargingSession | null> {
  try {
    const history = await getUserHistory();
    return history.sessions.find((s) => s.id === sessionId) || null;
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    return null;
  }
}

// Štatistiky za obdobie
export interface PeriodStats {
  totalEnergy: number;
  totalCost: number;
  totalSessions: number;
  averageSessionDuration: number; // minúty
  averageEnergyPerSession: number;
  averageCostPerSession: number;
  mostUsedStation?: string;
}

export function calculatePeriodStats(sessions: ChargingSession[]): PeriodStats {
  if (sessions.length === 0) {
    return {
      totalEnergy: 0,
      totalCost: 0,
      totalSessions: 0,
      averageSessionDuration: 0,
      averageEnergyPerSession: 0,
      averageCostPerSession: 0,
    };
  }

  const totalEnergy = sessions.reduce((sum, s) => sum + s.energyDelivered, 0);
  const totalCost = sessions.reduce((sum, s) => sum + s.cost, 0);

  // Výpočet priemerného trvania
  let totalDuration = 0;
  sessions.forEach((s) => {
    if (s.startTime && s.endTime) {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      totalDuration += (end - start) / 60000; // minúty
    }
  });

  // Nájdenie najpoužívanejšej stanice
  const stationCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    stationCounts[s.stationName] = (stationCounts[s.stationName] || 0) + 1;
  });
  const mostUsedStation = Object.entries(stationCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    totalEnergy: Math.round(totalEnergy * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100,
    totalSessions: sessions.length,
    averageSessionDuration: Math.round(totalDuration / sessions.length),
    averageEnergyPerSession: Math.round((totalEnergy / sessions.length) * 10) / 10,
    averageCostPerSession: Math.round((totalCost / sessions.length) * 100) / 100,
    mostUsedStation,
  };
}

// Filtrovanie histórie podľa obdobia
export function filterHistoryByPeriod(
  sessions: ChargingSession[],
  period: 'all' | 'thisMonth' | 'lastMonth' | 'thisYear'
): ChargingSession[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return sessions.filter((session) => {
    const sessionDate = new Date(session.startTime);
    const sessionMonth = sessionDate.getMonth();
    const sessionYear = sessionDate.getFullYear();

    switch (period) {
      case 'thisMonth':
        return sessionMonth === currentMonth && sessionYear === currentYear;
      case 'lastMonth':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return sessionMonth === lastMonth && sessionYear === lastMonthYear;
      case 'thisYear':
        return sessionYear === currentYear;
      case 'all':
      default:
        return true;
    }
  });
}

// Mock dáta pre fallback
export function getMockHistory(): ChargingHistory {
  const sessions: ChargingSession[] = [
    {
      id: '1',
      stationId: 's1',
      stationName: 'Aupark Shopping Center',
      connectorId: 'c1',
      userId: 'u1',
      startTime: '2024-01-15T14:30:00',
      endTime: '2024-01-15T15:45:00',
      energyDelivered: 28.5,
      cost: 9.98,
      status: 'completed',
    },
    {
      id: '2',
      stationId: 's2',
      stationName: 'Eurovea',
      connectorId: 'c3',
      userId: 'u1',
      startTime: '2024-01-12T09:15:00',
      endTime: '2024-01-12T10:30:00',
      energyDelivered: 22.3,
      cost: 9.37,
      status: 'completed',
    },
    {
      id: '3',
      stationId: 's3',
      stationName: 'IKEA Bratislava',
      connectorId: 'c5',
      userId: 'u1',
      startTime: '2024-01-08T16:00:00',
      endTime: '2024-01-08T18:00:00',
      energyDelivered: 18.7,
      cost: 5.42,
      status: 'completed',
    },
    {
      id: '4',
      stationId: 's1',
      stationName: 'Aupark Shopping Center',
      connectorId: 'c2',
      userId: 'u1',
      startTime: '2024-01-05T11:00:00',
      endTime: '2024-01-05T11:45:00',
      energyDelivered: 35.2,
      cost: 12.32,
      status: 'completed',
    },
    {
      id: '5',
      stationId: 's4',
      stationName: 'Central Shopping Center',
      connectorId: 'c7',
      userId: 'u1',
      startTime: '2024-01-02T13:30:00',
      endTime: '2024-01-02T14:15:00',
      energyDelivered: 25.1,
      cost: 9.54,
      status: 'completed',
    },
  ];

  const totalEnergy = sessions.reduce((sum, s) => sum + s.energyDelivered, 0);
  const totalCost = sessions.reduce((sum, s) => sum + s.cost, 0);

  return {
    sessions,
    totalEnergy,
    totalCost,
    totalSessions: sessions.length,
  };
}
