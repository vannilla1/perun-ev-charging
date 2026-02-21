'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ChargingStation } from '@/types';

// Perun brand colors
const PERUN_COLORS = {
  blue: '#0099D8',
  green: '#8DC63F',
  orange: '#F7941D',
  gray: '#9CA3AF',
};

// Premium marker s Perun farbami
const createCustomIcon = (status: ChargingStation['status']) => {
  const colors = {
    available: PERUN_COLORS.green,
    occupied: PERUN_COLORS.orange,
    offline: PERUN_COLORS.gray,
    maintenance: PERUN_COLORS.gray,
  };

  const glowColors = {
    available: 'rgba(141, 198, 63, 0.4)',
    occupied: 'rgba(247, 148, 29, 0.4)',
    offline: 'rgba(156, 163, 175, 0.3)',
    maintenance: 'rgba(156, 163, 175, 0.3)',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: ${glowColors[status]};
          border-radius: 50%;
          animation: marker-pulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, ${colors[status]} 0%, ${colors[status]}dd 100%);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

interface LocationMarkerProps {
  position: [number, number] | null;
}

// Komponent pre počiatočné prispôsobenie mapy podľa staníc (spustí sa iba raz)
function FitBoundsToStations({ stations }: { stations: ChargingStation[] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    // Spustiť iba raz pri prvom načítaní staníc
    if (stations.length > 0 && !hasFittedRef.current) {
      const bounds = L.latLngBounds(
        stations.map(s => [s.latitude, s.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
      hasFittedRef.current = true;
    }
  }, [map, stations]);

  return null;
}

function LocationMarker({ position }: LocationMarkerProps) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 14);
    }
  }, [map, position]);

  if (!position) return null;

  const userIcon = L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: rgba(0, 153, 216, 0.2);
          border-radius: 50%;
          animation: user-pulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, ${PERUN_COLORS.blue} 0%, #0077B5 100%);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 153, 216, 0.4);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return <Marker position={position} icon={userIcon} />;
}

interface StationMapProps {
  stations: ChargingStation[];
  onStationClick?: (station: ChargingStation) => void;
  center?: [number, number];
  zoom?: number;
  showUserLocation?: boolean;
}

export function StationMap({
  stations,
  onStationClick,
  center = [48.75, 21.25],
  zoom = 8,
  showUserLocation = true,
}: StationMapProps) {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);

    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mapReady) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-[var(--surface)] to-[var(--surface-secondary)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-secondary)]">Načítavam mapu...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={userPosition || center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showUserLocation && <LocationMarker position={userPosition} />}

      {/* Automaticky prispôsob mapu podľa staníc */}
      {stations.length > 0 && !userPosition && <FitBoundsToStations stations={stations} />}

      {/* Najprv vykresliť nedostupné (šedé) stanice - budú pod ostatnými */}
      {stations
        .filter(station => station.status === 'offline' || station.status === 'maintenance')
        .map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={createCustomIcon(station.status)}
            zIndexOffset={-1000}
            eventHandlers={{
              click: () => onStationClick?.(station),
            }}
          />
        ))}

      {/* Potom vykresliť dostupné (zelené) a obsadené (oranžové) stanice - budú navrchu */}
      {stations
        .filter(station => station.status === 'available' || station.status === 'occupied')
        .map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={createCustomIcon(station.status)}
            zIndexOffset={1000}
            eventHandlers={{
              click: () => onStationClick?.(station),
            }}
          />
        ))}
    </MapContainer>
  );
}
