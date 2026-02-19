'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { AppLayout } from '@/components/Layout';
import { useStations } from '@/hooks';
import type { ChargingStation, StationFilters } from '@/types';

// Dynamický import pre Leaflet (SSR disabled)
const StationMap = dynamic(
  () => import('@/components/Map/StationMap').then((mod) => mod.StationMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
        }}
      >
        <div style={{ textAlign: 'center', marginTop: '-80px' }}>
          <div
            style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00D4FF, #00FF88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 40px rgba(0,212,255,0.4)',
              animation: 'electricPulse 2s ease-in-out infinite',
            }}
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#080C14' }}>
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: "'Space Mono', monospace" }}>NAČÍTAVAM...</p>
        </div>
      </div>
    ),
  }
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const NavigateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default function MapPage() {
  const t = useTranslations('station');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<StationFilters>({});

  const { data: stations, isLoading, error } = useStations(filters);

  const filteredStations = stations?.filter((station) =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.address.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleStationClick = (station: ChargingStation) => {
    setSelectedStation(station);
  };

  const getStatusConfig = (status: ChargingStation['status']) => {
    const config = {
      available: { text: t('available'), color: '#00FF88', glow: 'rgba(0,255,136,0.5)', icon: '✓' },
      occupied: { text: t('occupied'), color: '#FF8C00', glow: 'rgba(255,140,0,0.5)', icon: '⚡' },
      offline: { text: 'Nedostupná', color: '#3D5A7A', glow: 'rgba(61,90,122,0.3)', icon: '✕' },
      maintenance: { text: t('maintenance'), color: '#3D5A7A', glow: 'rgba(61,90,122,0.3)', icon: '🔧' },
    };
    return config[status];
  };

  return (
    <AppLayout showNavigation={true}>
      <div className="relative h-[calc(100vh-64px)] sm:h-[calc(100vh-72px)]">

        {/* Top header bar */}
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-1">
            <div className="flex items-center justify-between pointer-events-auto">
              {/* Logo chip */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(8, 12, 20, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 212, 255, 0.15)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              >
                <Image
                  src="/images/perun-logo.png"
                  alt="Perun"
                  width={120}
                  height={50}
                  className="h-7 sm:h-8 w-auto"
                  unoptimized
                  priority
                />
              </div>

              {/* Station count */}
              {!isLoading && !error && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-full"
                  style={{
                    background: 'rgba(8, 12, 20, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: '#00FF88', boxShadow: '0 0 6px #00FF88' }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: '#00FF88', fontFamily: "'Space Mono', monospace" }}
                  >
                    {filteredStations.length}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>staníc</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="absolute inset-0">
          {isLoading ? (
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--background)',
              }}
            >
              <div style={{ textAlign: 'center', marginTop: '-80px', padding: '0 16px' }}>
                <div
                  style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00D4FF, #00FF88)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 0 60px rgba(0,212,255,0.4), 0 0 120px rgba(0,212,255,0.15)',
                    animation: 'electricPulse 2s ease-in-out infinite',
                  }}
                >
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#080C14' }}>
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Načítavam stanice
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", fontSize: '12px' }}>
                  PROSÍM POČKAJTE...
                </p>
              </div>
            </div>
          ) : error ? (
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--background)',
              }}
            >
              <div className="text-center p-6">
                <div
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(255, 61, 113, 0.1)',
                    border: '1px solid rgba(255, 61, 113, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#FF3D71' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-base font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                  Nepodarilo sa načítať stanice
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-premium btn-primary px-5 py-2.5 text-sm"
                >
                  Skúsiť znova
                </button>
              </div>
            </div>
          ) : (
            <StationMap
              stations={filteredStations}
              onStationClick={handleStationClick}
            />
          )}
        </div>

        {/* Search bar */}
        <div className="absolute top-14 sm:top-20 left-3 right-3 sm:left-4 sm:right-4 z-10">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Hľadať nabíjaciu stanicu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm transition-all duration-200 focus:outline-none"
                style={{
                  background: 'rgba(8, 12, 20, 0.92)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(0, 212, 255, 0.15)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1.5px solid rgba(0, 212, 255, 0.5)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4), 0 0 0 3px rgba(0,212,255,0.08)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1.5px solid rgba(0, 212, 255, 0.15)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
                }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2.5 sm:p-3 rounded-xl transition-all duration-200 active:scale-95"
              style={{
                background: showFilters || filters.onlyAvailable
                  ? 'linear-gradient(135deg, #00D4FF, #0088CC)'
                  : 'rgba(8, 12, 20, 0.92)',
                backdropFilter: 'blur(20px)',
                border: showFilters || filters.onlyAvailable
                  ? 'none'
                  : '1.5px solid rgba(0, 212, 255, 0.15)',
                color: showFilters || filters.onlyAvailable ? '#080C14' : 'var(--text-muted)',
                boxShadow: showFilters || filters.onlyAvailable
                  ? '0 4px 20px rgba(0,212,255,0.4)'
                  : '0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              <FilterIcon />
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div
              className="mt-2 rounded-2xl overflow-hidden animate-slide-up"
              style={{
                background: 'rgba(8, 12, 20, 0.95)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(0, 212, 255, 0.12)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>
                    FILTRE
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1.5 rounded-lg transition-all duration-200"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="space-y-2">
                  <label
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200"
                    style={{ background: 'rgba(0, 212, 255, 0.04)', border: '1px solid rgba(0, 212, 255, 0.08)' }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.onlyAvailable || false}
                      onChange={() => setFilters((prev) => ({ ...prev, onlyAvailable: !prev.onlyAvailable }))}
                      className="w-4 h-4 cursor-pointer accent-[#00FF88]"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: '#00FF88', boxShadow: '0 0 6px rgba(0,255,136,0.6)' }}
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Len dostupné stanice
                      </span>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setFilters({})}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Vymazať
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
                      color: '#080C14',
                      boxShadow: '0 4px 16px rgba(0,212,255,0.35)',
                    }}
                  >
                    Použiť
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Station detail card */}
        {selectedStation && (
          <div className="absolute bottom-20 sm:bottom-24 left-3 right-3 sm:left-4 sm:right-4 z-10 animate-slide-up">
            <div
              className="rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto"
              style={{
                background: 'rgba(9, 14, 24, 0.97)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,255,0.05)',
              }}
            >
              {/* Top electric bar */}
              <div
                style={{
                  height: '2px',
                  background: 'linear-gradient(90deg, #00D4FF 0%, #00FF88 50%, #FF8C00 100%)',
                }}
              />

              <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 mr-3">
                    <h3 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {selectedStation.name}
                    </h3>
                    <p className="text-xs mt-1 flex items-center gap-1.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                      <NavigateIcon />
                      <span className="truncate">{selectedStation.address}</span>
                    </p>
                    {selectedStation.operator && (
                      <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#FF8C00' }}
                        />
                        {selectedStation.operator}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"
                      style={{
                        background: `${getStatusConfig(selectedStation.status).color}18`,
                        border: `1px solid ${getStatusConfig(selectedStation.status).color}40`,
                        color: getStatusConfig(selectedStation.status).color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: getStatusConfig(selectedStation.status).color,
                          boxShadow: `0 0 6px ${getStatusConfig(selectedStation.status).glow}`,
                        }}
                      />
                      {getStatusConfig(selectedStation.status).text}
                    </span>
                    <button
                      onClick={() => setSelectedStation(null)}
                      className="p-1.5 rounded-full transition-all duration-200"
                      style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* Connectors */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedStation.connectors.map((connector, idx) => (
                    <div
                      key={connector.id || idx}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: connector.status === 'available'
                          ? 'rgba(0, 255, 136, 0.08)'
                          : connector.status === 'offline'
                          ? 'rgba(61, 90, 122, 0.1)'
                          : 'rgba(255, 140, 0, 0.08)',
                        border: connector.status === 'available'
                          ? '1px solid rgba(0, 255, 136, 0.2)'
                          : connector.status === 'offline'
                          ? '1px solid rgba(61, 90, 122, 0.2)'
                          : '1px solid rgba(255, 140, 0, 0.2)',
                        color: connector.status === 'available' ? '#00FF88'
                          : connector.status === 'offline' ? '#3D5A7A'
                          : '#FF8C00',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: connector.status === 'available' ? '#00FF88'
                            : connector.status === 'offline' ? '#3D5A7A'
                            : '#FF8C00',
                        }}
                      />
                      {(connector as { name?: string }).name && (
                        <span className="font-semibold hidden xs:inline">
                          {(connector as { name?: string }).name}
                        </span>
                      )}
                      <span>{connector.type}</span>
                      <span
                        className="font-bold"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {connector.power}kW
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price + Actions */}
                <div
                  className="flex flex-col xs:flex-row items-start xs:items-center justify-between pt-4 gap-3 xs:gap-0"
                  style={{ borderTop: '1px solid rgba(0, 212, 255, 0.08)' }}
                >
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Cena za kWh</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: '#00D4FF', fontFamily: "'Space Mono', monospace" }}
                    >
                      {selectedStation.pricePerKwh.toFixed(2)}{' '}
                      <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>€</span>
                    </p>
                  </div>
                  <div className="flex gap-2 w-full xs:w-auto">
                    <button
                      className="flex-1 xs:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200"
                      style={{
                        background: 'transparent',
                        border: '1.5px solid rgba(0, 212, 255, 0.25)',
                        color: '#00D4FF',
                      }}
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.latitude},${selectedStation.longitude}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <NavigateIcon />
                      <span className="hidden sm:inline">Navigovať</span>
                      <span className="sm:hidden">Nav</span>
                    </button>
                    <button
                      className="flex-1 xs:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: selectedStation.status === 'available'
                          ? 'linear-gradient(135deg, #00FF88, #00AA55)'
                          : 'rgba(0, 255, 136, 0.1)',
                        color: selectedStation.status === 'available' ? '#080C14' : '#3D5A7A',
                        boxShadow: selectedStation.status === 'available'
                          ? '0 4px 20px rgba(0, 255, 136, 0.4)'
                          : 'none',
                        border: selectedStation.status !== 'available'
                          ? '1px solid rgba(0, 255, 136, 0.1)'
                          : 'none',
                      }}
                      disabled={selectedStation.status !== 'available'}
                      onClick={() => {
                        window.location.href = `/charging?stationId=${selectedStation.id}`;
                      }}
                    >
                      <BoltIcon />
                      Nabíjať
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
