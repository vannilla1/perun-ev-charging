import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth as checkAuth } from '@/lib/services/authHelper';

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const userId = await checkAuth(authHeader);
  return !!userId;
}

/**
 * Admin gate pre zápisy: PWA nemá role systém, takže mutácie mappings chráni
 * server-side kľúč (x-admin-key == ADMIN_API_KEY env). Bez neho by hociktorý
 * prihlásený driver vedel presmerovať QR kódy na inú stanicu.
 */
async function checkAdminKey(request: NextRequest): Promise<NextResponse | null> {
  const t = await getTranslations('api');
  const configured = process.env.ADMIN_API_KEY;
  if (!configured) {
    return NextResponse.json(
      { error: t('qrMappings.adminNotConfigured') },
      { status: 503 }
    );
  }
  if (request.headers.get('x-admin-key') !== configured) {
    return NextResponse.json({ error: t('qrMappings.invalidAdminKey') }, { status: 403 });
  }
  return null;
}

// GET /api/qr-mappings - Vyhľadať podľa serial (verejné — QR scan flow beží aj
// pred loginom a serial pozná každý, kto vidí vytlačený QR kód). Výpis VŠETKÝCH
// mapovaní vyžaduje prihlásenie (full-dump bol verejný data leak).
export async function GET(request: NextRequest) {
  const t = await getTranslations('api');
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
          { error: t('qrMappings.notFound') },
          { status: 404 }
        );
      }
      return NextResponse.json(mapping);
    }

    // Full list len pre prihlásených
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 });
    }
    const mappings = await collection.find({}).toArray();
    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('QR mappings GET error:', error);
    return NextResponse.json(
      { error: t('qrMappings.loadFailed') },
      { status: 500 }
    );
  }
}

// POST /api/qr-mappings - Pridať nové mapovanie (vyžaduje auth + admin kľúč)
export async function POST(request: NextRequest) {
  const t = await getTranslations('api');
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 });
  }
  const adminError = await checkAdminKey(request);
  if (adminError) return adminError;

  try {
    const body = await request.json();
    const { serial, stationId, stationName } = body;

    if (!serial || !stationId) {
      return NextResponse.json(
        { error: t('qrMappings.serialAndStationRequired') },
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
      { error: t('qrMappings.saveFailed') },
      { status: 500 }
    );
  }
}

// DELETE /api/qr-mappings - Odstrániť mapovanie (vyžaduje auth + admin kľúč)
export async function DELETE(request: NextRequest) {
  const t = await getTranslations('api');
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 });
  }
  const adminError = await checkAdminKey(request);
  if (adminError) return adminError;

  try {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    if (!serial) {
      return NextResponse.json(
        { error: t('qrMappings.serialRequired') },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection('qr_mappings');

    const result = await collection.deleteOne({ serial });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: t('qrMappings.notFound') },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('QR mappings DELETE error:', error);
    return NextResponse.json(
      { error: t('qrMappings.deleteFailed') },
      { status: 500 }
    );
  }
}
