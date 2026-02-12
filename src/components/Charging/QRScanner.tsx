'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

// Kontrola či sme v secure kontexte (HTTPS alebo localhost)
const isSecureContext = () => {
  if (typeof window === 'undefined') return false;

  // window.isSecureContext je najspoľahlivejší spôsob
  if (window.isSecureContext !== undefined) {
    return window.isSecureContext;
  }

  // Fallback pre staršie prehliadače
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  return (
    protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
};

export function QRScanner({ onScan, onError, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    const initScanner = async () => {
      if (!containerRef.current) return;

      // Kontrola secure kontextu
      if (!isSecureContext()) {
        setIsInsecureContext(true);
        setHasPermission(false);
        const message = 'Kamera vyžaduje HTTPS pripojenie. V prehliadači otvorte aplikáciu cez https:// alebo localhost.';
        setErrorMessage(message);
        // Toto nie je skutočná chyba, len informácia o potrebe HTTPS
        // Nevoláme onError, lebo UI už zobrazuje správu
        return;
      }

      try {
        // Vytvorenie scanneru
        scannerRef.current = new Html5Qrcode('qr-reader');

        // Získanie povolenia kamery
        const devices = await Html5Qrcode.getCameras();

        if (devices && devices.length > 0) {
          setHasPermission(true);

          // Preferovať zadnú kameru
          const backCamera = devices.find(
            (d) => d.label.toLowerCase().includes('back') ||
                   d.label.toLowerCase().includes('rear') ||
                   d.label.toLowerCase().includes('environment')
          );
          const cameraId = backCamera?.id || devices[0].id;

          await scannerRef.current.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1,
            },
            (decodedText) => {
              // Úspešné skenovanie
              onScan(decodedText);
              stopScanner();
            },
            (scanErrorMessage) => {
              // Ignorovať bežné chyby skenovania
              if (!scanErrorMessage.includes('No QR code found')) {
                console.debug('QR scan error:', scanErrorMessage);
              }
            }
          );

          setIsScanning(true);
        } else {
          setHasPermission(false);
          setErrorMessage('Žiadna kamera nebola nájdená');
          onError?.('Žiadna kamera nebola nájdená');
        }
      } catch (err) {
        // Použiť warn namiesto error - očakávané stavy (napr. zamietnuté povolenie)
        console.warn('Scanner init:', err);
        setHasPermission(false);

        const error = err instanceof Error ? err.message : 'Nepodarilo sa spustiť kameru';
        setErrorMessage(error);
        onError?.(error);
      }
    };

    initScanner();

    return () => {
      stopScanner();
    };
  }, [onScan, onError, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose?.();
  };

  // Špeciálny stav pre insecure context (nie HTTPS)
  if (isInsecureContext) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--perun-orange)] bg-opacity-10 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--perun-orange)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Vyžaduje sa bezpečné pripojenie
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Prístup ku kamere je povolený len cez HTTPS alebo localhost.
          Pre skenovanie QR kódov otvorte aplikáciu cez zabezpečené pripojenie.
        </p>

        {/* Alternatíva - manuálne zadanie */}
        <div className="w-full p-4 bg-[var(--surface-secondary)] rounded-xl mb-4">
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Alternatívne môžete zadať kód stanice manuálne:
          </p>
          <button
            onClick={() => {
              handleClose();
              // Používateľ bude presmerovaný na manuálne zadanie
            }}
            className="text-[var(--perun-blue)] font-medium hover:underline"
          >
            Zadať kód manuálne →
          </button>
        </div>

        <button
          onClick={handleClose}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--border-radius-sm)]"
        >
          Zavrieť
        </button>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--error)] bg-opacity-10 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Prístup ku kamere zamietnutý
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {errorMessage || 'Povoľte prístup ku kamere v nastaveniach prehliadača'}
        </p>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--border-radius-sm)]"
        >
          Zavrieť
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Scanner container */}
      <div
        ref={containerRef}
        id="qr-reader"
        className="w-full aspect-square rounded-2xl overflow-hidden bg-black"
      />

      {/* Overlay s rámčekom */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Rohy */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg" />

        {/* Skenovacia čiara */}
        {isScanning && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-0.5 bg-[var(--primary)] animate-pulse" />
        )}
      </div>

      {/* Loading stav */}
      {!isScanning && hasPermission === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center">
            <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p>Spúšťam kameru...</p>
          </div>
        </div>
      )}

      {/* Close tlačidlo */}
      {onClose && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black bg-opacity-50 flex items-center justify-center text-white hover:bg-opacity-70 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Inštrukcie */}
      <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
        Namierte kameru na QR kód nabíjacej stanice
      </p>
    </div>
  );
}
