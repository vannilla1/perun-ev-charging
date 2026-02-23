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

// Extended states to include payment flow
export type ChargingState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connector_select'
  | 'station_info'
  | 'payment'        // Guest payment collection
  | 'authorizing'    // Pre-auth in progress
  | 'starting'       // OCPP start in progress
  | 'charging'
  | 'stopping'
  | 'completed'
  | 'error';

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
  pricePerH: number;
  status: string;
  originalUrl?: string;
}

interface ConnectorOption {
  id: string;
  number: number;
  name: string;
  plugType: string;
  maxPower: number | null;
  state: string;
}

interface StationOverview {
  stationId: string;
  name: string;
  address: string;
  connectors: ConnectorOption[];
}

interface GuestPaymentInfo {
  email: string;
  paymentIntentId: string;
  preAuthAmount: number;
  clientSecret: string;
}

interface UseChargingResult {
  state: ChargingState;
  sessionId: string | null;
  stats: ChargingStats;
  stationInfo: StationInfo | null;
  stationOverview: StationOverview | null;
  error: string | null;
  isGuest: boolean;
  guestPaymentInfo: GuestPaymentInfo | null;
  preAuthAmount: number;
  startScanning: () => void;
  stopScanning: () => void;
  handleQRScan: (data: string) => void;
  handleManualCode: (code: string) => void;
  loadStation: (stationId: string) => void;
  selectConnector: (connector: ConnectorOption) => void;
  confirmStartCharging: () => void;
  initiateGuestPayment: () => void;
  createPreAuth: (email: string) => Promise<void>;
  confirmGuestPayment: (paymentIntentId: string, email: string) => void;
  startGuestCharging: () => Promise<void>;
  stopSession: () => void;
  reset: () => void;
  formatDuration: typeof formatDuration;
}

const DEFAULT_PREAUTH_AMOUNT = 30; // EUR

