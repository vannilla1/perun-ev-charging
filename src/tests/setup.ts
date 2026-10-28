import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-intl
vi.mock('next-intl', () => {
  const t = Object.assign((key: string) => key, {
    rich: (key: string) => key,
    markup: (key: string) => key,
    raw: (key: string) => key,
    has: () => true,
  });
  const intl = { locale: 'sk-SK', timeZone: 'Europe/Bratislava' };
  const format = {
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intl.locale, options).format(value),
    dateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(intl.locale, { timeZone: intl.timeZone, ...options }).format(value),
    dateTimeRange: (start: Date | number, end: Date | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(intl.locale, { timeZone: intl.timeZone, ...options }).formatRange(start, end),
    relativeTime: (value: Date | number, now: Date | number = Date.now()) => {
      const seconds = Math.round((new Date(value).getTime() - new Date(now).getTime()) / 1000);
      return new Intl.RelativeTimeFormat(intl.locale, { numeric: 'auto' }).format(seconds, 'second');
    },
    list: (value: Iterable<string>, options?: Intl.ListFormatOptions) =>
      new Intl.ListFormat(intl.locale, options).format(value),
  };
  return {
    useTranslations: () => t,
    useFormatter: () => format,
    useLocale: () => 'sk',
    useTimeZone: () => intl.timeZone,
    useNow: () => new Date(),
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  },
});

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({
      scope: '/',
      update: vi.fn(),
      unregister: vi.fn(),
    }),
    ready: Promise.resolve({
      showNotification: vi.fn(),
    }),
  },
});

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) =>
    success({
      coords: {
        latitude: 48.1486,
        longitude: 17.1077,
        accuracy: 10,
      },
    })
  ),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};
Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation });
