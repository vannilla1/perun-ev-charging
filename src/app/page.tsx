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
        className="bg-gradient-to-b from-[var(--surface)] to-[var(--surface-secondary)]"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', marginTop: '-80px' }}>
          <div
            className="rounded-full bg-gradient-to-br from-[var(--perun-blue)] to-[var(--perun-green)] flex items-center justify-center animate-pulse"
            style={{ width: '64px', height: '64px', margin: '0 auto 16px auto' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-base text-[var(--text-secondary)]">Načítavam mapu...</p>
        </div>
      </div>
    ),
  }
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const NavigateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default function MapPage() {
  const t = useTranslations('station');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<StationFilters>({});

  // Použitie React Query hooku
  const { data: stations, isLoading, error } = useStations(filters);

  // Filtrovanie podľa vyhľadávania
  const filteredStations = stations?.filter((station) =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.address.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleStationClick = (station: ChargingStation) => {
    setSelectedStation(station);
  };

  const getStatusConfig = (status: ChargingStation['status']) => {
    const config = {
      available: {
        text: t('available'),
        bg: 'bg-[var(--perun-green)]',
        textColor: 'text-white',
        icon: '✓'
      },
      occupied: {
        text: t('occupied'),
        bg: 'bg-[var(--perun-orange)]',
        textColor: 'text-white',
        icon: '⚡'
      },
      offline: {
        text: 'Nedostupná',
        bg: 'bg-gray-400',
        textColor: 'text-white',
        icon: '✕'
      },
      maintenance: {
        text: t('maintenance'),
        bg: 'bg-gray-400',
        textColor: 'text-white',
        icon: '🔧'
      },
    };
    return config[status];
  };

  return (
    <AppLayout showNavigation={true}>
      <div className="relative h-[calc(100vh-64px)] sm:h-[calc(100vh-72px)]">
        {/* Premium Header with Logo */}
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="px-2 sm:px-4 pt-2 sm:pt-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between pointer-events-auto">
              {/* Logo - responzívne veľkosti */}
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 shadow-lg border border-white/50">
                <Image
                  src="/images/perun-logo.png"
                  alt="Perun Electromobility"
                  width={150}
                  height={62}
                  className="h-8 sm:h-10 md:h-12 w-auto"
                  unoptimized
                  priority
                />
              </div>

            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="absolute inset-0">
          {isLoading ? (
            <div
              className="bg-gradient-to-b from-[var(--surface)] to-[var(--surface-secondary)]"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ textAlign: 'center', padding: '0 16px', marginTop: '-80px' }}>
                <div
                  className="rounded-full bg-gradient-to-br from-[var(--perun-blue)] to-[var(--perun-green)] flex items-center justify-center"
                  style={{ width: '80px', height: '80px', margin: '0 auto 16px auto' }}
                >
                  <svg className="w-10 h-10 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-[var(--text-primary)]" style={{ marginBottom: '4px' }}>Načítavam stanice</p>
                <p className="text-sm text-[var(--text-secondary)]">Prosím počkajte...</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[var(--surface)] to-[var(--surface-secondary)]">
              <div className="text-center p-4 sm:p-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-base sm:text-lg font-medium text-[var(--text-primary)] mb-2">Nepodarilo sa načítať stanice</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-premium btn-primary text-sm sm:text-base px-4 py-2"
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

        {/* Search bar - Premium Design - Responzívny */}
        <div className="absolute top-14 sm:top-20 left-2 right-2 sm:left-4 sm:right-4 z-10 pointer-events-none">
          <div className="flex gap-2 sm:gap-3 pointer-events-auto">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Hľadať nabíjaciu stanicu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 bg-white/95 backdrop-blur-md border border-white/50 rounded-xl sm:rounded-2xl shadow-lg text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--perun-blue)] focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-lg transition-all backdrop-blur-md border border-white/50 ${
                showFilters || filters.onlyAvailable
                  ? 'bg-gradient-to-br from-[var(--perun-blue)] to-[var(--perun-blue-dark)] text-white'
                  : 'bg-white/95 text-[var(--text-secondary)] hover:text-[var(--perun-blue)]'
              }`}
            >
              <FilterIcon />
            </button>
          </div>

          {/* Filter panel - Premium Design */}
          {showFilters && (
            <div className="mt-2 sm:mt-3 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-white/50 overflow-hidden animate-slide-up pointer-events-auto">
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-semibold text-sm sm:text-base text-[var(--text-primary)]">Filtre</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <label className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[var(--surface-secondary)] cursor-pointer hover:bg-[var(--border-light)] transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.onlyAvailable || false}
                      onChange={() => setFilters((prev) => ({ ...prev, onlyAvailable: !prev.onlyAvailable }))}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg border-2 border-[var(--border)] text-[var(--perun-green)] focus:ring-[var(--perun-green)] cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[var(--perun-green)]" />
                      <span className="text-sm sm:text-base font-medium">Len dostupné stanice</span>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <button
                    onClick={() => setFilters({})}
                    className="flex-1 py-2 sm:py-3 border-2 border-[var(--border)] rounded-lg sm:rounded-xl text-sm sm:text-base font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    Vymazať
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 py-2 sm:py-3 bg-gradient-to-r from-[var(--perun-blue)] to-[var(--perun-blue-dark)] text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Použiť
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Station card - Premium Design - Responzívny */}
        {selectedStation && (
          <div className="absolute bottom-20 sm:bottom-24 left-2 right-2 sm:left-4 sm:right-4 z-10 animate-slide-up">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-white/50 overflow-hidden max-h-[60vh] overflow-y-auto">
              {/* Header with gradient accent */}
              <div className="h-1 sm:h-1.5 bg-gradient-to-r from-[var(--perun-blue)] via-[var(--perun-green)] to-[var(--perun-orange)]" />

              <div className="p-3 sm:p-5">
                {/* Station info */}
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1 mr-2 sm:mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base sm:text-xl text-[var(--text-primary)] line-clamp-2">
                        {selectedStation.name}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] flex items-center gap-1 line-clamp-1">
                      <NavigateIcon />
                      <span className="truncate">{selectedStation.address}</span>
                    </p>
                    {selectedStation.operator && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--perun-orange)]" />
                        {selectedStation.operator}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 sm:gap-2">
                    <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold ${getStatusConfig(selectedStation.status).bg} ${getStatusConfig(selectedStation.status).textColor} shadow-sm whitespace-nowrap`}>
                      {getStatusConfig(selectedStation.status).icon} {getStatusConfig(selectedStation.status).text}
                    </span>
                    <button
                      onClick={() => setSelectedStation(null)}
                      className="p-1 sm:p-1.5 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] transition-colors"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* Connectors - Responzívne */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-5">
                  {selectedStation.connectors.map((connector, idx) => (
                    <div
                      key={connector.id || idx}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        connector.status === 'available'
                          ? 'bg-[var(--perun-green)]/10 text-[var(--perun-green)] border border-[var(--perun-green)]/20'
                          : connector.status === 'offline'
                          ? 'bg-gray-100 text-gray-500 border border-gray-200'
                          : 'bg-[var(--perun-orange)]/10 text-[var(--perun-orange)] border border-[var(--perun-orange)]/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                        connector.status === 'available' ? 'bg-[var(--perun-green)]' :
                        connector.status === 'offline' ? 'bg-gray-400' : 'bg-[var(--perun-orange)]'
                      }`} />
                      {(connector as { name?: string }).name && (
                        <span className="font-semibold hidden xs:inline">{(connector as { name?: string }).name}</span>
                      )}
                      <span>{connector.type}</span>
                      <span className="font-bold">{connector.power} kW</span>
                    </div>
                  ))}
                </div>

                {/* Price and actions - Responzívne */}
                <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between pt-3 sm:pt-4 border-t border-[var(--border-light)] gap-3 xs:gap-0">
                  <div>
                    <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-0.5">Cena za kWh</p>
                    <p className="text-xl sm:text-2xl font-bold text-[var(--perun-blue)]">
                      {selectedStation.pricePerKwh > 0
                        ? <>{selectedStation.pricePerKwh.toFixed(2)} <span className="text-sm sm:text-base font-normal">€</span></>
                        : 'Zadarmo'}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:gap-3 w-full xs:w-auto">
                    <button
                      className="flex-1 xs:flex-initial flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 border-2 border-[var(--perun-blue)] text-[var(--perun-blue)] rounded-lg sm:rounded-xl text-xs sm:text-base font-semibold hover:bg-[var(--perun-blue)] hover:text-white transition-all"
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
                      className="flex-1 xs:flex-initial flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-[var(--perun-green)] to-[var(--perun-green-dark)] text-white rounded-lg sm:rounded-xl text-xs sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
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
