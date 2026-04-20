import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { updateUser } from '@/lib/services/userService';
import { decodeToken } from '@/lib/services/authHelper';
import { getDb, COLLECTIONS, UserDocument } from '@/lib/mongodb';

/**
 * Nájde email používateľa podľa userId z tokenu
 */
async function findUserEmailByToken(userId: string): Promise<string | null> {
  try {
    const db = await getDb();
    const orConditions: Record<string, unknown>[] = [
      { email: userId },
      { ecarupCustomerId: userId },
    ];
    try {
      if (ObjectId.isValid(userId)) {
        orConditions.unshift({ _id: new ObjectId(userId) });
      }
    } catch {
      // Nie je platné ObjectId
    }

    const user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne(
      { $or: orConditions },
      { projection: { email: 1 } }
    );
    return user?.email || null;
  } catch (error) {
    console.error('[UpdateProfile] DB lookup error:', error);
    return null;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Nie ste prihlásený' }, { status: 401 });
    }

    // Dekódujeme token a získame userId
    const token = authHeader.replace('Bearer ', '');
    const payload = await decodeToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Neplatný token' }, { status: 401 });
    }

    // Nájdeme email z DB podľa userId z tokenu (nie z request body!)
    const userEmail = await findUserEmailByToken(payload.userId);
    if (!userEmail) {
      return NextResponse.json({ error: 'Používateľ nebol nájdený' }, { status: 404 });
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    const updated = await updateUser(userEmail, {
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      phone: phone?.trim() || '',
    });

    if (!updated) {
      return NextResponse.json({ error: 'Nepodarilo sa aktualizovať profil' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: { firstName: firstName?.trim(), lastName: lastName?.trim(), phone: phone?.trim() },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 });
  }
}
