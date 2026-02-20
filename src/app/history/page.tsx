'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, CardContent, Loading } from '@/components/Common';
import { useHistory, type HistoryPeriod } from '@/hooks';

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const calculateDuration = (start: string, end?: string): string => {
  if (!end) return '-';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export default function HistoryPage() {
  const t = useTranslations('history');
  const [period, setPeriod] = useState<HistoryPeriod>('all');

  // Použitie React Query hooku
  const { data: history, isLoading, error, stats } = useHistory(period);

  const filterButtons: { id: HistoryPeriod; label: string }[] = [
    { id: 'all', label: t('allTime') },
    { id: 'thisMonth', label: t('thisMonth') },
    { id: 'lastMonth', label: t('lastMonth') },
  ];

  if (isLoading) {
    return (
      <AppLayout header={<PageHeader title={t('title')} />}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loading text="Načítavam históriu..." />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout header={<PageHeader title={t('title')} />}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
          <p className="text-[var(--error)] mb-4">Nepodarilo sa načítať históriu</p>
          <button
            onClick={() => window.location.reload()}
            className="text-[var(--primary)] underline"
          >
            Skúsiť znova
          </button>
        </div>
      </AppLayout>
    );
  }

  const sessions = history?.sessions || [];

  return (
    <AppLayout
      header={
        <PageHeader title={t('title')} />
      }
    >
      <div
        className="max-w-lg mx-auto"
        style={{ padding: '32px 16px 24px 16px' }}
      >
        {/* Štatistiky */}
        <div
          className="grid grid-cols-3"
          style={{ gap: '16px', marginBottom: '32px' }}
        >
          <Card className="text-center">
            <CardContent>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{t('totalEnergy')}</p>
              <p className="text-lg font-bold text-[var(--secondary)]">
                {stats.totalEnergy.toFixed(1)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">kWh</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{t('totalCost')}</p>
              <p className="text-lg font-bold text-[var(--primary)]">
                {stats.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">€</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{t('totalSessions')}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {stats.totalSessions}
              </p>
              <p className="text-xs text-[var(--text-muted)]">x</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div
          className="flex overflow-x-auto pb-2"
          style={{ gap: '12px', marginBottom: '24px' }}
        >
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${period === btn.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                }
              `}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Zoznam nabíjaní */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-[var(--text-muted)] mb-4 flex justify-center">
                  <BoltIcon />
                </div>
                <h3 className="font-medium text-[var(--text-primary)] mb-1">
                  {t('noHistory')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('noHistoryDescription')}
                </p>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} hover className="cursor-pointer">
                <CardContent>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--secondary)] bg-opacity-10 flex items-center justify-center text-[var(--secondary)]">
                        <BoltIcon />
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">
                          {session.stationName}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {formatDate(session.startTime)} • {formatTime(session.startTime)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--primary)]">
                        {session.cost.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mt-3 pt-3 border-t border-[var(--border-light)]">
                    <span>{session.energyDelivered.toFixed(1)} kWh</span>
                    <span>•</span>
                    <span>{calculateDuration(session.startTime, session.endTime)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
