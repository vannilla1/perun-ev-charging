import { NextRequest, NextResponse } from 'next/server';
import { getSmartmeAuth } from '@/lib/services/authHelper';
import {
  findPicoByStationId,
  getPicoChargingData,
  switchDevice,
  getDeviceActions,
  executeAction,
  CHARGING_STATE_NAMES,
} from '@/lib/services/smartmeService';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

// Cache pre eCarUp OAuth token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID;
  const clientSecret = process.env.SMARTME_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) return null;

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.9);
    return cachedToken;
  } catch {
    return null;
  }
}

// POST /api/charging/start
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, connectorId, originalUrl } = body;

    if (!stationId) {
      return NextResponse.json({ error: 'ID stanice je povinné' }, { status: 400 });
    }

    // eCarUp redirect fallback
    if (stationId === 'ecarup-redirect' && originalUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: originalUrl,
        message: 'Presmerovanie na eCarUp platobný portál',
      });
    }

    // 1. Získať eCarUp OAuth token pre informácie o stanici
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Nepodarilo sa autentifikovať s API' }, { status: 401 });
    }

    // 2. Získať detail stanice z eCarUp
    const stationResponse = await fetch(
      `${ECARUP_API_BASE}/v1/station/${stationId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!stationResponse.ok) {
      if (originalUrl) {
        return NextResponse.json({
          success: true,
          redirectUrl: originalUrl,
          message: 'Stanica nebola nájdená, presmerovanie na eCarUp.',
        });
      }
      return NextResponse.json({ error: 'Stanica nebola nájdená' }, { status: 404 });
    }

    const stationData = await stationResponse.json();
    const connector = connectorId && connectorId !== 'default'
      ? stationData.connectors?.find((c: { id: string }) => c.id === connectorId)
      : stationData.connectors?.[0];

    if (!connector) {
      return NextResponse.json({ error: 'Konektor nebol nájdený' }, { status: 404 });
    }

    // 3. Pokúsiť sa o reálne spustenie cez smart-me API
    const authHeader = request.headers.get('authorization');
    const smartmeAuth = await getSmartmeAuth(authHeader);

    if (smartmeAuth) {
      console.log(`[Charging Start] User ${smartmeAuth.email} - trying smart-me API`);

      try {
        // Nájsť Pico zariadenie pre túto stanicu
        const picoDevice = await findPicoByStationId(
          stationId,
          stationData.name,
          smartmeAuth.basicAuth
        );

        if (picoDevice) {
          // Skontrolovať stav nabíjačky
          const chargingData = await getPicoChargingData(picoDevice.id, smartmeAuth.basicAuth);
          const state = chargingData.state;
          const stateName = CHARGING_STATE_NAMES[state] || 'unknown';

          console.log(`[Charging Start] Pico ${picoDevice.name} state: ${stateName} (${state})`);

          // Stav 4 = už sa nabíja
          if (state === 4) {
            return NextResponse.json({
              success: true,
              sessionId: `pico-${Date.now()}-${picoDevice.id}`,
              stationId,
              picoDeviceId: picoDevice.id,
              connectorId: connector.id,
              status: 'charging',
              message: 'Nabíjanie už prebieha na tejto stanici.',
              station: {
                name: stationData.name,
                address: [stationData.street, stationData.city].filter(Boolean).join(', '),
                maxPower: connector.maxpower ? connector.maxpower / 1000 : null,
                plugType: connector.plugtype,
              },
              chargingData: {
                power: chargingData.activeChargingPower,
                energy: chargingData.activeChargingEnergy,
                duration: chargingData.duration,
              },
              startTime: new Date().toISOString(),
            });
          }

          // Stav 7 = offline
          if (state === 7) {
            return NextResponse.json({
              error: 'Nabíjačka je offline',
              picoState: stateName,
            }, { status: 503 });
          }

          // Stav 1 = čaká na auto (kábel nie je pripojený)
          if (state === 1) {
            return NextResponse.json({
              error: 'Pripojte najprv nabíjací kábel k vozidlu',
              picoState: stateName,
              picoDeviceId: picoDevice.id,
            }, { status: 409 });
          }

          // Stav 2 = auto je pripojené, pripravené na nabíjanie
          // Stav 6 = čaká na autorizáciu
          if (state === 2 || state === 6) {
            console.log(`[Charging Start] Starting charging on ${picoDevice.name}...`);

            // Skúsime najprv cez actions API
            try {
              const actions = await getDeviceActions(picoDevice.id, smartmeAuth.basicAuth);
              console.log(`[Charging Start] Available actions:`, actions.map(a => `${a.name} (${a.obisCode})`));

              const onOffAction = actions.find(a => a.actionType === 0);
              if (onOffAction) {
                await executeAction(picoDevice.id, [{ obisCode: onOffAction.obisCode, value: 1 }], smartmeAuth.basicAuth);
                console.log(`[Charging Start] Action executed: ${onOffAction.name} = ON`);
              } else {
                // Fallback na switch API
                await switchDevice(picoDevice.id, true, smartmeAuth.basicAuth);
                console.log(`[Charging Start] Switch ON executed`);
              }
            } catch (actionError) {
              console.log(`[Charging Start] Actions API failed, trying switch:`, actionError);
              await switchDevice(picoDevice.id, true, smartmeAuth.basicAuth);
              console.log(`[Charging Start] Switch ON executed (fallback)`);
            }

            return NextResponse.json({
              success: true,
              sessionId: `pico-${Date.now()}-${picoDevice.id}`,
              stationId,
              picoDeviceId: picoDevice.id,
              connectorId: connector.id,
              status: 'starting',
              message: 'Nabíjanie sa spúšťa...',
              station: {
                name: stationData.name,
                address: [stationData.street, stationData.city].filter(Boolean).join(', '),
                maxPower: connector.maxpower ? connector.maxpower / 1000 : null,
                plugType: connector.plugtype,
              },
              startTime: new Date().toISOString(),
            });
          }

          // Stav 3 = čaká na auto po spustení
          if (state === 3) {
            return NextResponse.json({
              success: true,
              sessionId: `pico-${Date.now()}-${picoDevice.id}`,
              stationId,
              picoDeviceId: picoDevice.id,
              connectorId: connector.id,
              status: 'starting',
              message: 'Nabíjačka čaká na pripojenie vozidla.',
              station: {
                name: stationData.name,
                address: [stationData.street, stationData.city].filter(Boolean).join(', '),
                maxPower: connector.maxpower ? connector.maxpower / 1000 : null,
                plugType: connector.plugtype,
              },
              startTime: new Date().toISOString(),
            });
          }

          // Iný stav - logovať
          console.log(`[Charging Start] Unexpected state: ${stateName}`);
        } else {
          console.log(`[Charging Start] No matching Pico device found for station ${stationId}`);
        }
      } catch (smartmeError) {
        console.error('[Charging Start] Smart-me API error:', smartmeError);
      }
    }

    // 4. Fallback - bez smart-me (informačná odpoveď)
    const sessionId = `session-${Date.now()}-${stationId}-${connector.id}`;
    const paymentUrl = stationData.paymentUrl || `https://ecarup.com/charge/${stationId}`;

    return NextResponse.json({
      success: true,
      sessionId,
      stationId,
      connectorId: connector.id,
      status: 'pending_authorization',
      message: smartmeAuth
        ? 'Nepodarilo sa nájsť nabíjačku v smart-me. Pripojte kábel a autorizujte na stanici.'
        : 'Prihláste sa pre vzdialené spustenie nabíjania, alebo autorizujte priamo na stanici.',
      station: {
        name: stationData.name,
        address: [stationData.street, stationData.city].filter(Boolean).join(', '),
        maxPower: connector.maxpower ? connector.maxpower / 1000 : null,
        plugType: connector.plugtype,
      },
      paymentUrl,
      startTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Start charging error:', error);
    return NextResponse.json({ error: 'Nepodarilo sa spustiť nabíjanie' }, { status: 500 });
  }
}
