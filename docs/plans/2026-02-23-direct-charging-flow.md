# Direct Charging Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow logged-in users to start charging by clicking a station on the map and selecting a connector, without needing to scan a QR code. QR scanning remains available as alternative.

**Architecture:** Extend the existing `/charging` page and `useCharging` hook. When `stationId` query param is present, skip the idle/QR state and auto-fetch station info. Add a new `connector_select` state for connector selection cards. Auth-aware: logged-in users get direct flow, guests see choice (login or QR/guest flow).

**Tech Stack:** Next.js 15, React, TypeScript, TanStack Query, next-intl, Tailwind CSS v4

---

## Task 1: New API endpoint — Return ALL connectors for a station

The current `/api/charging/info` returns only ONE connector. We need all connectors so the user can choose.

**Files:**
- Create: `src/app/api/charging/station-connectors/route.ts`

**Step 1: Create the API route**

```typescript
// src/app/api/charging/station-connectors/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const clientId = process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID;
  const clientSecret = process.env.SMARTME_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

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
    if (!response.ok) return null;
    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.9);
    return cachedToken;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('stationId');

  if (!stationId) {
    return NextResponse.json({ error: 'stationId je povinný' }, { status: 400 });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }

  try {
    const res = await fetch(`${ECARUP_API_BASE}/v1/station/${stationId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Stanica nenájdená' }, { status: 404 });
    }

    const data = await res.json();
    const connectors = (data.connectors || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      number: c.number as number,
      name: (c.name as string) || '',
      plugType: ((c.plugtype as string) || '').replace('PLUG_TYPE_', '') || 'Type 2',
      maxPower: c.maxpower ? (c.maxpower as number) / 1000 : null,
      state: (c.state as string) || 'UNKNOWN',
    }));

    return NextResponse.json({
      stationId,
      name: data.name || '',
      address: [data.street, data.city].filter(Boolean).join(', '),
      connectors,
    });
  } catch (error) {
    console.error('Station connectors error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

**Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add src/app/api/charging/station-connectors/route.ts
git commit -m "feat: add station-connectors API endpoint returning all connectors"
```

---

## Task 2: Extend `useCharging` hook — add `connector_select` state and `loadStation` method

**Files:**
- Modify: `src/hooks/useCharging.ts`

**Step 1: Add new state and method to the hook**

Changes to `useCharging.ts`:

1. Add `'connector_select'` to `ChargingState` union type (line ~16):
```typescript
export type ChargingState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connector_select'  // NEW — user picks a connector
  | 'station_info'
  // ... rest stays same
```

2. Add `ConnectorInfo` interface and `selectedConnectors` state after `StationInfo` interface (line ~47):
```typescript
interface ConnectorOption {
  id: string;
  number: number;
  name: string;
  plugType: string;
  maxPower: number | null;
  state: string;
}

interface StationOverview {
  stationId: string;
  name: string;
  address: string;
  connectors: ConnectorOption[];
}
```

3. Add to `UseChargingResult` interface (line ~55):
```typescript
  stationOverview: StationOverview | null;
  loadStation: (stationId: string) => void;
  selectConnector: (connector: ConnectorOption) => void;
```

4. Inside `useCharging()` function, add new state (after line ~93):
```typescript
  const [stationOverview, setStationOverview] = useState<StationOverview | null>(null);
```

5. Add new mutation for fetching connectors (after `stationInfoMutation`, around line ~123):
```typescript
  // Mutation pre načítanie konektorov stanice (priamy flow z mapy)
  const stationConnectorsMutation = useMutation({
    mutationFn: async (stationId: string) => {
      const res = await fetch(`/api/charging/station-connectors?stationId=${stationId}`);
      if (!res.ok) throw new Error('Nepodarilo sa načítať konektory');
      return res.json();
    },
    onSuccess: (data) => {
      setStationOverview({
        stationId: data.stationId,
        name: data.name,
        address: data.address,
        connectors: data.connectors,
      });
      setState('connector_select');
      setError(null);
    },
    onError: (err) => {
      setState('error');
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať stanicu');
    },
  });
```

6. Add `loadStation` and `selectConnector` callbacks (after `handleManualCode`, around line ~342):
```typescript
  // Priame načítanie stanice z mapy (bez QR)
  const loadStation = useCallback((stationId: string) => {
    setState('connecting');
    stationConnectorsMutation.mutate(stationId);
  }, [stationConnectorsMutation]);

  // Výber konektora — potom načíta detail cez existujúci info endpoint
  const selectConnector = useCallback((connector: ConnectorOption) => {
    if (!stationOverview) return;
    setState('connecting');
    stationInfoMutation.mutate({
      stationId: stationOverview.stationId,
      connectorId: connector.id,
    });
  }, [stationOverview, stationInfoMutation]);
```

7. Add to reset function (line ~397):
```typescript
  const reset = useCallback(() => {
    setState('idle');
    setSessionId(null);
    setStationInfo(null);
    setStationOverview(null);  // NEW
    setError(null);
    setIsGuest(false);
    setGuestPaymentInfo(null);
    setStats({ power: 0, energy: 0, duration: 0, cost: 0 });
  }, []);
```

8. Add to return object (line ~407):
```typescript
    stationOverview,   // NEW
    loadStation,       // NEW
    selectConnector,   // NEW
```

**Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/useCharging.ts
git commit -m "feat: add connector_select state and loadStation/selectConnector to useCharging"
```

---

## Task 3: Update `/charging` page — auto-load station from URL, connector selection UI, auth-aware flow

**Files:**
- Modify: `src/app/charging/page.tsx`

**Step 1: Import useAuth and read stationId from URL**

At top of `ChargingPage` component (line ~35), add:
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
```

Inside component:
```typescript
  const { isLoggedIn } = useAuth();
  const searchParams = useSearchParams();
```

**Step 2: Auto-load station from URL on mount**

Add useEffect after existing hooks (line ~75):
```typescript
  // Ak prišiel stationId z mapy, automaticky načítať stanicu
  useEffect(() => {
    const stationId = searchParams.get('stationId');
    if (stationId && state === 'idle') {
      loadStation(stationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Also destructure `loadStation`, `selectConnector`, `stationOverview` from `useCharging()`.

**Step 3: Add connector selection renderer**

Add new render function `renderConnectorSelectState()` after `renderConnectingState` (~line 229):

```tsx
  const renderConnectorSelectState = () => (
    <div className="p-4 sm:p-6 pt-6 sm:pt-8">
      {/* Názov stanice */}
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center">
          <PlugIcon />
        </div>
      </div>
      <h2 className="text-xl font-bold text-center text-[var(--text-primary)] mb-1">
        {stationOverview?.name || 'Nabíjacia stanica'}
      </h2>
      {stationOverview?.address && (
        <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
          {stationOverview.address}
        </p>
      )}

      {/* Výber konektora */}
      <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
        Vyberte konektor:
      </p>
      <div className="space-y-3 mb-6">
        {stationOverview?.connectors.map((connector) => {
          const isAvailable = connector.state === 'AVAILABLE';
          return (
            <button
              key={connector.id}
              onClick={() => isAvailable && selectConnector(connector)}
              disabled={!isAvailable}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                isAvailable
                  ? 'border-[var(--primary)] bg-[var(--surface-card)] hover:bg-[rgba(0,212,255,0.08)] cursor-pointer'
                  : 'border-[var(--border)] bg-[var(--surface-card)] opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div className={`w-3 h-3 rounded-full ${
                    isAvailable ? 'bg-[var(--secondary)]' : 'bg-[var(--text-muted)]'
                  }`} />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {connector.name || `Konektor ${connector.number}`}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {connector.plugType} • {connector.maxPower ? `${connector.maxPower} kW` : '—'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  isAvailable
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-gray-700/30 text-gray-400'
                }`}>
                  {isAvailable ? 'Dostupný' : connector.state === 'OCCUPIED' ? 'Obsadený' : 'Nedostupný'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* QR alternatíva + Zrušiť */}
      <div className="space-y-2">
        <Button
          onClick={() => { reset(); setStationCode(''); }}
          variant="outline"
          fullWidth
          size="sm"
        >
          Skenovať QR kód
        </Button>
        <Button onClick={handleNewSession} variant="ghost" fullWidth size="sm">
          Zrušiť
        </Button>
      </div>
    </div>
  );
```

**Step 4: Update station_info state for auth-aware buttons**

Replace the buttons in `renderStationInfoState()` (lines ~308-328). Instead of hardcoded "Guest" / "Mám účet" buttons, show auth-aware options:

```tsx
      {/* Tlačidlá — závisí od prihlásenia */}
      <div className="space-y-3">
        {isLoggedIn ? (
          <>
            <Button
              onClick={confirmStartCharging}
              fullWidth
              size="lg"
              disabled={stationInfo?.status !== 'AVAILABLE'}
            >
              Spustiť nabíjanie
            </Button>
            <Button onClick={handleNewSession} variant="ghost" fullWidth>
              Zrušiť
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={initiateGuestPayment}
              fullWidth
              size="lg"
              disabled={stationInfo?.status !== 'AVAILABLE'}
            >
              Nabíjať bez registrácie
            </Button>
            <Button
              onClick={() => { window.location.href = '/login?redirect=/charging'; }}
              variant="outline"
              fullWidth
              disabled={stationInfo?.status !== 'AVAILABLE'}
            >
              Prihlásiť sa
            </Button>
            <Button onClick={handleNewSession} variant="ghost" fullWidth>
              Zrušiť
            </Button>
          </>
        )}
      </div>
```

**Step 5: Add connector_select to page render and title**

In JSX return (~line 640), add:
```tsx
{state === 'connector_select' && renderConnectorSelectState()}
```

In `getPageTitle()` (~line 615), add case:
```typescript
case 'connector_select':
  return 'Výber konektora';
```

**Step 6: Verify build passes**

Run: `npx next build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/app/charging/page.tsx
git commit -m "feat: connector selection UI and auth-aware charging flow"
```

---

## Task 4: Use real prices from stations cache in charging/info API

The `charging/info` API hardcodes 0.44 EUR/kWh. Use the price from the stations cache instead.

**Files:**
- Modify: `src/app/api/charging/info/route.ts`

**Step 1: Fetch pricing from stations API**

Replace the hardcoded pricing section (lines 180-185) with a fetch from the stations cache:

```typescript
    // Cena — získať z hlavného stations cache
    let pricePerKwh = 0.40;  // fallback
    let pricePerH = 0;
    try {
      const stationsRes = await fetch(
        `${request.nextUrl.origin}/api/ecarup/stations`,
        { cache: 'no-store' }
      );
      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        const matchedStation = stationsData.stations?.find(
          (s: Record<string, unknown>) => s.id === resolvedStationId
        );
        if (matchedStation?.connectors?.[0]) {
          const c = matchedStation.connectors[0];
          if (c.pricePerKwh != null) pricePerKwh = c.pricePerKwh;
          if (c.pricePerH != null) pricePerH = c.pricePerH;
        }
      }
    } catch {
      // Use fallback price
    }
```

Then update the response to use these variables:
```typescript
    pricing: {
      pricePerKwh,
      pricePerHour: pricePerH,
      currency: 'EUR',
    },
```

**Step 2: Verify build passes**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/app/api/charging/info/route.ts
git commit -m "fix: use real station prices instead of hardcoded 0.44€"
```

---

## Task 5: Final build, test on Render, push

**Step 1: Full build**

Run: `npx next build`
Expected: Clean build, no errors

**Step 2: Push all commits**

```bash
git push origin main
```

**Step 3: Test on Render**

Wait for deploy, then verify:
1. Open app → Click station → "Nabíjať" → `/charging?stationId=X` → Connector cards shown
2. Select available connector → Station info with price → "Spustiť nabíjanie" (logged in) or login/guest options
3. From `/charging` without stationId → QR scanner shown as before
4. "Skenovať QR kód" button in connector selection → returns to QR flow

---

## Summary of all changes

| File | Change |
|------|--------|
| `src/app/api/charging/station-connectors/route.ts` | **NEW** — Returns all connectors for a station |
| `src/hooks/useCharging.ts` | Add `connector_select` state, `loadStation()`, `selectConnector()`, `stationOverview` |
| `src/app/charging/page.tsx` | Auto-load from URL param, connector card UI, auth-aware buttons |
| `src/app/api/charging/info/route.ts` | Replace hardcoded 0.44€ with real prices from stations cache |
