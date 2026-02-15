'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  startCharging,
  stopCharging,
  getSessionStatus,
  parseStationQRCode,
  formatDuration,
  getStationInfo,
} from '@/services/api/chargingService';

export type ChargingState = 'idle' | 'scanning' | 'connecting' | 'station_info' | 'charging' | 'stopping' | 'completed' | 'error';

interface ChargingStats {
  power: number;
  energy: number;
  duration: number;
  cost: number;
}

interface StationInfo {
  stationId: string;
  connectorId: string;
  name: string;
  address: string;
  maxPower: number | null;
  plugType: string;
  pricePerKwh: number;
  status: string;
  originalUrl?: string;
}

interface UseChargingResult {
  state: ChargingState;
  sessionId: string | null;
  stats: ChargingStats;
  stationInfo: StationInfo | null;
  error: string | null;
  startScanning: () => void;
  stopScanning: () => void;
  handleQRScan: (data: string) => void;
  handleManualCode: (code: string) => void;
  confirmStartCharging: () => void;
  stopSession: () => void;
  reset: () => void;
  formatDuration: typeof formatDuration;
}

export function useCharging(): UseChargingResult {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ChargingState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [stats, setStats] = useState<ChargingStats>({
    power: 0,
    energy: 0,
    duration: 0,
    cost: 0,
  });

  // Mutation pre získanie info o stanici
  const stationInfoMutation = useMutation({
    mutationFn: ({ stationId, connectorId, originalUrl }: { stationId: string; connectorId: string; originalUrl?: string }) =>
      getStationInfo(stationId, connectorId, originalUrl),
    onSuccess: (data) => {
      if (data.redirectUrl) {
        // Ak API vráti redirect URL, presmerujeme na eCarUp
        window.location.href = data.redirectUrl;
        return;
      }
      setStationInfo({
        stationId: data.stationId || '',
        connectorId: data.connectorId || '',
        name: data.station?.name || 'Neznáma stanica',
        address: data.station?.address || '',
        maxPower: data.station?.maxPower || null,
        plugType: data.station?.plugType || 'Type 2',
        pricePerKwh: data.pricing?.pricePerKwh || 0.44,
        status: data.status || 'available',
        originalUrl: data.originalUrl,
      });
      setState('station_info');
      setError(null);
    },
    onError: (err) => {
      setState('error');
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať informácie o stanici');
    },
  });

  // Mutation pre spustenie nabíjania
  const startMutation = useMutation({
    mutationFn: ({ stationId, connectorId, originalUrl }: { stationId: string; connectorId: string; originalUrl?: string }) =>
      startCharging(stationId, connectorId, originalUrl),
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setSessionId(data.sessionId || null);
      setState('charging');
      // Nastavíme počiatočný výkon
      setStats(prev => ({
        ...prev,
        power: stationInfo?.maxPower || 22,
      }));
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
    refetchInterval: 2000,
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
          cost: (prev.energy + (prev.power / 3600)) * (stationInfo?.pricePerKwh || 0.44),
        }));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state, sessionStatus, stationInfo?.pricePerKwh]);

  const startScanning = useCallback(() => {
    setState('scanning');
    setError(null);
  }, []);

  const stopScanning = useCallback(() => {
    setState('idle');
  }, []);

  const handleQRScan = useCallback((data: string) => {
    console.log('QR Scan received:', data);
    const parsed = parseStationQRCode(data);
    console.log('QR Parse result:', parsed);

    if (parsed) {
      setState('connecting');
      // Získame info o stanici namiesto priameho štartu nabíjania
      setTimeout(() => {
        stationInfoMutation.mutate({
          stationId: parsed.stationId,
          connectorId: parsed.connectorId || 'default',
          originalUrl: parsed.originalUrl,
        });
      }, 1000);
    } else {
      console.error('Failed to parse QR code:', data);
      const truncatedData = data.length > 100 ? data.substring(0, 100) + '...' : data;
      setError(`Neplatný QR kód. Data: "${truncatedData}"`);
      setState('error');
    }
  }, [stationInfoMutation]);

  const handleManualCode = useCallback((code: string) => {
    if (code.length >= 4) {
      setState('connecting');
      setTimeout(() => {
        stationInfoMutation.mutate({
          stationId: code,
          connectorId: 'default',
        });
      }, 1000);
    } else {
      setError('Kód musí mať aspoň 4 znaky');
    }
  }, [stationInfoMutation]);

  // Nová funkcia - používateľ potvrdzuje začatie nabíjania
  const confirmStartCharging = useCallback(() => {
    if (stationInfo) {
      setState('connecting');
      startMutation.mutate({
        stationId: stationInfo.stationId,
        connectorId: stationInfo.connectorId,
        originalUrl: stationInfo.originalUrl,
      });
    }
  }, [stationInfo, startMutation]);

  const stopSession = useCallback(() => {
    if (sessionId) {
      setState('stopping');
      stopMutation.mutate(sessionId);
    }
  }, [sessionId, stopMutation]);

  const reset = useCallback(() => {
    setState('idle');
    setSessionId(null);
    setStationInfo(null);
    setError(null);
    setStats({ power: 0, energy: 0, duration: 0, cost: 0 });
  }, []);

  return {
    state,
    sessionId,
    stats,
    stationInfo,
    error,
    startScanning,
    stopScanning,
    handleQRScan,
    handleManualCode,
    confirmStartCharging,
    stopSession,
    reset,
    formatDuration,
  };
}
