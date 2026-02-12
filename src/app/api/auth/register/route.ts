import { NextRequest, NextResponse } from 'next/server';
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
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    // Validácia
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email a heslo sú povinné' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Heslo musí mať aspoň 6 znakov' },
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

    // Kontrola či email už existuje
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Účet s týmto emailom už existuje' },
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
    const userId = newUser._id || newUser.email;
    const accessToken = generateToken(userId);
    const refreshToken = generateRefreshToken(userId);

    return NextResponse.json({
      user: formatUserForResponse(newUser),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
      message: 'Registrácia úspešná! Vitajte v Perun Electromobility.',
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Ak MongoDB nie je dostupné, vráťime užitočnú chybu
    if (error instanceof Error && error.message.includes('MONGODB_URI')) {
      return NextResponse.json(
        { error: 'Databáza nie je nakonfigurovaná. Kontaktujte podporu.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Interná chyba servera' },
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
