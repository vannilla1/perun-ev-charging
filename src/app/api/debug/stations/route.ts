import { NextResponse } from 'next/server';
import { getEcarupAccessToken, ECARUP_API_BASE } from '@/lib/services/ecarupAuth';

// DEBUG endpoint - len v development móde
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const accessToken = await getEcarupAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${ECARUP_API_BASE}/v1/stations`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'API error', status: response.status }, { status: response.status });
    }

    const data = await response.json();

    const stations = (data.stations || data || []).slice(0, 3);
    const sampleStation = stations[0];
    const stationKeys = sampleStation ? Object.keys(sampleStation) : [];
    const connectorKeys = sampleStation?.connectors?.[0] ? Object.keys(sampleStation.connectors[0]) : [];

    return NextResponse.json({
      totalStations: (data.stations || data || []).length,
      stationKeys,
      connectorKeys,
      sampleStations: stations,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Request failed', details: String(error) }, { status: 500 });
  }
}
