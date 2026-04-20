import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getEcarupAccessToken, ECARUP_API_BASE } from '@/lib/services/ecarupAuth';

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

    const accessToken = await getEcarupAccessToken();

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

    // Cena — získať z hlavného stations cache
    let pricePerKwh = 0.40;  // fallback
    let pricePerH = 0;
    let userPricePerKwh: number | undefined;
    let userPricePerH: number | undefined;

    // Získať userEmail z request body pre individuálne ceny
    const userEmail = body.userEmail?.toLowerCase() || null;

    try {
      const stationsParams = new URLSearchParams();
      if (userEmail) stationsParams.set('userEmail', userEmail);
      const stationsRes = await fetch(
        `${request.nextUrl.origin}/api/ecarup/stations?${stationsParams}`,
        { cache: 'no-store' }
      );
      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        const matchedStation = stationsData.stations?.find(
          (s: Record<string, unknown>) => s.id === resolvedStationId
        );
        if (matchedStation?.connectors?.[0]) {
          const c = matchedStation.connectors[0];
          if (c.pricePerKwh != null) pricePerKwh = c.pricePerKwh;
          if (c.pricePerH != null) pricePerH = c.pricePerH;
          if (c.userPricePerKwh != null) userPricePerKwh = c.userPricePerKwh;
          if (c.userPricePerH != null) userPricePerH = c.userPricePerH;
        }
      }
    } catch {
      // Use fallback price
    }

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
      pricing: {
        pricePerKwh,
        pricePerHour: pricePerH,
        userPricePerKwh,
        userPricePerHour: userPricePerH,
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
