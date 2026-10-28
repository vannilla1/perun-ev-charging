import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';

// POST /api/auth/forgot-password
// Odoslanie emailu pre obnovenie hesla
export async function POST(request: NextRequest) {
  const t = await getTranslations('api');
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: t('common.emailRequired') },
        { status: 400 }
      );
    }

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: t('common.invalidEmail') },
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
      message: t('auth.resetInstructionsSent'),
      // V produkcii by sme tu mali link na smart-me reset
      resetUrl: 'https://smart-me.com/Account/ForgotPassword',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: t('common.internalError') },
      { status: 500 }
    );
  }
}
