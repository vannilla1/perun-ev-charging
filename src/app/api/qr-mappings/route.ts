import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth as checkAuth } from '@/lib/services/authHelper';

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const userId = await checkAuth(authHeader);
  return !!userId;
}

// GET /api/qr-mappings - Získať všetky mapovania alebo vyhľadať podľa serial
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    const db = await getDb();
    const collection = db.collection('qr_mappings');

    if (serial) {
      // Vyhľadať konkrétne mapovanie
      const mapping = await collection.findOne({ serial });
      if (!mapping) {
        return NextResponse.json(
          { error: 'Mapovanie nenájdené' },
          { status: 404 }
        );
      }
      return NextResponse.json(mapping);
    }

    // Získať všetky mapovania
    const mappings = await collection.find({}).toArray();
    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('QR mappings GET error:', error);
    return NextResponse.json(
      { error: 'Chyba pri načítaní mapovaní' },
      { status: 500 }
    );
  }
}

// POST /api/qr-mappings - Pridať nové mapovanie (vyžaduje auth)
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Nie ste prihlásený' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { serial, stationId, stationName } = body;

    if (!serial || !stationId) {
      return NextResponse.json(
        { error: 'Serial a stationId sú povinné' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection('qr_mappings');

    // Skontrolovať či už existuje
    const existing = await collection.findOne({ serial });
    if (existing) {
      // Aktualizovať existujúce
      await collection.updateOne(
        { serial },
        { $set: { stationId, stationName, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true, updated: true });
    }

    // Vytvoriť nové
    await collection.insertOne({
      serial,
      stationId,
      stationName,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, created: true });
  } catch (error) {
    console.error('QR mappings POST error:', error);
    return NextResponse.json(
      { error: 'Chyba pri ukladaní mapovania' },
      { status: 500 }
    );
  }
}

// DELETE /api/qr-mappings - Odstrániť mapovanie (vyžaduje auth)
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Nie ste prihlásený' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    if (!serial) {
      return NextResponse.json(
        { error: 'Serial je povinný' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection('qr_mappings');

    const result = await collection.deleteOne({ serial });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Mapovanie nenájdené' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('QR mappings DELETE error:', error);
    return NextResponse.json(
      { error: 'Chyba pri odstraňovaní mapovania' },
      { status: 500 }
    );
  }
}
