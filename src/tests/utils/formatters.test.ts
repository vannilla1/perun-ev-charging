import { describe, it, expect } from 'vitest';

// Utility funkcie pre formátovanie
const formatEnergy = (kwh: number): string => {
  return `${kwh.toFixed(1)} kWh`;
};

const formatCurrency = (amount: number, currency = '€'): string => {
  return `${amount.toFixed(2)} ${currency}`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatPower = (kw: number): string => {
  return `${kw} kW`;
};

const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

describe('formatEnergy', () => {
  it('formátuje energie správne', () => {
    expect(formatEnergy(0)).toBe('0.0 kWh');
    expect(formatEnergy(25.5)).toBe('25.5 kWh');
    expect(formatEnergy(100)).toBe('100.0 kWh');
    expect(formatEnergy(12.345)).toBe('12.3 kWh');
  });
});

describe('formatCurrency', () => {
  it('formátuje sumu s eurom', () => {
    expect(formatCurrency(0)).toBe('0.00 €');
    expect(formatCurrency(5.5)).toBe('5.50 €');
    expect(formatCurrency(123.456)).toBe('123.46 €');
  });

  it('podporuje inú menu', () => {
    expect(formatCurrency(10, 'CZK')).toBe('10.00 CZK');
  });
});

describe('formatDuration', () => {
  it('formátuje minúty', () => {
    expect(formatDuration(60)).toBe('1min');
    expect(formatDuration(300)).toBe('5min');
    expect(formatDuration(1800)).toBe('30min');
  });

  it('formátuje hodiny a minúty', () => {
    expect(formatDuration(3600)).toBe('1h 0min');
    expect(formatDuration(3900)).toBe('1h 5min');
    expect(formatDuration(7200)).toBe('2h 0min');
    expect(formatDuration(9000)).toBe('2h 30min');
  });
});

describe('formatDistance', () => {
  it('formátuje metre', () => {
    expect(formatDistance(50)).toBe('50 m');
    expect(formatDistance(500)).toBe('500 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('formátuje kilometre', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(10000)).toBe('10.0 km');
  });
});

describe('formatPower', () => {
  it('formátuje výkon', () => {
    expect(formatPower(22)).toBe('22 kW');
    expect(formatPower(50)).toBe('50 kW');
    expect(formatPower(150)).toBe('150 kW');
  });
});

describe('formatPercentage', () => {
  it('formátuje percentá', () => {
    expect(formatPercentage(0)).toBe('0%');
    expect(formatPercentage(50)).toBe('50%');
    expect(formatPercentage(100)).toBe('100%');
    expect(formatPercentage(75.6)).toBe('76%');
  });
});

describe('formatDate', () => {
  it('formátuje dátum', () => {
    const date = new Date('2024-01-15');
    const formatted = formatDate(date);
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('akceptuje string dátum', () => {
    const formatted = formatDate('2024-06-20');
    expect(formatted).toContain('20');
    expect(formatted).toContain('2024');
  });
});

describe('formatTime', () => {
  it('formátuje čas', () => {
    const date = new Date('2024-01-15T14:30:00');
    const formatted = formatTime(date);
    expect(formatted).toContain('14');
    expect(formatted).toContain('30');
  });
});
