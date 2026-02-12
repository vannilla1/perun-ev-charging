// Client-side cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;
let demoModeDetected: boolean | null = null;

// Kontrola či sme v demo móde - detekujeme podľa odpovede servera
export function isDemoMode(): boolean {
  // Ak sme už zistili demo mode, vrátime to
  if (demoModeDetected !== null) {
    return demoModeDetected;
  }

  // Defaultne nie sme v demo mode - skúsime získať token
  return false;
}

// Získanie access tokenu cez server-side API route
export async function getAccessToken(): Promise<string | null> {
  // Ak máme platný cached token, vrátime ho
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Ak sme už zistili že sme v demo mode, nevraciame token
  if (demoModeDetected === true) {
    return null;
  }

  try {
    // Volanie server-side API route
    const response = await fetch('/api/auth/token');

    if (!response.ok) {
      const error = await response.json();
      console.error('OAuth: Failed to get token:', error);

      // Ak server vráti 500 s "credentials not configured", sme v demo mode
      if (error.error === 'OAuth credentials not configured') {
        demoModeDetected = true;
      }
      return null;
    }

    const data = await response.json();

    // Máme platný token - nie sme v demo mode
    demoModeDetected = false;

    // Cache token na klientovi
    cachedToken = data.access_token;
    // Ak server vrátil expires_in, použijeme ho, inak 1 hodina default
    const expiresIn = data.expires_in || 3600;
    tokenExpiry = Date.now() + (expiresIn * 1000 * 0.9);

    console.log('OAuth: Successfully obtained access token');
    return cachedToken;
  } catch (error) {
    console.error('OAuth: Request failed:', error);
    cachedToken = null;
    tokenExpiry = null;
    return null;
  }
}

// Vyčistenie cache
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = null;
  demoModeDetected = null;
}
