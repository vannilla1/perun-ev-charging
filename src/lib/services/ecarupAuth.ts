/**
 * Shared eCarUp/smart-me OAuth token utility
 * Centralizovaný prístup k OAuth tokenu pre eCarUp API
 */

const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';
export const ECARUP_API_BASE = 'https://public-api.ecarup.com';

// Cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Získa OAuth access token pre eCarUp API (client_credentials flow)
 * Token je cachovaný s 5-minútovým bufferom pred expiráciou
 */
export async function getEcarupAccessToken(): Promise<string | null> {
  // Vrátiť cached token ak je ešte platný
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Priorita: pôvodné NEXT_PUBLIC_* premenné prvé (známe-funkčné),
  // potom nové SMARTME_CLIENT_ID (len ak prvé chýbajú)
  const clientId =
    process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID ||
    process.env.NEXT_PUBLIC_ECARUP_CLIENT_ID ||
    process.env.SMARTME_CLIENT_ID;
  const clientSecret =
    process.env.SMARTME_CLIENT_SECRET || process.env.ECARUP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[eCarUp Auth] Missing credentials:', {
      hasSmartmeClientId: !!process.env.SMARTME_CLIENT_ID,
      hasNextPublicSmartmeClientId: !!process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID,
      hasNextPublicEcarupClientId: !!process.env.NEXT_PUBLIC_ECARUP_CLIENT_ID,
      hasSmartmeClientSecret: !!process.env.SMARTME_CLIENT_SECRET,
      hasEcarupClientSecret: !!process.env.ECARUP_CLIENT_SECRET,
    });
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[eCarUp Auth] Token request failed: ${response.status} ${errorBody}`);
      return null;
    }

    const data = await response.json();
    cachedToken = data.access_token;
    // Cache s 5-minútovým bufferom pred expiráciou
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    console.log('[eCarUp Auth] Successfully fetched token, expires in:', data.expires_in);
    return cachedToken;
  } catch (error) {
    console.error('[eCarUp Auth] Token request error:', error);
    return null;
  }
}

/**
 * Resetuje cached token (napr. po 401 odpovedi)
 */
export function resetEcarupToken(): void {
  cachedToken = null;
  tokenExpiry = null;
}
