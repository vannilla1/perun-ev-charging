import { NextRequest, NextResponse } from 'next/server';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

// Cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID;
  const clientSecret = process.env.SMARTME_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('OAuth credentials not configured');
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
      console.error('Failed to get OAuth token:', response.status);
      return null;
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.9);

    return cachedToken;
  } catch (error) {
    console.error('OAuth request failed:', error);
    return null;
  }
}

// Fetch jednej stanice a vrátiť konektory
async function fetchStationConnectors(
  singleStationId: string,
  accessToken: string,
): Promise<{ id: string; name: string; address: string; connectors: Array<Record<string, unknown>> } | null> {
  const response = await fetch(
    `${ECARUP_API_BASE}/v1/station/${singleStationId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const connectors = (data.connectors || []).map(
    (c: { id: string; number: number; name: string; plugtype: string; maxpower: number | null; state: string }) => ({
      id: c.id,
      number: c.number,
      name: c.name || '',
      plugType: (c.plugtype || '').replace('PLUG_TYPE_', ''),
      maxPower: c.maxpower ? c.maxpower / 1000 : null,
      state: c.state || 'UNKNOWN',
    })
  );

  return {
    id: data.id || singleStationId,
    name: data.name || '',
    address: [data.street, data.city].filter(Boolean).join(', '),
    connectors,
  };
}

// GET /api/charging/station-connectors?stationId=X
// Podporuje zlúčené L/P stanice (formát "uuid1_uuid2") — fetchne obe a skombinuje konektory
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');

    if (!stationId) {
      return NextResponse.json(
        { error: 'stationId query parameter is required' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with API' },
        { status: 401 }
      );
    }

    // Rozdeliť zlúčené ID (L/P páry majú formát "uuid1_uuid2")
    const stationIds = stationId.split('_').filter(Boolean);

    // Fetch všetky stanice paralelne
    const results = await Promise.all(
      stationIds.map(id => fetchStationConnectors(id, accessToken))
    );

    const validResults = results.filter(Boolean) as NonNullable<typeof results[number]>[];

    if (validResults.length === 0) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    // Skombinovať konektory zo všetkých staníc — Ľavá/Left vždy prvá
    const allConnectors = validResults.flatMap(r => r.connectors)
      .sort((a, b) => {
        const aName = String(a.name || '').toLowerCase();
        const bName = String(b.name || '').toLowerCase();
        const aIsLeft = aName.includes('ľavá') || aName.includes('left') || aName.includes('lav');
        const bIsLeft = bName.includes('ľavá') || bName.includes('left') || bName.includes('lav');
        if (aIsLeft && !bIsLeft) return -1;
        if (!aIsLeft && bIsLeft) return 1;
        return 0;
      });

    // Názov — použiť spoločný base name (bez L/P suffixu)
    const baseName = validResults[0].name.replace(/ [LP]$/, '').trim();

    return NextResponse.json({
      stationId,
      name: baseName,
      address: validResults[0].address,
      connectors: allConnectors,
    });
  } catch (error) {
    console.error('Station connectors error:', error);
    return NextResponse.json(
      { error: 'Failed to load station connectors' },
      { status: 500 }
    );
  }
}
