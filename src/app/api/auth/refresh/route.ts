import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/refresh
// Obnovenie access tokenu pomocou refresh tokenu
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token je povinný' },
        { status: 400 }
      );
    }

    const oauthUrl = process.env.NEXT_PUBLIC_OAUTH_URL || 'https://smart-me.com/oauth/token';
    const clientId = process.env.NEXT_PUBLIC_ECARUP_CLIENT_ID || '';
    const clientSecret = process.env.ECARUP_CLIENT_SECRET || '';

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const tokenResponse = await fetch(oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: 'Token expiroval, prihláste sa znova' },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      tokens: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    );
  }
}
