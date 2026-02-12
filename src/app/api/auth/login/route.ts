import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPassword,
  findUserByEmail,
  createUser,
  generateToken,
  generateRefreshToken,
  formatUserForResponse,
  linkEcarupAccount,
  hashPassword,
} from '@/lib/services/userService';

// Demo účty pre testovanie (vždy dostupné)
const DEMO_ACCOUNTS = [
  {
    email: 'demo@perun.sk',
    password: 'demo123',
    user: {
      id: 'demo-user-001',
      email: 'demo@perun.sk',
      firstName: 'Demo',
      lastName: 'Používateľ',
      phone: '+421 900 000 000',
      createdAt: '2024-01-01T00:00:00.000Z',
      preferredLanguage: 'sk',
    },
  },
  {
    email: 'test@perun.sk',
    password: 'test123',
    user: {
      id: 'test-user-001',
      email: 'test@perun.sk',
      firstName: 'Test',
      lastName: 'Account',
      phone: '+421 900 111 111',
      createdAt: '2024-01-01T00:00:00.000Z',
      preferredLanguage: 'sk',
    },
  },
];

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email a heslo sú povinné' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kontrola demo účtov (pre testovanie)
    const demoAccount = DEMO_ACCOUNTS.find(
      (acc) => acc.email.toLowerCase() === normalizedEmail && acc.password === password
    );

    if (demoAccount) {
      console.log(`[Login] Demo account: ${normalizedEmail}`);
      return NextResponse.json({
        user: demoAccount.user,
        tokens: {
          accessToken: generateToken(demoAccount.user.id),
          refreshToken: generateRefreshToken(demoAccount.user.id),
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });
    }

    // 2. Kontrola MongoDB databázy
    try {
      const user = await verifyPassword(normalizedEmail, password);

      if (user) {
        console.log(`[Login] Success from MongoDB: ${normalizedEmail}`);
        const userId = user._id || user.email;

        return NextResponse.json({
          user: formatUserForResponse(user),
          tokens: {
            accessToken: generateToken(userId),
            refreshToken: generateRefreshToken(userId),
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
        });
      }

      // Používateľ existuje ale heslo je zlé
      const existingUser = await findUserByEmail(normalizedEmail);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Nesprávne heslo' },
          { status: 401 }
        );
      }
    } catch (dbError) {
      console.warn('[Login] MongoDB not available, trying eCarUp fallback');
    }

    // 3. Fallback: eCarUp/smart-me API
    try {
      const ecarupResult = await tryEcarupLogin(normalizedEmail, password);

      if (ecarupResult) {
        console.log(`[Login] Success from eCarUp: ${normalizedEmail}`);

        // Vytvoríme lokálny účet pre budúce prihlásenia
        try {
          const newUser = await createUser({
            email: normalizedEmail,
            password: password,
          });

          // Prepojíme s eCarUp
          await linkEcarupAccount(normalizedEmail, {
            customerId: ecarupResult.customerId,
            accessToken: ecarupResult.accessToken,
            refreshToken: ecarupResult.refreshToken,
          });

          return NextResponse.json({
            user: formatUserForResponse(newUser),
            tokens: {
              accessToken: ecarupResult.accessToken,
              refreshToken: ecarupResult.refreshToken,
              expiresIn: ecarupResult.expiresIn,
              tokenType: 'Bearer',
            },
          });
        } catch {
          // Ak sa nepodarí uložiť do DB, stále vrátime úspech
          return NextResponse.json({
            user: {
              id: ecarupResult.customerId,
              email: normalizedEmail,
              firstName: '',
              lastName: '',
              phone: '',
              createdAt: new Date().toISOString(),
              preferredLanguage: 'sk',
            },
            tokens: {
              accessToken: ecarupResult.accessToken,
              refreshToken: ecarupResult.refreshToken,
              expiresIn: ecarupResult.expiresIn,
              tokenType: 'Bearer',
            },
          });
        }
      }
    } catch (ecarupError) {
      console.warn('[Login] eCarUp login failed:', ecarupError);
    }

    // Neúspešné prihlásenie
    return NextResponse.json(
      { error: 'Nesprávny email alebo heslo' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    );
  }
}

// Pokus o prihlásenie cez eCarUp/smart-me API
async function tryEcarupLogin(email: string, password: string) {
  const oauthUrl = process.env.NEXT_PUBLIC_OAUTH_URL || 'https://smart-me.com/oauth/token';
  const clientId = process.env.NEXT_PUBLIC_ECARUP_CLIENT_ID || '';
  const clientSecret = process.env.SMARTME_CLIENT_SECRET || process.env.ECARUP_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    return null;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', email);
  params.append('password', password);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'ecarup offline_access');

  const response = await fetch(oauthUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    return null;
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    customerId: tokenData.user_id || email,
  };
}
