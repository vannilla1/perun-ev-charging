'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface QRMapping {
  serial: string;
  stationId: string;
  stationName?: string;
  createdAt?: string;
}

interface Station {
  id: string;
  name: string;
  serialnumber: number;
}

export default function QRMappingsAdminPage() {
  const t = useTranslations('admin.qrMappings');
  const tCommon = useTranslations('common');
  const [mappings, setMappings] = useState<QRMapping[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [serial, setSerial] = useState('');
  const [stationId, setStationId] = useState('');
  const [stationName, setStationName] = useState('');

  // Načítať mapovania a stanice
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Načítať mapovania
      const mappingsRes = await fetch('/api/qr-mappings');
      const mappingsData = await mappingsRes.json();
      setMappings(mappingsData.mappings || []);

      // Načítať stanice z eCarUp
      const stationsRes = await fetch('/api/ecarup/stations');
      const stationsData = await stationsRes.json();
      setStations(stationsData.stations || []);
    } catch (err) {
      setError(t('loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!serial || !stationId) {
      setError(t('required'));
      return;
    }

    try {
      const res = await fetch('/api/qr-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, stationId, stationName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('saveError'));
      }

      setSuccess(t('saved'));
      setSerial('');
      setStationId('');
      setStationName('');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveError'));
    }
  };

  const handleDelete = async (serialToDelete: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const res = await fetch(`/api/qr-mappings?serial=${encodeURIComponent(serialToDelete)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(t('deleteError'));
      }

      setSuccess(t('deleted'));
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'));
    }
  };

  const handleStationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setStationId(selectedId);

    const station = stations.find(s => s.id === selectedId);
    if (station) {
      setStationName(station.name);
    }
  };

  // Extrahovať serial z URL
  const extractSerialFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const serialParam = urlObj.searchParams.get('serial');
      if (serialParam) {
        setSerial(serialParam);
      }
    } catch {
      // Nie je URL, použiť ako serial
      setSerial(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
          <p>{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Formulár na pridanie mapovania */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('form.title')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.serial')}
              </label>
              <input
                type="text"
                value={serial}
                onChange={(e) => extractSerialFromUrl(e.target.value)}
                placeholder={t('form.serialPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.station')}
              </label>
              <select
                value={stationId}
                onChange={handleStationSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('form.selectStation')}</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name} (#{station.serialnumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.stationName')}
              </label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="ePerun MI Dukelská/Obchodná L"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('form.submit')}
            </button>
          </form>
        </div>

        {/* Zoznam existujúcich mapovaní */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t('list.title', { count: mappings.length })}
          </h2>

          {mappings.length === 0 ? (
            <p className="text-gray-500">{t('list.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">{t('list.serial')}</th>
                    <th className="text-left py-2 px-2">{t('list.stationId')}</th>
                    <th className="text-left py-2 px-2">{t('list.name')}</th>
                    <th className="text-right py-2 px-2">{t('list.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => (
                    <tr key={mapping.serial} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-mono text-xs">
                        {mapping.serial.substring(0, 20)}...
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {mapping.stationId.substring(0, 15)}...
                      </td>
                      <td className="py-2 px-2">{mapping.stationName || '-'}</td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => handleDelete(mapping.serial)}
                          className="text-red-600 hover:text-red-800"
                        >
                          {t('list.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debug info - stanice */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">
            {t('stations.title', { count: stations.length })}
          </h2>
          <div className="text-xs font-mono max-h-60 overflow-y-auto">
            {stations.map((station) => (
              <div key={station.id} className="py-1 border-b">
                <strong>{station.name}</strong><br />
                {t('stations.id', { id: station.id })}<br />
                {t('stations.serial', { serial: String(station.serialnumber) })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
