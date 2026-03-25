import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, updateUser } from '@/lib/services/userService';
import { getDb, COLLECTIONS, UserDocument } from '@/lib/mongodb';

async function findUserEmailByUserId(userId: string): Promise<string | null> {
  // userId môže byť email, MongoDB _id, alebo smartmeId
  if (userId.includes('@')) return userId;

  try {
    const db = await getDb();
    const user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
      $or: [
        { _id: userId as unknown as UserDocument['_id'] },
        { ecarupCustomerId: userId },
      ],
    });
    return user?.email || null;
  } catch {
    return null;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Nie ste prihlásený' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    let payload: { userId: string };
    try {
      payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.json({ error: 'Neplatný token' }, { status: 401 });
    }

    // Nájsť email používateľa z userId
    const email = await findUserEmailByUserId(payload.userId);
    if (!email) {
      return NextResponse.json({ error: 'Používateľ nebol nájdený' }, { status: 404 });
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    const updated = await updateUser(email, {
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      phone: phone?.trim() || '',
    });

    if (!updated) {
      return NextResponse.json({ error: 'Nepodarilo sa aktualizovať profil' }, { status: 500 });
    }

    // Aktualizovať aj localStorage na klientovi
    return NextResponse.json({
      success: true,
      user: { firstName: firstName?.trim(), lastName: lastName?.trim(), phone: phone?.trim() },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 });
  }
}
