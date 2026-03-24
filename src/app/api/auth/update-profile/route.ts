import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/lib/services/userService';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Nie ste prihlásený' }, { status: 401 });
    }

    // Decode JWT to get userId/email
    const token = authHeader.replace('Bearer ', '');
    let payload: { userId: string };
    try {
      payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.json({ error: 'Neplatný token' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    const updated = await updateUser(payload.userId, {
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      phone: phone?.trim() || '',
    });

    if (!updated) {
      return NextResponse.json({ error: 'Nepodarilo sa aktualizovať profil' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 });
  }
}
