import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/lib/services/userService';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Nie ste prihlásený' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email je povinný' }, { status: 400 });
    }

    const updated = await updateUser(email, {
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
