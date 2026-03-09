import { NextRequest, NextResponse } from 'next/server';
import { getSmartmeAuth } from '@/lib/services/authHelper';
import {
  getPicoChargingData,
  switchDevice,
  getDeviceActions,
  executeAction,
} from '@/lib/services/smartmeService';

// POST /api/charging/stop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'ID relácie je povinné' }, { status: 400 });
    }

    // 1. Ak je to Pico session, zastavíme cez smart-me API
    if (sessionId.startsWith('pico-')) {
      const picoDeviceId = sessionId.split('-').slice(2).join('-');
      const authHeader = request.headers.get('authorization');
      const smartmeAuth = await getSmartmeAuth(authHeader);

      if (smartmeAuth && picoDeviceId) {
        try {
          // Získať aktuálne nabíjacie dáta pred zastavením
          const chargingData = await getPicoChargingData(picoDeviceId, smartmeAuth.basicAuth);

          // Zastaviť nabíjanie
          try {
            const actions = await getDeviceActions(picoDeviceId, smartmeAuth.basicAuth);
            const onOffAction = actions.find(a => a.actionType === 0);
            if (onOffAction) {
              await executeAction(picoDeviceId, [{ obisCode: onOffAction.obisCode, value: 0 }], smartmeAuth.basicAuth);
              console.log(`[Charging Stop] Action executed: ${onOffAction.name} = OFF`);
            } else {
              await switchDevice(picoDeviceId, false, smartmeAuth.basicAuth);
              console.log(`[Charging Stop] Switch OFF executed`);
            }
          } catch (actionError) {
            console.log(`[Charging Stop] Actions failed, trying switch:`, actionError);
            await switchDevice(picoDeviceId, false, smartmeAuth.basicAuth);
            console.log(`[Charging Stop] Switch OFF executed (fallback)`);
          }

          return NextResponse.json({
            success: true,
            session: {
              id: sessionId,
              status: 'completed',
              endTime: new Date().toISOString(),
              energyDelivered: Math.round(chargingData.activeChargingEnergy * 100) / 100,
              duration: chargingData.duration,
              cost: 0, // 0€ pre špeciálnych používateľov
              pricePerKwh: 0,
            },
            message: 'Nabíjanie bolo úspešne ukončené',
            source: 'smartme_pico',
          });
        } catch (smartmeError) {
          console.error('[Charging Stop] Smart-me API error:', smartmeError);
          return NextResponse.json({
            error: 'Nepodarilo sa zastaviť nabíjanie cez smart-me API',
            details: smartmeError instanceof Error ? smartmeError.message : 'Unknown error',
          }, { status: 500 });
        }
      }
    }

    // 2. Fallback - simulovaná odpoveď
    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        status: 'completed',
        endTime: new Date().toISOString(),
        energyDelivered: 0,
        duration: 0,
        cost: 0,
        pricePerKwh: 0,
      },
      message: 'Nabíjanie bolo ukončené',
      source: 'simulation',
    });
  } catch (error) {
    console.error('Stop charging error:', error);
    return NextResponse.json({ error: 'Nepodarilo sa zastaviť nabíjanie' }, { status: 500 });
  }
}
