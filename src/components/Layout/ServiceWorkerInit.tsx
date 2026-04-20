'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';

/**
 * Invisible component that initializes the service worker on mount.
 * Place in root layout to ensure SW is registered on every page.
 */
export function ServiceWorkerInit() {
  useServiceWorker();
  return null;
}
