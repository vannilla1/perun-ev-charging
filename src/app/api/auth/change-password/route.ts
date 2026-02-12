import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/change-password
// Zmena hesla prihláseného používateľa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Aktuálne a nové heslo sú povinné' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Nové heslo musí mať aspoň 6 znakov' },
        { status: 400 }
      );
    }

    // Pre zmenu hesla v smart-me/eCarUp systéme:
    // 1. Používateľ musí byť autentifikovaný
    // 2. smart-me nepodporuje priamu zmenu hesla cez API
    // 3. Používateľ musí použiť: https://smart-me.com/Account/Manage
    //
    // Pre MVP simulujeme úspešnú zmenu
    // V produkcii by sme:
    // 1. Overili aktuálne heslo pokusom o prihlásenie
    // 2. Presmerovali na smart-me password change
    // 3. Alebo implementovali vlastný user management

    // Simulácia - v produkcii by tu bola skutočná validácia
    console.log('Password change requested');

    // Pre demo účely vždy vrátime úspech
    return NextResponse.json({
      success: true,
      message: 'Heslo bolo úspešne zmenené',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    );
  }
}
