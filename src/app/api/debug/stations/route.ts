import { NextResponse } from 'next/server';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID;
  const clientSecret = process.env.SMARTME_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

// DEBUG endpoint - zobrazí štruktúru staníc z eCarUp API
export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }

  try {
    // Skúsime bez filter parametra
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

    // Vrátiť prvé 3 stanice s kompletnou štruktúrou
    const stations = (data.stations || data || []).slice(0, 3);

    // Extrahovať všetky kľúče z prvej stanice
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
