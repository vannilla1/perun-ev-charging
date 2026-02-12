'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  registerServiceWorker,
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
  isServiceWorkerSupported,
} from '@/services/notifications';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  notificationPermission: NotificationPermission | 'unsupported';
  isLoading: boolean;
  error: string | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    registration: null,
    notificationPermission: 'unsupported',
    isLoading: true,
    error: null,
  });

  // Registrácia Service Worker pri načítaní
  useEffect(() => {
    async function init() {
      const swSupported = isServiceWorkerSupported();
      const notifSupported = isNotificationSupported();

      if (!swSupported) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isLoading: false,
        }));
        return;
      }

      try {
        const registration = await registerServiceWorker();
        const permission = notifSupported ? getNotificationPermission() : 'unsupported';

        setState({
          isSupported: true,
          isRegistered: !!registration,
          registration,
          notificationPermission: permission,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Neznáma chyba',
        }));
      }
    }

    init();
  }, []);

  // Požiadanie o povolenie notifikácií
  const requestPermission = useCallback(async () => {
    const permission = await requestNotificationPermission();
    setState((prev) => ({
      ...prev,
      notificationPermission: permission,
    }));
    return permission;
  }, []);

  // Aktualizácia Service Worker
  const updateServiceWorker = useCallback(async () => {
    if (state.registration) {
      try {
        await state.registration.update();
        return true;
      } catch (error) {
        console.error('Chyba pri aktualizácii SW:', error);
        return false;
      }
    }
    return false;
  }, [state.registration]);

  // Odregistrácia Service Worker
  const unregisterServiceWorker = useCallback(async () => {
    if (state.registration) {
      try {
        const success = await state.registration.unregister();
        if (success) {
          setState((prev) => ({
            ...prev,
            isRegistered: false,
            registration: null,
          }));
        }
        return success;
      } catch (error) {
        console.error('Chyba pri odregistrácii SW:', error);
        return false;
      }
    }
    return false;
  }, [state.registration]);

  return {
    ...state,
    requestPermission,
    updateServiceWorker,
    unregisterServiceWorker,
  };
}
