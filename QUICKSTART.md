# 🚀 Quick Start - EV Nabíjačka

## Prvé spustenie (5 minút)

### 1. Otvorte projekt v editore
```bash
cd ev-nabijacka
code .  # alebo váš obľúbený editor
```

### 2. Spustite development server
```bash
npm run dev
```

### 3. Otvorte v prehliadači
```
http://localhost:3000
```

✅ **Hotovo!** Aplikácia by mala bežať.

---

## Štruktúra projektu (kde čo nájdete)

```
📁 src/
  📁 app/                    👈 STRÁNKY (pridať/upraviť stránky tu)
    📄 page.tsx              - Hlavná stránka (Mapa)
    📁 charging/             - Nabíjanie
    📁 history/              - História
    📁 profile/              - Profil

  📁 components/             👈 KOMPONENTY (znovupoužiteľné UI prvky)
    📁 Common/               - Button, Card, Input, Loading
    📁 Layout/               - AppLayout, Navigation

  📁 services/               👈 API VOLANIA
    📁 api/
      📄 client.ts           - HTTP klient (axios)
      📄 authService.ts      - Prihlásenie
      📄 config.ts           - API nastavenia

  📁 types/                  👈 TYPESCRIPT TYPY
    📄 index.ts              - Všetky typy (ChargingStation, User...)

  📁 locales/                👈 PREKLADY
    📄 sk.json               - Slovenské texty
```

---

## Ako pridať novú stránku

### 1. Vytvorte priečinok v `src/app/`
```bash
mkdir src/app/nova-stranka
```

### 2. Vytvorte `page.tsx`
```tsx
// src/app/nova-stranka/page.tsx
'use client';

import { AppLayout } from '@/components/Layout';
import { Card } from '@/components/Common';

export default function NovaStranka() {
  return (
    <AppLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Nová stránka</h1>
        <Card>
          <p>Obsah...</p>
        </Card>
      </div>
    </AppLayout>
  );
}
```

### 3. Pridajte do navigácie
```tsx
// src/components/Layout/Navigation.tsx
const navItems = [
  // ... existujúce položky
  {
    name: 'Nová',
    href: '/nova-stranka',
    icon: <svg>...</svg>
  }
];
```

---

## Ako používať komponenty

### Button
```tsx
import { Button } from '@/components/Common';

<Button variant="primary" size="md" fullWidth>
  Klikni ma
</Button>

// Varianty: primary, secondary, outline, danger
// Veľkosti: sm, md, lg
```

### Card
```tsx
import { Card, CardHeader, CardContent } from '@/components/Common';

<Card shadow hover>
  <CardHeader
    title="Nadpis"
    subtitle="Podnadpis"
  />
  <CardContent>
    <p>Obsah karty...</p>
  </CardContent>
</Card>
```

### Input
```tsx
import { Input } from '@/components/Common';

<Input
  label="E-mail"
  type="email"
  placeholder="vas@email.sk"
  error="Nesprávny formát"
/>
```

### Loading
```tsx
import { Loading } from '@/components/Common';

<Loading size="md" text="Načítavam..." />
```

---

## Ako používať preklady

### 1. Pridajte text do `src/locales/sk.json`
```json
{
  "mySection": {
    "title": "Môj titulok",
    "description": "Popis..."
  }
}
```

### 2. Použite v komponente
```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('mySection');

  return <h1>{t('title')}</h1>;  // "Môj titulok"
}
```

---

## Farebná schéma (ako používať)

### V Tailwind className
```tsx
<div className="bg-[var(--primary)] text-white">
  Modrá farba
</div>

<div className="bg-[var(--secondary)]">
  Zelená farba
</div>

<div className="text-[var(--text-primary)]">
  Tmavý text
</div>
```

### Dostupné farby
- `--primary` - Modrá (#2563EB)
- `--primary-dark` - Tmavá modrá
- `--secondary` - Zelená (#10B981)
- `--accent` - Oranžová (#F59E0B)
- `--error` - Červená (#EF4444)
- `--background` - Svetlé pozadie
- `--surface` - Biele karty
- `--text-primary` - Tmavý text
- `--text-secondary` - Svetlejší text

---

## TypeScript typy (ako používať)

### Import typov
```tsx
import type {
  ChargingStation,
  ChargingSession,
  User
} from '@/types';
```

### Použitie v komponente
```tsx
interface Props {
  station: ChargingStation;
}

export default function StationCard({ station }: Props) {
  return (
    <Card>
      <h2>{station.name}</h2>
      <p>{station.address}</p>
    </Card>
  );
}
```

---

## API volania (pripravené, zatiaľ mock)

### 1. Vytvorte nový service
```typescript
// src/services/api/stationService.ts
import { apiClient } from './client';
import type { ChargingStation } from '@/types';

export async function getStations() {
  return apiClient.get<ChargingStation[]>('/v1/stations');
}
```

### 2. Použite v komponente
```tsx
'use client';

import { useEffect, useState } from 'react';
import { getStations } from '@/services/api/stationService';

export default function MapPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStations()
      .then(data => setStations(data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return <div>Zobraz stanice...</div>;
}
```

---

## Užitočné príkazy

```bash
# Spustenie dev servera
npm run dev

# Build pre produkciu
npm run build

# Spustenie production buildu
npm start

# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

---

## Časté problémy

### ❌ "Module not found"
```bash
# Reštartujte dev server
# Ctrl+C a potom:
npm run dev
```

### ❌ TypeScript chyby
```bash
# Skontrolujte importy:
import { Button } from '@/components/Common';  ✅
import { Button } from '../components/Common'; ❌
```

### ❌ Preklady nefungujú
```bash
# Skontrolujte, či je kľúč v sk.json:
const t = useTranslations('map');
t('title')  // Musí existovať "map.title" v sk.json
```

---

## Ďalšie kroky

1. **Prečítajte si README.md** - kompletná dokumentácia
2. **Pozrite FAZA_1_HOTOVO.md** - čo je hotové
3. **Začnite s Fázou 2** - mapa a API integrácia

---

## Potrebujete pomoc?

- 📚 README.md - úplná dokumentácia
- 🔌 eCarUp API: https://public-api.ecarup.com/swagger/index.html
- ⚡ Next.js docs: https://nextjs.org/docs

---

**Enjoy coding! 🚀**
