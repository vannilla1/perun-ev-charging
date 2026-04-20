import { NextRequest, NextResponse } from 'next/server';
import { getSmartmeAuth } from '@/lib/services/authHelper';
import { getPicoChargingData, CHARGING_STATE_NAMES } from '@/lib/services/smartmeService';
import { getEcarupAccessToken, ECARUP_API_BASE } from '@/lib/services/ecarupAuth';

// GET /api/charging/status?sessionId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'ID relácie je povinné' }, { status: 400 });
    }

    // 1. Ak je to Pico session, použijeme smart-me API
    if (sessionId.startsWith('pico-')) {
      const picoDeviceId = sessionId.split('-').slice(2).join('-'); // pico-{timestamp}-{uuid}
      const authHeader = request.headers.get('authorization');
      const smartmeAuth = await getSmartmeAuth(authHeader);

      if (smartmeAuth && picoDeviceId) {
        try {
          const chargingData = await getPicoChargingData(picoDeviceId, smartmeAuth.basicAuth);
          const stateName = CHARGING_STATE_NAMES[chargingData.state] || 'unknown';

          // Stav 4 = nabíjanie prebieha
          const isCharging = chargingData.state === 4;
          // Stav 1,2 po nabíjaní = ukončené
          const isCompleted = chargingData.state === 1 || chargingData.state === 2;

          let status: string;
          if (isCharging) {
            status = 'charging';
          } else if (chargingData.state === 3 || chargingData.state === 6) {
            status = 'starting';
          } else if (isCompleted && chargingData.activeChargingEnergy > 0) {
            status = 'completed';
          } else {
            status = 'idle';
          }

          return NextResponse.json({
            sessionId,
            status,
            currentPower: Math.round(chargingData.activeChargingPower * 100) / 100,
            energyDelivered: Math.round(chargingData.activeChargingEnergy * 100) / 100,
            duration: chargingData.duration,
            estimatedCost: 0, // 0€ pre špeciálnych používateľov
            pricePerKwh: 0,
            picoState: stateName,
            maxCurrent: chargingData.maxAllowedChargingCurrent,
            source: 'smartme_pico',
          });
        } catch (picoError) {
          console.error('[Status] Pico API error:', picoError);
        }
      }
    }

    // 2. Fallback na eCarUp API
    const sessionParts = sessionId.split('-');
    const stationId = searchParams.get('stationId') || sessionParts[2];
    const connectorId = searchParams.get('connectorId') || sessionParts[3];

    if (stationId && connectorId) {
      const accessToken = await getEcarupAccessToken();
      if (accessToken) {
        try {
          const activeResponse = await fetch(
            `${ECARUP_API_BASE}/v1/station/${stationId}/connectors/${connectorId}/active-charging`,
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
            if (activeCharging?.status) {
              const startTime = activeCharging.startTime ? new Date(activeCharging.startTime) : new Date();
              const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
              const meterValueKwh = (activeCharging.meterValue || 0) / 1000;
              const pricePerKwh = activeCharging.price || 0;

              return NextResponse.json({
                sessionId,
                status: activeCharging.status.toLowerCase(),
                currentPower: 0,
                energyDelivered: Math.round(meterValueKwh * 100) / 100,
                duration: elapsedSeconds,
                estimatedCost: Math.round(meterValueKwh * pricePerKwh * 100) / 100,
                pricePerKwh,
                source: 'ecarup_api',
              });
            }
          }
        } catch (apiError) {
          console.log('eCarUp API check failed:', apiError);
        }
      }
    }

    // 3. Simulácia pre demo/testing
    const sessionStart = parseInt(sessionParts[1]) || Date.now();
    const elapsedSeconds = Math.floor((Date.now() - sessionStart) / 1000);
    const maxPower = 22;
    const chargeLevel = Math.min(elapsedSeconds / 7200, 1);
    const currentPower = maxPower * (1 - chargeLevel * 0.3);
    const energyDelivered = (elapsedSeconds / 3600) * (maxPower * 0.85);

    return NextResponse.json({
      sessionId,
      status: 'charging',
      currentPower: Math.round(currentPower * 10) / 10,
      energyDelivered: Math.round(energyDelivered * 100) / 100,
      duration: elapsedSeconds,
      estimatedCost: 0,
      pricePerKwh: 0,
      source: 'simulation',
    });
  } catch (error) {
    console.error('Get charging status error:', error);
    return NextResponse.json({ error: 'Nepodarilo sa získať stav nabíjania' }, { status: 500 });
  }
}
