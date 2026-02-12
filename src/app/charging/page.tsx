'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, CardContent, Button, Input } from '@/components/Common';
import { useCharging } from '@/hooks';

// Dynamický import QR skenera (potrebuje prístup k window)
const QRScanner = dynamic(
  () => import('@/components/Charging/QRScanner').then((mod) => mod.QRScanner),
  { ssr: false }
);

const QRIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default function ChargingPage() {
  const t = useTranslations('charging');
  const [stationCode, setStationCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const {
    state,
    stats,
    error,
    startScanning,
    stopScanning,
    handleQRScan,
    handleManualCode,
    stopSession,
    reset,
    formatDuration,
  } = useCharging();

  const handleOpenScanner = () => {
    setShowScanner(true);
    startScanning();
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    stopScanning();
  };

  const handleScanSuccess = (data: string) => {
    setShowScanner(false);
    handleQRScan(data);
  };

  const handleManualStart = () => {
    if (stationCode.length >= 4) {
      handleManualCode(stationCode);
    }
  };

  const handleNewSession = () => {
    reset();
    setStationCode('');
  };

  const renderIdleState = () => (
    <div
      className="flex flex-col items-center"
      style={{ padding: '56px 24px 24px 24px' }}
    >
      {showScanner ? (
        <div className="w-full" style={{ marginBottom: '40px' }}>
          <QRScanner
            onScan={handleScanSuccess}
            onError={(err) => {
              // HTTPS chyba nie je skutočná chyba, len informácia
              if (err.includes('HTTPS') || err.includes('secure')) {
                console.info('QR Scanner: Vyžaduje sa HTTPS pripojenie');
              } else {
                console.warn('QR Scanner:', err);
              }
            }}
            onClose={handleCloseScanner}
          />
        </div>
      ) : (
        <>
          {/* QR Scanner placeholder */}
          <div className="relative" style={{ marginBottom: '48px' }}>
            <div
              className="w-64 h-64 border-4 border-dashed border-[var(--primary)] rounded-2xl flex items-center justify-center bg-[var(--surface-secondary)] cursor-pointer hover:bg-[var(--surface)] transition-colors"
              onClick={handleOpenScanner}
            >
              <div className="text-center">
                <div className="text-[var(--primary)] mb-4 flex justify-center">
                  <QRIcon />
                </div>
                <p className="text-[var(--text-secondary)] text-sm px-4">
                  {t('scanInstructions')}
                </p>
              </div>
            </div>
            {/* Animované rohy */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--primary)] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--primary)] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--primary)] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--primary)] rounded-br-lg" />
          </div>

          <Button onClick={handleOpenScanner} fullWidth size="lg">
            {t('scanQr')}
          </Button>
        </>
      )}

      {!showScanner && (
        <>
          <div
            className="w-full flex items-center gap-4"
            style={{ margin: '48px 0' }}
          >
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-sm text-[var(--text-secondary)]">{t('orEnterCode')}</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <Input
              placeholder={t('enterCode')}
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value.toUpperCase())}
              className="text-center text-xl tracking-widest font-mono"
            />
            <Button
              onClick={handleManualStart}
              variant="outline"
              fullWidth
              disabled={stationCode.length < 4}
            >
              {t('startCharging')}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderConnectingState = () => (
    <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
      <div className="animate-pulse mb-6">
        <div className="w-24 h-24 rounded-full bg-[var(--primary)] flex items-center justify-center text-white">
          <BoltIcon />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        {t('preparingSession')}
      </h2>
      <p className="text-[var(--text-secondary)]">
        {t('connectCable')}
      </p>
    </div>
  );

  const renderChargingState = () => (
    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
      {/* Status indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-[var(--secondary)] flex items-center justify-center animate-pulse">
            <div className="text-white">
              <BoltIcon />
            </div>
          </div>
          <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
            <div className="w-4 h-4 rounded-full bg-[var(--secondary)] animate-ping" />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-8">
        {t('chargingInProgress')}
      </h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5 mb-10">
        <Card className="text-center">
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)] mb-1">{t('currentPower')}</p>
            <p className="text-2xl font-bold text-[var(--primary)]">
              {stats.power.toFixed(1)} <span className="text-base font-normal">kW</span>
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)] mb-1">{t('energyDelivered')}</p>
            <p className="text-2xl font-bold text-[var(--secondary)]">
              {stats.energy.toFixed(2)} <span className="text-base font-normal">kWh</span>
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)] mb-1">{t('duration')}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {formatDuration(stats.duration)}
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)] mb-1">{t('estimatedCost')}</p>
            <p className="text-2xl font-bold text-[var(--accent)]">
              {stats.cost.toFixed(2)} <span className="text-base font-normal">€</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={stopSession} variant="danger" fullWidth size="lg">
        {t('stopCharging')}
      </Button>
    </div>
  );

  const renderStoppingState = () => (
    <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
      <div className="animate-spin mb-6">
        <svg className="h-16 w-16 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Zastavujem nabíjanie...
      </h2>
    </div>
  );

  const renderCompletedState = () => (
    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
      <div className="flex items-center justify-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[var(--secondary)] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-4">
        {t('chargingComplete')}
      </h2>

      <div className="space-y-5 my-10">
        <div className="flex justify-between py-3 border-b border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">{t('energyDelivered')}</span>
          <span className="font-semibold">{stats.energy.toFixed(2)} kWh</span>
        </div>
        <div className="flex justify-between py-3 border-b border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">{t('duration')}</span>
          <span className="font-semibold">{formatDuration(stats.duration)}</span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-[var(--text-secondary)]">{t('finalCost')}</span>
          <span className="font-bold text-xl text-[var(--primary)]">{stats.cost.toFixed(2)} €</span>
        </div>
      </div>

      <Button onClick={handleNewSession} fullWidth size="lg">
        Nové nabíjanie
      </Button>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
      <div className="w-24 h-24 rounded-full bg-[var(--error)] bg-opacity-10 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Chyba
      </h2>
      <p className="text-[var(--text-secondary)] text-center mb-6">
        {error || 'Niečo sa pokazilo'}
      </p>
      <Button onClick={handleNewSession} fullWidth>
        Skúsiť znova
      </Button>
    </div>
  );

  return (
    <AppLayout
      header={
        <PageHeader title={t('scanQr')} />
      }
    >
      <div className="max-w-lg mx-auto">
        {state === 'idle' && renderIdleState()}
        {state === 'scanning' && renderIdleState()}
        {state === 'connecting' && renderConnectingState()}
        {state === 'charging' && renderChargingState()}
        {state === 'stopping' && renderStoppingState()}
        {state === 'completed' && renderCompletedState()}
        {state === 'error' && renderErrorState()}
      </div>
    </AppLayout>
  );
}
