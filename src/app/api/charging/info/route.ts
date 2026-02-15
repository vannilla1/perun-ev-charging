import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

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

// Funkcia na vyhľadanie mapovania v MongoDB
async function findStationBySerial(serial: string): Promise<string | null> {
  try {
    const db = await getDb();
    const mapping = await db.collection('qr_mappings').findOne({ serial });
    return mapping?.stationId || null;
  } catch (error) {
    console.error('MongoDB lookup error:', error);
    return null;
  }
}

// POST /api/charging/info
// Získanie informácií o stanici bez spustenia nabíjania
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, connectorId, originalUrl } = body;

    if (!stationId) {
      return NextResponse.json(
        { error: 'ID stanice je povinné' },
        { status: 400 }
      );
    }

    // Ak máme originalUrl a stationId je špeciálny marker, presmerujeme na eCarUp
    if (stationId === 'ecarup-redirect' && originalUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: originalUrl,
        message: 'Presmerovanie na eCarUp platobný portál',
      });
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nepodarilo sa autentifikovať s API' },
        { status: 401 }
      );
    }

    // Najprv skúsime MongoDB mapovanie
    let resolvedStationId = stationId;
    console.log(`Checking MongoDB for serial mapping: ${stationId}`);
    const mongoStationId = await findStationBySerial(stationId);
    if (mongoStationId) {
      resolvedStationId = mongoStationId;
      console.log(`Found MongoDB mapping: ${stationId} -> ${resolvedStationId}`);
    }

    // Získame detail stanice
    const stationResponse = await fetch(
      `${ECARUP_API_BASE}/v1/station/${resolvedStationId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!stationResponse.ok) {
      // Ak máme originalUrl, presmerujeme na eCarUp
      if (originalUrl) {
        console.log(`Station not found, redirecting to original URL: ${originalUrl}`);
        return NextResponse.json({
          success: true,
          redirectUrl: originalUrl,
          message: 'Stanica nebola nájdená v našom systéme. Presmerovanie na eCarUp.',
        });
      }
      return NextResponse.json(
        { error: 'Stanica nebola nájdená' },
        { status: 404 }
      );
    }

    const stationData = await stationResponse.json();

    // Nájdeme správny konektor
    const connector = connectorId && connectorId !== 'default'
      ? stationData.connectors?.find((c: { id: string }) => c.id === connectorId)
      : stationData.connectors?.[0];

    if (!connector) {
      return NextResponse.json(
        { error: 'Konektor nebol nájdený' },
        { status: 404 }
      );
    }

    // Získame stav konektora
    const connectorState = connector.state || 'UNKNOWN';

    // Mapovanie stavu na slovenčinu
    const statusMap: Record<string, string> = {
      'AVAILABLE': 'dostupná',
      'OCCUPIED': 'obsadená',
      'UNAVAILABLE': 'nedostupná',
      'FAULTED': 'porucha',
      'CHARGING': 'prebieha nabíjanie',
      'PREPARING': 'pripravuje sa',
      'FINISHING': 'dokončuje sa',
      'UNKNOWN': 'neznámy stav',
    };

    return NextResponse.json({
      success: true,
      stationId: resolvedStationId,
      originalStationId: stationId !== resolvedStationId ? stationId : undefined,
      connectorId: connector.id,
      connectorNumber: connector.number,
      status: connectorState,
      statusText: statusMap[connectorState] || connectorState,
      isAvailable: connectorState === 'AVAILABLE',
      station: {
        name: stationData.name,
        address: [stationData.street, stationData.city].filter(Boolean).join(', '),
        maxPower: connector.maxpower ? connector.maxpower / 1000 : null,
        plugType: connector.plugtype?.replace('PLUG_TYPE_', '') || 'Type 2',
        description: connector.description,
      },
      // Cena - hardcoded zatiaľ, eCarUp API to možno poskytuje
      pricing: {
        pricePerKwh: 0.44,
        pricePerHour: 0.00,
        currency: 'EUR',
      },
      originalUrl,
    });
  } catch (error) {
    console.error('Station info error:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa načítať informácie o stanici' },
      { status: 500 }
    );
  }
}
