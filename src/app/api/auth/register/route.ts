import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import {
  findUserByEmail,
  createUser,
  generateToken,
  generateRefreshToken,
  formatUserForResponse,
  getUserCount,
} from '@/lib/services/userService';

// POST /api/auth/register
export async function POST(request: NextRequest) {
  const t = await getTranslations('api');
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    // Validácia
    if (!email || !password) {
      return NextResponse.json(
        { error: t('auth.credentialsRequired') },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: t('auth.passwordTooShort', { min: 6 }) },
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

    // Kontrola či email už existuje
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: t('auth.accountExists') },
        { status: 409 }
      );
    }

    // Vytvorenie používateľa v MongoDB
    const newUser = await createUser({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    const userCount = await getUserCount();
    console.log(`[Register] New user created: ${email} (Total users: ${userCount})`);

    // V pozadí: Pokus o prepojenie s eCarUp
    tryLinkEcarup(newUser.email).catch((err) => {
      console.warn('[eCarUp] Background linking failed:', err);
    });

    // Vytvorenie tokenov
    const userId = String(newUser._id || newUser.email);
    const accessToken = await generateToken(userId);
    const refreshToken = await generateRefreshToken(userId);

    return NextResponse.json({
      user: formatUserForResponse(newUser),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      message: t('auth.registered'),
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Ak MongoDB nie je dostupné, vráťime užitočnú chybu
    if (error instanceof Error && error.message.includes('MONGODB_URI')) {
      return NextResponse.json(
        { error: t('auth.databaseNotConfigured') },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: t('common.internalError') },
      { status: 500 }
    );
  }
}

// Asynchrónne prepojenie s eCarUp
async function tryLinkEcarup(email: string): Promise<void> {
  console.log(`[eCarUp] Background linking for: ${email}`);

  // TODO: Implementovať skutočné prepojenie
  // Pre teraz len logujeme - prepojenie nastane pri prvom nabíjaní

  const clientId = process.env.NEXT_PUBLIC_ECARUP_CLIENT_ID;
  if (!clientId) {
    console.log('[eCarUp] Not configured, will link on first charge');
    return;
  }

  console.log(`[eCarUp] Account will be linked on first charging session`);
}
