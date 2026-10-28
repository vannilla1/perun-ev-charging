'use client';

import type { useTranslations } from 'next-intl';

// Push notifikácie pre stav nabíjania

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Kontrola či sú notifikácie podporované
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Kontrola či je Service Worker podporovaný
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

// Získanie aktuálneho povolenia
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Požiadanie o povolenie notifikácií
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) {
    console.warn('Notifikácie nie sú podporované v tomto prehliadači');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Chyba pri žiadaní o povolenie notifikácií:', error);
    return 'denied';
  }
}

// Registrácia Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('Service Worker nie je podporovaný');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registrovaný:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Chyba pri registrácii Service Worker:', error);
    return null;
  }
}

// Zobrazenie lokálnej notifikácie
export async function showNotification(options: NotificationOptions): Promise<boolean> {
  const permission = getNotificationPermission();

  if (permission !== 'granted') {
    console.warn('Notifikácie nie sú povolené');
    return false;
  }

  try {
    // Skús použiť Service Worker ak je dostupný
    if (isServiceWorkerSupported()) {
      const registration = await navigator.serviceWorker.ready;
      const swNotificationOptions: globalThis.NotificationOptions & {
        actions?: NotificationAction[];
        requireInteraction?: boolean;
      } = {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/badge-72x72.png',
        tag: options.tag,
        data: options.data,
      };

      if (options.actions) {
        swNotificationOptions.actions = options.actions;
      }
      if (options.requireInteraction !== undefined) {
        swNotificationOptions.requireInteraction = options.requireInteraction;
      }

      await registration.showNotification(options.title, swNotificationOptions);
    } else {
      // Fallback na klasickú notifikáciu
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        tag: options.tag,
        data: options.data,
      });
    }
    return true;
  } catch (error) {
    console.error('Chyba pri zobrazení notifikácie:', error);
    return false;
  }
}

// Notifikácie pre nabíjanie
export type PushNotificationTranslator = ReturnType<typeof useTranslations<'common.pushNotifications'>>;

export const chargingNotifications = {
  // Nabíjanie začalo
  chargingStarted: (t: PushNotificationTranslator, stationName: string) =>
    showNotification({
      title: t('chargingStarted.title'),
      body: t('chargingStarted.body', { station: stationName }),
      tag: 'charging-status',
      icon: '/icons/charging-icon.png',
    }),

  // Nabíjanie dokončené
  chargingCompleted: (t: PushNotificationTranslator, stationName: string, energy: number, cost: number) =>
    showNotification({
      title: t('chargingCompleted.title'),
      body: t('chargingCompleted.body', { energy, cost }),
      tag: 'charging-status',
      icon: '/icons/complete-icon.png',
      requireInteraction: true,
      actions: [
        { action: 'view', title: t('chargingCompleted.view') },
        { action: 'dismiss', title: t('chargingCompleted.dismiss') },
      ],
    }),

  // Chyba nabíjania
  chargingError: (t: PushNotificationTranslator, message: string) =>
    showNotification({
      title: t('chargingError.title'),
      body: message,
      tag: 'charging-error',
      icon: '/icons/error-icon.png',
      requireInteraction: true,
    }),

  // Pripomienka na odpojenie
  disconnectReminder: (t: PushNotificationTranslator, stationName: string) =>
    showNotification({
      title: t('disconnectReminder.title'),
      body: t('disconnectReminder.body', { station: stationName }),
      tag: 'disconnect-reminder',
      icon: '/icons/reminder-icon.png',
      requireInteraction: true,
    }),

  // Nízka batéria
  lowBattery: (t: PushNotificationTranslator, percentage: number) =>
    showNotification({
      title: t('lowBattery.title'),
      body: t('lowBattery.body', { percentage }),
      tag: 'low-battery',
      icon: '/icons/battery-icon.png',
    }),
};

// Subscribnutie na push notifikácie (pre server-side push)
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isServiceWorkerSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Chyba pri subscribovaní na push:', error);
    return null;
  }
}

// Helper pre konverziu VAPID kľúča
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
