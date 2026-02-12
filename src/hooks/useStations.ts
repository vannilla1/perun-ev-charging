'use client';

import { useQuery } from '@tanstack/react-query';
import { getStations, getNearbyStations, getStationById, filterStations } from '@/services/api/stationService';
import type { StationFilters } from '@/types';

// Hook pre získanie všetkých staníc
export function useStations(filters?: StationFilters) {
  const query = useQuery({
    queryKey: ['stations'],
    queryFn: () => getStations(),
    staleTime: 2 * 60 * 1000, // 2 minúty
  });

  // Aplikovať filtre na dáta
  const filteredData = query.data && filters
    ? filterStations(query.data, filters)
    : query.data;

  return {
    ...query,
    data: filteredData,
  };
}

// Hook pre získanie staníc v okolí
export function useNearbyStations(
  latitude: number | null,
  longitude: number | null,
  radius: number = 10
) {
  return useQuery({
    queryKey: ['stations', 'nearby', latitude, longitude, radius],
    queryFn: () => getNearbyStations(latitude!, longitude!, radius),
    enabled: latitude !== null && longitude !== null,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook pre získanie detailu stanice
export function useStation(id: string | null) {
  return useQuery({
    queryKey: ['station', id],
    queryFn: () => getStationById(id!),
    enabled: id !== null,
    staleTime: 30 * 1000, // 30 sekúnd
  });
}

// Hook pre geolokáciu používateľa
export function useUserLocation() {
  return useQuery({
    queryKey: ['userLocation'],
    queryFn: () =>
      new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolokácia nie je podporovaná'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(new Error(error.message));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      }),
    staleTime: 5 * 60 * 1000, // 5 minút
    retry: false,
  });
}
