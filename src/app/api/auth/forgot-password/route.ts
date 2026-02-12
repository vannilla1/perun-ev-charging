import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/forgot-password
// Odoslanie emailu pre obnovenie hesla
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email je povinný' },
        { status: 400 }
      );
    }

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Neplatná emailová adresa' },
        { status: 400 }
      );
    }

    // smart-me.com/eCarUp používa vlastný systém pre obnovu hesla
    // Používateľ musí použiť: https://smart-me.com/Account/ForgotPassword
    //
    // Pre MVP vrátime úspešnú odpoveď a presmerujeme na smart-me
    // V produkcii by sme mohli:
    // 1. Odoslať email s linkom na smart-me reset stránku
    // 2. Implementovať vlastný user management systém

    // Simulácia odoslania emailu (v produkcii by tu bol email service)
    console.log(`Password reset requested for: ${email}`);

    // Vždy vrátime úspech (bezpečnostný pattern - neodhaľujeme či email existuje)
    return NextResponse.json({
      success: true,
      message: 'Ak existuje účet s touto emailovou adresou, poslali sme inštrukcie na obnovenie hesla.',
      // V produkcii by sme tu mali link na smart-me reset
      resetUrl: 'https://smart-me.com/Account/ForgotPassword',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    );
  }
}
