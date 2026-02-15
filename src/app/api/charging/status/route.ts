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
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.9);

    return cachedToken;
  } catch {
    return null;
  }
}

// GET /api/charging/status?sessionId=xxx
// Získanie stavu nabíjacej relácie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const stationId = searchParams.get('stationId');
    const connectorId = searchParams.get('connectorId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID relácie je povinné' },
        { status: 400 }
      );
    }

    // Parsovanie sessionId pre získanie stationId a connectorId
    // Format: session-{timestamp}-{stationId}-{connectorId}
    const sessionParts = sessionId.split('-');
    const parsedStationId = stationId || sessionParts[2];
    const parsedConnectorId = connectorId || sessionParts[3];

    // Ak máme stationId a connectorId, skúsime získať reálne dáta z eCarUp
    if (parsedStationId && parsedConnectorId) {
      const accessToken = await getAccessToken();

      if (accessToken) {
        try {
          const activeResponse = await fetch(
            `${ECARUP_API_BASE}/v1/station/${parsedStationId}/connectors/${parsedConnectorId}/active-charging`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
              cache: 'no-store',
            }
          );

          if (activeResponse.ok) {
            const activeCharging = await activeResponse.json();

            if (activeCharging && activeCharging.status) {
              // Máme reálne dáta z API
              const startTime = activeCharging.startTime ? new Date(activeCharging.startTime) : new Date();
              const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
              const meterValueKwh = (activeCharging.meterValue || 0) / 1000; // Wh -> kWh
              const pricePerKwh = activeCharging.price || 0.35;

              return NextResponse.json({
                sessionId,
                status: activeCharging.status.toLowerCase(),
                currentPower: 0, // API neposkytuje aktuálny výkon
                energyDelivered: Math.round(meterValueKwh * 100) / 100,
                duration: elapsedSeconds,
                estimatedCost: Math.round(meterValueKwh * pricePerKwh * 100) / 100,
                pricePerKwh,
                transactionId: activeCharging.transactionId,
                driverId: activeCharging.driverId,
                source: 'ecarup_api',
              });
            }
          }
        } catch (apiError) {
          console.log('eCarUp API check failed, using simulation:', apiError);
        }
      }
    }

    // Fallback na simulované hodnoty
    const sessionStart = parseInt(sessionParts[1]) || Date.now();
    const elapsedSeconds = Math.floor((Date.now() - sessionStart) / 1000);

    // Typický nabíjací profil
    const maxPower = 22; // kW
    const chargeLevel = Math.min(elapsedSeconds / 7200, 1);
    const currentPower = maxPower * (1 - chargeLevel * 0.3);

    const energyDelivered = (elapsedSeconds / 3600) * (maxPower * 0.85);
    const pricePerKwh = 0.35;
    const estimatedCost = energyDelivered * pricePerKwh;

    return NextResponse.json({
      sessionId,
      status: 'charging',
      currentPower: Math.round(currentPower * 10) / 10,
      energyDelivered: Math.round(energyDelivered * 100) / 100,
      duration: elapsedSeconds,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      pricePerKwh,
      voltage: 230 + Math.random() * 10,
      current: Math.round((currentPower * 1000) / 230),
      stateOfCharge: Math.min(Math.round(20 + chargeLevel * 80), 100),
      source: 'simulation',
    });
  } catch (error) {
    console.error('Get charging status error:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa získať stav nabíjania' },
      { status: 500 }
    );
  }
}