export function useCharging(): UseChargingResult {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ChargingState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [stationOverview, setStationOverview] = useState<StationOverview | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestPaymentInfo, setGuestPaymentInfo] = useState<GuestPaymentInfo | null>(null);
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
        pricePerKwh: data.pricing?.pricePerKwh ?? 0,
        pricePerH: data.pricing?.pricePerHour ?? 0,
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

  // Mutation pre načítanie konektorov stanice (priamy flow z mapy)
  const stationConnectorsMutation = useMutation({
    mutationFn: async (stationId: string) => {
      const res = await fetch(`/api/charging/station-connectors?stationId=${stationId}`);
      if (!res.ok) throw new Error('Nepodarilo sa načítať konektory');
      return res.json();
    },
    onSuccess: (data) => {
      setStationOverview({
        stationId: data.stationId,
        name: data.name,
        address: data.address,
        connectors: data.connectors,
      });
      setState('connector_select');
      setError(null);
    },
    onError: (err) => {
      setState('error');
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať stanicu');
    },
  });

  // Mutation pre spustenie nabíjania (pre registrovaných)
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

  // Mutation pre vytvorenie predautorizácie
  const preAuthMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await fetch('/api/payments/preauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          stationId: stationInfo?.stationId,
          connectorId: stationInfo?.connectorId,
          stationName: stationInfo?.name,
          amount: DEFAULT_PREAUTH_AMOUNT,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa vytvoriť predautorizáciu');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGuestPaymentInfo({
        email: '',
        paymentIntentId: data.paymentIntentId,
        preAuthAmount: data.preAuthAmount,
        clientSecret: data.clientSecret,
      });
      // State zostáva na 'payment' - čakáme na potvrdenie platby
    },
    onError: (err) => {
      setState('error');
      setError(err instanceof Error ? err.message : 'Nepodarilo sa vytvoriť predautorizáciu');
    },
  });

  // Mutation pre spustenie guest nabíjania cez OCPP
  const guestStartMutation = useMutation({
    mutationFn: async () => {
      if (!stationInfo || !guestPaymentInfo) {
        throw new Error('Chýbajú údaje pre spustenie nabíjania');
      }

      const response = await fetch('/api/charging/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: stationInfo.stationId,
          connectorId: stationInfo.connectorId,
          isGuest: true,
          paymentIntentId: guestPaymentInfo.paymentIntentId,
          email: guestPaymentInfo.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa spustiť nabíjanie');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setState('charging');
      setStats(prev => ({
        ...prev,
        power: stationInfo?.maxPower || 22,
      }));
      setError(null);
    },
    onError: async (err) => {
      // Zrušiť predautorizáciu pri zlyhaní
      if (guestPaymentInfo?.paymentIntentId) {
        try {
          await fetch('/api/payments/cancel-preauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: guestPaymentInfo.paymentIntentId,
              reason: 'abandoned',
            }),
          });
        } catch (cancelError) {
          console.error('Failed to cancel pre-auth:', cancelError);
        }
      }
      setState('error');
      setError(err instanceof Error ? err.message : 'Nepodarilo sa spustiť nabíjanie');
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
          cost: (prev.energy + (prev.power / 3600)) * (stationInfo?.pricePerKwh ?? 0),
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

  // Priame načítanie stanice z mapy (bez QR)
  const loadStation = useCallback((stationId: string) => {
    setState('connecting');
    stationConnectorsMutation.mutate(stationId);
  }, [stationConnectorsMutation]);

  // Výber konektora — načíta detail cez existujúci info endpoint
  const selectConnector = useCallback((connector: ConnectorOption) => {
    if (!stationOverview) return;
    setState('connecting');
    stationInfoMutation.mutate({
      stationId: stationOverview.stationId,
      connectorId: connector.id,
    });
  }, [stationOverview, stationInfoMutation]);

  // Pre registrovaných používateľov
  const confirmStartCharging = useCallback(() => {
    if (stationInfo) {
      setIsGuest(false);
      setState('connecting');
      startMutation.mutate({
        stationId: stationInfo.stationId,
        connectorId: stationInfo.connectorId,
        originalUrl: stationInfo.originalUrl,
      });
    }
  }, [stationInfo, startMutation]);

  // Inicializácia guest platobného procesu
  const initiateGuestPayment = useCallback(() => {
    setIsGuest(true);
    setState('payment');
    setError(null);
  }, []);

  // Vytvorenie predautorizácie
  const createPreAuth = useCallback(async (email: string) => {
    setState('authorizing');
    preAuthMutation.mutate({ email });
  }, [preAuthMutation]);

  // Potvrdenie platby (po úspešnej Stripe autorizácii)
  const confirmGuestPayment = useCallback((paymentIntentId: string, email: string) => {
    setGuestPaymentInfo(prev => prev ? {
      ...prev,
      paymentIntentId,
      email,
    } : {
      email,
      paymentIntentId,
      preAuthAmount: DEFAULT_PREAUTH_AMOUNT,
      clientSecret: '',
    });
    setState('starting');
  }, []);

  // Spustenie guest nabíjania
  const startGuestCharging = useCallback(async () => {
    guestStartMutation.mutate();
  }, [guestStartMutation]);

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
    setStationOverview(null);
    setError(null);
    setIsGuest(false);
    setGuestPaymentInfo(null);
    setStats({ power: 0, energy: 0, duration: 0, cost: 0 });
  }, []);

  return {
    state,
    sessionId,
    stats,
    stationInfo,
    stationOverview,
    error,
    isGuest,
    guestPaymentInfo,
    preAuthAmount: DEFAULT_PREAUTH_AMOUNT,
    startScanning,
    stopScanning,
    handleQRScan,
    handleManualCode,
    loadStation,
    selectConnector,
    confirmStartCharging,
    initiateGuestPayment,
    createPreAuth,
    confirmGuestPayment,
    startGuestCharging,
    stopSession,
    reset,
    formatDuration,
  };
}
