import { NextRequest, NextResponse } from 'next/server';

// GET /api/charging/status?sessionId=xxx
// Získanie stavu nabíjacej relácie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID relácie je povinné' },
        { status: 400 }
      );
    }

    // V produkcii by sme tu:
    // 1. Získali skutočné hodnoty z OCPP MeterValues
    // 2. Alebo z eCarUp Active Charging API
    // 3. Alebo z databázy relácií

    // Pre demo generujeme realistické simulované hodnoty
    // Tieto by v produkcii pochádzali zo skutočného metering systému

    // Simulácia progresívneho nabíjania
    const sessionStart = parseInt(sessionId.split('-')[1]) || Date.now();
    const elapsedSeconds = Math.floor((Date.now() - sessionStart) / 1000);

    // Typický nabíjací profil: začína na plnom výkone, postupne klesá
    const maxPower = 22; // kW
    const chargeLevel = Math.min(elapsedSeconds / 7200, 1); // max 2 hodiny na 100%
    const currentPower = maxPower * (1 - chargeLevel * 0.3); // Klesá s úrovňou nabitia

    const energyDelivered = (elapsedSeconds / 3600) * (maxPower * 0.85); // Priemerný výkon
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
      // Dodatočné informácie
      voltage: 230 + Math.random() * 10,
      current: Math.round((currentPower * 1000) / 230),
      stateOfCharge: Math.min(Math.round(20 + chargeLevel * 80), 100), // 20% -> 100%
    });
  } catch (error) {
    console.error('Get charging status error:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa získať stav nabíjania' },
      { status: 500 }
    );
  }
}
