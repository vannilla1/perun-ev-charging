import { NextResponse } from 'next/server';

// smart-me OAuth 2.0 konfigurácia
const OAUTH_CONFIG = {
  tokenUrl: 'https://api.smart-me.com/oauth/token',
  // scope nie je potrebný pre client credentials flow podľa príkladu
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// Server-side cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function GET() {
  // Ak máme platný cached token, vrátime ho
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return NextResponse.json({
      access_token: cachedToken,
      cached: true,
    });
  }

  const clientId = process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID;
  const clientSecret = process.env.SMARTME_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'OAuth credentials not configured' },
      { status: 500 }
    );
  }

  try {
    // Client Credentials flow (bez scope podľa eCarUp príkladu)
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OAuth token error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to obtain token', details: errorText },
        { status: response.status }
      );
    }

    const data: TokenResponse = await response.json();

    // Cache token (90% of expiry time for safety margin)
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.9);

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      cached: false,
    });
  } catch (error) {
    console.error('OAuth request failed:', error);
    return NextResponse.json(
      { error: 'OAuth request failed' },
      { status: 500 }
    );
  }
}

// Endpoint pre vyčistenie cache (voliteľné)
export async function DELETE() {
  cachedToken = null;
  tokenExpiry = null;
  return NextResponse.json({ success: true });
}
