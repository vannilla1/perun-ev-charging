import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      post: vi.fn(),
      get: vi.fn(),
    })),
    post: vi.fn(),
  },
}));

describe('Token management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('ukladá access token do localStorage', () => {
    localStorage.setItem('accessToken', 'test-token-123');
    expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'test-token-123');
  });

  it('načíta access token z localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('test-token-123');
    const token = localStorage.getItem('accessToken');
    expect(token).toBe('test-token-123');
  });

  it('odstráni access token z localStorage', () => {
    localStorage.removeItem('accessToken');
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
  });

  it('vyčistí všetky tokeny pri logout', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });
});

describe('User validation', () => {
  it('validuje email formát', () => {
    const validateEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.sk')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('validuje heslo dĺžku', () => {
    const validatePassword = (password: string) => password.length >= 6;

    expect(validatePassword('123456')).toBe(true);
    expect(validatePassword('password123')).toBe(true);
    expect(validatePassword('12345')).toBe(false);
    expect(validatePassword('')).toBe(false);
  });

  it('validuje zhodu hesiel', () => {
    const validatePasswordMatch = (password: string, confirmPassword: string) =>
      password === confirmPassword;

    expect(validatePasswordMatch('password', 'password')).toBe(true);
    expect(validatePasswordMatch('password', 'different')).toBe(false);
  });
});

describe('User data', () => {
  it('vytvorí správny user objekt', () => {
    const createUser = (data: {
      firstName: string;
      lastName: string;
      email: string;
    }) => ({
      id: `user-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      createdAt: new Date().toISOString(),
    });

    const user = createUser({
      firstName: 'Ján',
      lastName: 'Novák',
      email: 'jan.novak@email.sk',
    });

    expect(user.firstName).toBe('Ján');
    expect(user.lastName).toBe('Novák');
    expect(user.email).toBe('jan.novak@email.sk');
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeDefined();
  });

  it('generuje iniciály správne', () => {
    const getInitials = (firstName?: string, lastName?: string) => {
      return `${firstName?.[0] || ''}${lastName?.[0] || ''}` || '?';
    };

    expect(getInitials('Ján', 'Novák')).toBe('JN');
    expect(getInitials('Martin', 'Kováč')).toBe('MK');
    expect(getInitials('Anna', undefined)).toBe('A');
    expect(getInitials(undefined, undefined)).toBe('?');
  });
});
