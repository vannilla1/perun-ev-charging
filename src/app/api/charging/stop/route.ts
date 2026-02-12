import { NextRequest, NextResponse } from 'next/server';

// POST /api/charging/stop
// Zastavenie nabíjania
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID relácie je povinné' },
        { status: 400 }
      );
    }

    // Pre zastavenie nabíjania je potrebný OCPP protokol
    // eCarUp Public API nepodporuje priame zastavenie cez REST
    //
    // V produkcii by tu bola:
    // 1. OCPP RemoteStopTransaction príkaz
    // 2. Komunikácia s charge point management systémom

    // Pre demo/MVP vrátime simulovanú odpoveď
    const endTime = new Date().toISOString();

    // Simulované hodnoty relácie
    const energyDelivered = 15 + Math.random() * 20; // 15-35 kWh
    const duration = 30 + Math.floor(Math.random() * 90); // 30-120 minút
    const pricePerKwh = 0.35;
    const cost = Math.round(energyDelivered * pricePerKwh * 100) / 100;

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        status: 'completed',
        endTime,
        energyDelivered: Math.round(energyDelivered * 100) / 100,
        duration: duration * 60, // v sekundách
        cost,
        pricePerKwh,
      },
      message: 'Nabíjanie bolo úspešne ukončené',
    });
  } catch (error) {
    console.error('Stop charging error:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa zastaviť nabíjanie' },
      { status: 500 }
    );
  }
}
