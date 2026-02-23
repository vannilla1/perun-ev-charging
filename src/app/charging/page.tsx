'use client';

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Card, CardContent, Button, Input } from '@/components/Common';
import { useCharging } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { StripeProvider, GuestPaymentForm } from '@/components/Payments';

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

const PlugIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

function ChargingPageContent() {
  const t = useTranslations('charging');
  const { isLoggedIn } = useAuth();
  const searchParams = useSearchParams();
  const [stationCode, setStationCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [preAuthClientSecret, setPreAuthClientSecret] = useState<string | null>(null);

  const {
    state,
    stats,
    stationInfo,
    stationOverview,
    error,
    isGuest,
    guestPaymentInfo,
    preAuthAmount,
    startScanning,
    stopScanning,
    handleQRScan,
    handleManualCode,
    loadStation,
    selectConnector,
    confirmStartCharging,
    initiateGuestPayment,
    confirmGuestPayment,
    startGuestCharging,
    stopSession,
    reset,
    formatDuration,
  } = useCharging();

  // Fetch pre-auth client secret when entering payment state
  useEffect(() => {
    if (state === 'payment' && stationInfo && !preAuthClientSecret) {
      // We'll create the pre-auth when user enters email in the form
    }
  }, [state, stationInfo, preAuthClientSecret]);

  // Start charging when payment is confirmed and state changes to 'starting'
  useEffect(() => {
    if (state === 'starting' && guestPaymentInfo?.paymentIntentId) {
      startGuestCharging();
    }
  }, [state, guestPaymentInfo, startGuestCharging]);

  // Auto-load station when stationId param is present (e.g. from map)
  useEffect(() => {
    const stationId = searchParams.get('stationId');
    if (stationId && state === 'idle') {
      loadStation(stationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setGuestEmail('');
    setPreAuthClientSecret(null);
  };

  const handleGuestPaymentConfirmed = (paymentIntentId: string, email: string) => {
    setGuestEmail(email);
    confirmGuestPayment(paymentIntentId, email);
  };

  const handleInitiatePreAuth = async (email: string) => {
    setGuestEmail(email);
    try {
      const response = await fetch('/api/payments/preauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          stationId: stationInfo?.stationId,
          connectorId: stationInfo?.connectorId,
          stationName: stationInfo?.name,
          amount: preAuthAmount,
        }),
      });

      if (!response.ok) {
        throw new Error('Nepodarilo sa vytvoriť predautorizáciu');
      }

      const data = await response.json();
      setPreAuthClientSecret(data.clientSecret);
    } catch (err) {
      console.error('Pre-auth error:', err);
    }
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

  const renderConnectorSelectState = () => (
    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
      {/* Station name & address */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
          {stationOverview?.name || 'Nabíjacia stanica'}
        </h2>
        {stationOverview?.address && (
          <p className="text-sm text-[var(--text-secondary)]">
            {stationOverview.address}
          </p>
        )}
      </div>

      {/* Connector selection label */}
      <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
        Vyberte konektor:
      </p>

      {/* Connector cards */}
      <div className="space-y-3 mb-6">
        {stationOverview?.connectors.map((connector) => {
          const isAvailable = connector.state === 'AVAILABLE';
          return (
            <button
              key={connector.id}
              onClick={() => isAvailable && selectConnector(connector)}
              disabled={!isAvailable}
              className={`w-full text-left rounded-xl p-4 transition-colors ${
                isAvailable
                  ? 'border-2 border-[var(--primary)] bg-[var(--surface-card)] hover:bg-[rgba(0,212,255,0.08)] cursor-pointer'
                  : 'border-2 border-[var(--border)] bg-[var(--surface-card)] opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      isAvailable ? 'bg-[var(--secondary)]' : 'bg-[var(--text-muted)]'
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {connector.name || `Konektor ${connector.number}`}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {connector.plugType}{connector.maxPower ? ` • ${connector.maxPower} kW` : ''}
                    </p>
                  </div>
                </div>
                {/* Status badge */}
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    isAvailable
                      ? 'bg-green-900/30 text-green-400'
                      : connector.state === 'OCCUPIED'
                        ? 'bg-gray-700/30 text-gray-400'
                        : 'bg-gray-700/30 text-gray-400'
                  }`}
                >
                  {isAvailable
                    ? 'Dostupný'
                    : connector.state === 'OCCUPIED'
                      ? 'Obsadený'
                      : 'Nedostupný'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom buttons */}
      <div className="space-y-3">
        <Button onClick={handleNewSession} variant="outline" fullWidth>
          Skenovať QR kód
        </Button>
        <Button onClick={handleNewSession} variant="ghost" fullWidth>
          Zrušiť
        </Button>
      </div>
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
        Načítavam stanicu...
      </h2>
      <p className="text-[var(--text-secondary)]">
        Prosím počkajte
      </p>
    </div>
  );

  // NOVÝ STAV - Zobrazenie informácií o stanici s možnosťou guest nabíjania
  const renderStationInfoState = () => (
    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
      {/* Header s ikonou a stavom */}
      <div className="flex items-center justify-center mb-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
          stationInfo?.status === 'AVAILABLE' ? 'bg-[var(--secondary)]' : 'bg-[var(--warning)]'
        }`}>
          <PlugIcon />
        </div>
      </div>

      {/* Stav stanice */}
      <div className="text-center mb-6">
        <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${
          stationInfo?.status === 'AVAILABLE'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {stationInfo?.status === 'AVAILABLE' ? 'Dostupná' : stationInfo?.status || 'Neznámy stav'}
        </span>
      </div>

      {/* Názov stanice */}
      <h2 className="text-xl font-bold text-center text-[var(--text-primary)] mb-2">
        {stationInfo?.name || 'Nabíjacia stanica'}
      </h2>

      {/* Adresa */}
      {stationInfo?.address && (
        <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
          {stationInfo.address}
        </p>
      )}

      {/* Informácie o stanici */}
      <Card className="mb-6">
        <CardContent>
          <div className="space-y-4">
            {/* Výkon */}
            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">Maximálny výkon</span>
              <span className="font-semibold text-[var(--primary)]">
                {stationInfo?.maxPower ? `${stationInfo.maxPower} kW` : '22 kW'}
              </span>
            </div>

            {/* Typ konektora */}
            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">Typ konektora</span>
              <span className="font-semibold">{stationInfo?.plugType || 'Type 2'}</span>
            </div>

            {/* Cena za kWh */}
            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">Cena za energiu</span>
              <span className="font-semibold text-[var(--accent)]">
                {stationInfo?.pricePerKwh != null && stationInfo.pricePerKwh > 0
                  ? `${stationInfo.pricePerKwh.toFixed(2)} EUR/kWh`
                  : 'Zadarmo'}
              </span>
            </div>

            {/* Cena za čas */}
            <div className="flex justify-between items-center py-2">
              <span className="text-[var(--text-secondary)]">Cena za čas</span>
              <span className="font-semibold">
                {stationInfo?.pricePerH != null && stationInfo.pricePerH > 0
                  ? `${stationInfo.pricePerH.toFixed(2)} EUR/hod`
                  : '0.00 EUR/hod'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tlačidlá - Auth-aware */}
      <div className="space-y-3">
        {isLoggedIn ? (
          <>
            <Button
              onClick={confirmStartCharging}
              fullWidth
              size="lg"
              disabled={stationInfo?.status !== 'AVAILABLE'}
            >
              Spustiť nabíjanie
            </Button>
            <Button onClick={handleNewSession} variant="ghost" fullWidth>
              Zrušiť
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={initiateGuestPayment}
              fullWidth
              size="lg"
              disabled={stationInfo?.status !== 'AVAILABLE'}
            >
              Nabíjať bez registrácie
            </Button>
            <Button
              onClick={() => { window.location.href = '/login?redirect=/charging'; }}
              variant="outline"
              fullWidth
              disabled={stationInfo?.status !== 'AVAILABLE'}
            >
              Prihlásiť sa
            </Button>
            <Button onClick={handleNewSession} variant="ghost" fullWidth>
              Zrušiť
            </Button>
          </>
        )}
      </div>

      {/* Upozornenie ak nie je dostupná */}
      {stationInfo?.status !== 'AVAILABLE' && (
        <p className="text-sm text-[var(--warning)] text-center mt-4">
          Stanica momentálne nie je dostupná. Skúste neskôr.
        </p>
      )}
    </div>
  );

  // NOVÝ STAV - Platobný formulár pre guest používateľov
  const renderPaymentState = () => (
    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
      <h2 className="text-xl font-bold text-center text-[var(--text-primary)] mb-6">
        Platba za nabíjanie
      </h2>

      {preAuthClientSecret ? (
        <StripeProvider>
          <GuestPaymentForm
            clientSecret={preAuthClientSecret}
            preAuthAmount={preAuthAmount}
            stationInfo={{
              name: stationInfo?.name || 'Nabíjacia stanica',
              address: stationInfo?.address || '',
              pricePerKwh: stationInfo?.pricePerKwh ?? 0,
            }}
            onPaymentConfirmed={handleGuestPaymentConfirmed}
            onCancel={handleNewSession}
          />
        </StripeProvider>
      ) : (
        <div className="space-y-6">
          {/* Station Info Summary */}
          <div className="bg-[var(--card-alt)] rounded-2xl p-4">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">
              {stationInfo?.name || 'Nabíjacia stanica'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              {stationInfo?.address}
            </p>
            <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
              <span className="text-sm text-[var(--text-secondary)]">Cena za kWh</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {stationInfo?.pricePerKwh != null && stationInfo.pricePerKwh > 0
                  ? `${stationInfo.pricePerKwh.toFixed(2)} EUR`
                  : 'Zadarmo'}
              </span>
            </div>
          </div>

          {/* Pre-authorization Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💳</div>
              <div>
                <h4 className="font-semibold text-blue-900">Predautorizácia</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Na vašej karte bude dočasne zablokovaná suma{' '}
                  <strong>{preAuthAmount.toFixed(2)} EUR</strong>.
                  Po ukončení nabíjania bude strhnutá len skutočná suma.
                </p>
              </div>
            </div>
          </div>

          {/* Email Form */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Váš email (pre potvrdenie)
            </label>
            <Input
              type="email"
              placeholder="vas@email.sk"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="mb-4"
            />
            <Button
              onClick={() => handleInitiatePreAuth(guestEmail)}
              fullWidth
              disabled={!guestEmail || !guestEmail.includes('@')}
            >
              Pokračovať k platbe
            </Button>
          </div>

          <Button onClick={handleNewSession} variant="outline" fullWidth>
            Zrušiť
          </Button>
        </div>
      )}
    </div>
  );

  // NOVÝ STAV - Autorizácia prebieha
  const renderAuthorizingState = () => (
    <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
      <div className="animate-spin mb-6">
        <svg className="h-16 w-16 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Autorizujem platbu...
      </h2>
      <p className="text-[var(--text-secondary)] text-center">
        Prosím počkajte, overujeme vašu platobnú kartu
      </p>
    </div>
  );

  // NOVÝ STAV - Spúšťanie nabíjania cez OCPP
  const renderStartingState = () => (
    <div className="flex flex-col items-center justify-center p-6 min-h-[400px]">
      <div className="animate-pulse mb-6">
        <div className="w-24 h-24 rounded-full bg-[var(--secondary)] flex items-center justify-center text-white">
          <BoltIcon />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Spúšťam nabíjanie...
      </h2>
      <p className="text-[var(--text-secondary)] text-center">
        Pripojte kábel k vozidlu
      </p>
      <div className="mt-4 text-sm text-[var(--text-muted)]">
        Platba bola autorizovaná: {preAuthAmount.toFixed(2)} EUR
      </div>
    </div>
  );

  const renderChargingState = () => (
    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
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

      {/* Guest info banner */}
      {isGuest && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
          <p className="text-sm text-blue-800 text-center">
            Predautorizácia: {preAuthAmount.toFixed(2)} EUR | Po nabíjaní bude strhnutá skutočná suma
          </p>
        </div>
      )}

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
              {stats.cost.toFixed(2)} <span className="text-base font-normal">EUR</span>
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
      {isGuest && (
        <p className="text-[var(--text-secondary)] text-center mt-2">
          Strhávam platbu za {stats.cost.toFixed(2)} EUR
        </p>
      )}
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

      {isGuest && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6">
          <p className="text-sm text-green-800 text-center">
            Potvrdenie bolo odoslané na: {guestEmail}
          </p>
        </div>
      )}

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
          <span className="font-bold text-xl text-[var(--primary)]">{stats.cost.toFixed(2)} EUR</span>
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

  const getPageTitle = () => {
    switch (state) {
      case 'connector_select':
        return 'Výber konektora';
      case 'station_info':
        return 'Nabíjacia stanica';
      case 'payment':
        return 'Platba';
      case 'authorizing':
      case 'starting':
        return 'Spúšťam nabíjanie';
      case 'charging':
        return 'Nabíjanie';
      case 'completed':
        return 'Dokončené';
      default:
        return t('scanQr');
    }
  };

  return (
    <AppLayout
      header={
        <PageHeader title={getPageTitle()} />
      }
    >
      <div className="max-w-lg mx-auto">
        {state === 'idle' && renderIdleState()}
        {state === 'scanning' && renderIdleState()}
        {state === 'connecting' && renderConnectingState()}
        {state === 'connector_select' && renderConnectorSelectState()}
        {state === 'station_info' && renderStationInfoState()}
        {state === 'payment' && renderPaymentState()}
        {state === 'authorizing' && renderAuthorizingState()}
        {state === 'starting' && renderStartingState()}
        {state === 'charging' && renderChargingState()}
        {state === 'stopping' && renderStoppingState()}
        {state === 'completed' && renderCompletedState()}
        {state === 'error' && renderErrorState()}
      </div>
    </AppLayout>
  );
}

export default function ChargingPage() {
  return (
    <Suspense>
      <ChargingPageContent />
    </Suspense>
  );
}
