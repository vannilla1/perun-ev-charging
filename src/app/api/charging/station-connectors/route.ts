import { NextRequest, NextResponse } from 'next/server';
import { getEcarupAccessToken, ECARUP_API_BASE } from '@/lib/services/ecarupAuth';

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
  const realStationId = data.id || singleStationId;
  const connectors = (data.connectors || []).map(
    (c: { id: string; number: number; name: string; plugtype: string; maxpower: number | null; state: string }) => ({
      id: c.id,
      stationId: realStationId,
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

    const accessToken = await getEcarupAccessToken();

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
