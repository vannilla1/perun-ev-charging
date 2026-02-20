'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Loading } from '@/components/Common';
import { useHistory, type HistoryPeriod } from '@/hooks';

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
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
          <p className="mb-4 text-sm" style={{ color: 'var(--error)' }}>Nepodarilo sa načítať históriu</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm underline"
            style={{ color: 'var(--primary)' }}
          >
            Skúsiť znova
          </button>
        </div>
      </AppLayout>
    );
  }

  const sessions = history?.sessions || [];

  return (
    <AppLayout header={<PageHeader title={t('title')} />}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-6">

        {/* Štatistiky - 3 metriky */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: t('totalEnergy'),
              value: stats.totalEnergy.toFixed(1),
              unit: 'kWh',
              color: '#00FF88',
              glow: 'rgba(0,255,136,0.15)',
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
            },
            {
              label: t('totalCost'),
              value: stats.totalCost.toFixed(2),
              unit: '€',
              color: '#00D4FF',
              glow: 'rgba(0,212,255,0.15)',
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: t('totalSessions'),
              value: stats.totalSessions.toString(),
              unit: 'relácií',
              color: '#FF8C00',
              glow: 'rgba(255,140,0,0.15)',
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="text-center p-3 rounded-xl relative overflow-hidden"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{
                  background: metric.glow,
                  color: metric.color,
                }}
              >
                {metric.icon}
              </div>
              <p
                className="text-lg font-bold leading-none mb-1"
                style={{ color: metric.color, fontFamily: "'Space Mono', monospace" }}
              >
                {metric.value}
              </p>
              <p className="text-xs leading-none mb-1" style={{ color: 'var(--text-muted)' }}>
                {metric.unit}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id)}
              className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200"
              style={{
                background: period === btn.id
                  ? 'linear-gradient(135deg, #00D4FF, #0088CC)'
                  : 'var(--surface-card)',
                color: period === btn.id ? '#080C14' : 'var(--text-secondary)',
                border: period === btn.id ? 'none' : '1px solid var(--border)',
                boxShadow: period === btn.id ? '0 4px 12px rgba(0,212,255,0.3)' : 'none',
                fontFamily: period === btn.id ? "'Space Mono', monospace" : 'inherit',
                letterSpacing: period === btn.id ? '0.02em' : 'normal',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Zoznam */}
        <div className="flex flex-col gap-3">
          {sessions.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: 'rgba(0, 212, 255, 0.08)',
                  color: 'var(--text-muted)',
                }}
              >
                <BoltIcon />
              </div>
              <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {t('noHistory')}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('noHistoryDescription')}
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl overflow-hidden cursor-pointer session-card-hover"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                }}
              >
                {/* Left color bar based on cost */}
                <div className="flex">
                  <div
                    className="w-1 shrink-0"
                    style={{ background: 'linear-gradient(180deg, #00D4FF, #00FF88)' }}
                  />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: 'rgba(0, 255, 136, 0.1)',
                            color: '#00FF88',
                          }}
                        >
                          <BoltIcon />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                            {session.stationName}
                          </h3>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {formatDate(session.startTime)} · {formatTime(session.startTime)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="font-bold text-sm"
                          style={{ color: '#00D4FF', fontFamily: "'Space Mono', monospace" }}
                        >
                          {session.cost.toFixed(2)} €
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-4 pt-3"
                      style={{ borderTop: '1px solid rgba(0, 212, 255, 0.06)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#00FF88' }}
                        />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace" }}>
                          {session.energyDelivered.toFixed(1)} kWh
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#7A9CC0' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {calculateDuration(session.startTime, session.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
