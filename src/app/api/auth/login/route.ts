import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPassword,
  findUserByEmail,
  createUser,
  generateToken,
  generateRefreshToken,
  formatUserForResponse,
  linkEcarupAccount,
  updateUser,
} from '@/lib/services/userService';

// Demo účty pre testovanie
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

    // 1. Demo účty (len v development móde)
    if (process.env.NODE_ENV !== 'production') {
      const demoAccount = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === normalizedEmail && acc.password === password
      );

      if (demoAccount) {
        console.log(`[Login] Demo account: ${normalizedEmail}`);
        return NextResponse.json({
          user: demoAccount.user,
          tokens: {
            accessToken: await generateToken(demoAccount.user.id),
            refreshToken: await generateRefreshToken(demoAccount.user.id),
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
        });
      }
    }

    // 2. MongoDB databáza
    try {
      const user = await verifyPassword(normalizedEmail, password);

      if (user) {
        console.log(`[Login] Success from MongoDB: ${normalizedEmail}`);
        const userId = String(user._id || user.email);

        // Aktualizujeme smartmeBasicAuth ak je eCarUp prepojený
        if (user.ecarupLinked && !user.smartmeBasicAuth) {
          const basicAuthToken = Buffer.from(`${normalizedEmail}:${password}`).toString('base64');
          updateUser(normalizedEmail, { smartmeBasicAuth: basicAuthToken }).catch(() => {});
        }

        return NextResponse.json({
          user: formatUserForResponse(user),
          tokens: {
            accessToken: await generateToken(userId),
            refreshToken: await generateRefreshToken(userId),
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
        });
      }

      // Používateľ existuje ale heslo je zlé
      const existingUser = await findUserByEmail(normalizedEmail);
      if (existingUser) {
        console.log(`[Login] User found in MongoDB but password mismatch: ${normalizedEmail}`);
        return NextResponse.json(
          { error: 'Nesprávne heslo' },
          { status: 401 }
        );
      }
      console.log(`[Login] User not found in MongoDB: ${normalizedEmail}`);
    } catch (dbError) {
      console.warn('[Login] MongoDB not available, trying eCarUp fallback:', dbError instanceof Error ? dbError.message : dbError);
    }

    // 3. Fallback: eCarUp/smart-me Basic Auth
    console.log(`[Login] Attempting eCarUp BasicAuth for: ${normalizedEmail}`);
    try {
      const ecarupUser = await tryEcarupLogin(normalizedEmail, password);

      if (ecarupUser) {
        console.log(`[Login] Success from eCarUp: ${normalizedEmail} (smart-me ID: ${ecarupUser.smartmeId})`);

        // Vytvoríme lokálny účet pre budúce prihlásenia
        try {
          const newUser = await createUser({
            email: normalizedEmail,
            password: password,
          });

          // Prepojíme s eCarUp a uložíme Basic Auth pre smart-me API
          const basicAuthToken = Buffer.from(`${normalizedEmail}:${password}`).toString('base64');
          await linkEcarupAccount(normalizedEmail, {
            customerId: ecarupUser.smartmeId,
            smartmeBasicAuth: basicAuthToken,
          });

          const userId = String(newUser._id || newUser.email);
          return NextResponse.json({
            user: formatUserForResponse(newUser),
            tokens: {
              accessToken: await generateToken(userId),
              refreshToken: await generateRefreshToken(userId),
              expiresIn: 3600,
              tokenType: 'Bearer',
            },
          });
        } catch {
          // Ak sa nepodarí uložiť do DB, stále vrátime úspech
          const userId = ecarupUser.smartmeId;
          return NextResponse.json({
            user: {
              id: userId,
              email: ecarupUser.email || normalizedEmail,
              firstName: ecarupUser.username || '',
              lastName: '',
              phone: '',
              createdAt: new Date().toISOString(),
              preferredLanguage: 'sk',
            },
            tokens: {
              accessToken: await generateToken(userId),
              refreshToken: await generateRefreshToken(userId),
              expiresIn: 3600,
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

// Pokus o prihlásenie cez eCarUp/smart-me Basic Auth API
async function tryEcarupLogin(email: string, password: string): Promise<{
  smartmeId: string;
  username: string;
  email: string;
} | null> {
  const basicAuth = Buffer.from(`${email}:${password}`).toString('base64');

  const response = await fetch('https://smart-me.com/api/User', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.log(`[eCarUp BasicAuth] Invalid credentials for: ${email}`);
    } else {
      console.error(`[eCarUp BasicAuth] Failed with status ${response.status}`);
    }
    return null;
  }

  const userData = await response.json();
  console.log(`[eCarUp BasicAuth] Success for: ${email} (ID: ${userData.idAsString || userData.id})`);

  const smartmeId = userData.idAsString || userData.id;
  if (!smartmeId) {
    console.warn(`[eCarUp BasicAuth] No user ID found in response for: ${email}`);
    return null;
  }

  return {
    smartmeId: String(smartmeId),
    username: userData.username || '',
    email: userData.email || email,
  };
}
