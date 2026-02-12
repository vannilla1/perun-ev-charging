'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  startCharging,
  stopCharging,
  getSessionStatus,
  parseStationQRCode,
  formatDuration,
} from '@/services/api/chargingService';

export type ChargingState = 'idle' | 'scanning' | 'connecting' | 'charging' | 'stopping' | 'completed' | 'error';

interface ChargingStats {
  power: number;
  energy: number;
  duration: number;
  cost: number;
}

interface UseChargingResult {
  state: ChargingState;
  sessionId: string | null;
  stats: ChargingStats;
  error: string | null;
  startScanning: () => void;
  stopScanning: () => void;
  handleQRScan: (data: string) => void;
  handleManualCode: (code: string) => void;
  stopSession: () => void;
  reset: () => void;
  formatDuration: typeof formatDuration;
}

export function useCharging(): UseChargingResult {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ChargingState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ChargingStats>({
    power: 0,
    energy: 0,
    duration: 0,
    cost: 0,
  });

  // Mutation pre spustenie nabíjania
  const startMutation = useMutation({
    mutationFn: ({ stationId, connectorId }: { stationId: string; connectorId: string }) =>
      startCharging(stationId, connectorId),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setState('charging');
      setError(null);
    },
    onError: (err) => {
      setState('error');
      setError(err instanceof Error ? err.message : 'Nepodarilo sa spustiť nabíjanie');
    },
  });

  // Mutation pre zastavenie nabíjania
  const stopMutation = useMutation({
    mutationFn: (sessionId: string) => stopCharging(sessionId),
    onSuccess: (data) => {
      setState('completed');
      setStats({
        power: 0,
        energy: data.session.energyDelivered,
        duration: 0,
        cost: data.session.cost,
      });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (err) => {
      setState('error');
      setError(err instanceof Error ? err.message : 'Nepodarilo sa zastaviť nabíjanie');
    },
  });

  // Polling pre stav relácie
  const { data: sessionStatus } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionStatus(sessionId!),
    enabled: state === 'charging' && sessionId !== null,
    refetchInterval: 2000, // Každé 2 sekundy
  });

  // Aktualizácia štatistík z pollingu
  useEffect(() => {
    if (sessionStatus && state === 'charging') {
      setStats({
        power: sessionStatus.currentPower,
        energy: sessionStatus.energyDelivered,
        duration: sessionStatus.duration,
        cost: sessionStatus.estimatedCost,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  // Lokálny timer pre duration ak nie je polling
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state === 'charging' && !sessionStatus) {
      interval = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          duration: prev.duration + 1,
          energy: prev.energy + (prev.power / 3600),
          cost: (prev.energy + (prev.power / 3600)) * 0.35,
        }));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state, sessionStatus]);

  const startScanning = useCallback(() => {
    setState('scanning');
    setError(null);
  }, []);

  const stopScanning = useCallback(() => {
    setState('idle');
  }, []);

  const handleQRScan = useCallback((data: string) => {
    const parsed = parseStationQRCode(data);

    if (parsed) {
      setState('connecting');
      // Simulácia pripojenia
      setTimeout(() => {
        startMutation.mutate({
          stationId: parsed.stationId,
          connectorId: parsed.connectorId || 'default',
        });
      }, 1500);
    } else {
      setError('Neplatný QR kód');
      setState('error');
    }
  }, [startMutation]);

  const handleManualCode = useCallback((code: string) => {
    if (code.length >= 4) {
      setState('connecting');
      setTimeout(() => {
        startMutation.mutate({
          stationId: code,
          connectorId: 'default',
        });
      }, 1500);
    } else {
      setError('Kód musí mať aspoň 4 znaky');
    }
  }, [startMutation]);

  const stopSession = useCallback(() => {
    if (sessionId) {
      setState('stopping');
      stopMutation.mutate(sessionId);
    }
  }, [sessionId, stopMutation]);

  const reset = useCallback(() => {
    setState('idle');
    setSessionId(null);
    setError(null);
    setStats({ power: 0, energy: 0, duration: 0, cost: 0 });
  }, []);

  return {
    state,
    sessionId,
    stats,
    error,
    startScanning,
    stopScanning,
    handleQRScan,
    handleManualCode,
    stopSession,
    reset,
    formatDuration,
  };
}
