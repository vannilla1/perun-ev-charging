# 🔌 EV Nabíjačka

Slovenská mobilná/webová aplikácia pre správu a vyhľadávanie EV nabíjacích staníc, integrovaná s **eCarUp API**.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 🎯 Funkcie

### Pre vodičov (Driver App)

- **🗺️ Mapa nabíjačiek** - Interaktívna mapa s real-time dostupnosťou staníc
- **⚡ Nabíjanie** - Spustenie a monitoring nabíjania cez QR kód
- **📊 História** - Prehľad všetkých nabíjaní a štatistiky
- **👤 Profil** - Správa účtu, platobných metód a nastavení

### Technológie

- **Frontend**: Next.js 16.1 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS Variables
- **Internacionalizácia**: next-intl (slovenčina)
- **API Integration**: eCarUp Public API, OAuth 2.0
- **Mapy**: React Leaflet
- **HTTP Client**: Axios

---

## 🚀 Rýchly štart

### Predpoklady

- Node.js 20+
- npm, yarn alebo pnpm
- eCarUp API prístupové údaje ([získať tu](https://sites.google.com/smart-me.com/wiki-english/3rd-party-systems/ecarup-api))

### Inštalácia

1. **Klonujte repozitár**
```bash
git clone <repository-url>
cd ev-nabijacka
```

2. **Nainštalujte závislosti**
```bash
npm install
```

3. **Nastavte environment premenné**
```bash
cp .env.example .env.local
```

Upravte `.env.local` a vyplňte:
```env
NEXT_PUBLIC_ECARUP_CLIENT_ID=your_client_id
ECARUP_CLIENT_SECRET=your_client_secret
```

4. **Spustite development server**
```bash
npm run dev
```

5. **Otvorte v prehliadači**
```
http://localhost:3000
```

---

## 📁 Štruktúra projektu

```
ev-nabijacka/
├── src/
│   ├── app/                    # Next.js App Router stránky
│   │   ├── page.tsx           # Mapa staníc (domov)
│   │   ├── charging/          # Nabíjanie
│   │   ├── history/           # História
│   │   ├── profile/           # Profil
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Globálne štýly + CSS variables
│   ├── components/
│   │   ├── Common/            # Button, Card, Input, Loading
│   │   ├── Layout/            # AppLayout, Navigation
│   │   ├── Map/               # (pripravené)
│   │   ├── Station/           # (pripravené)
│   │   └── Charging/          # (pripravené)
│   ├── services/
│   │   └── api/
│   │       ├── config.ts      # API konfigurácia
│   │       ├── client.ts      # Axios client s interceptormi
│   │       └── authService.ts # OAuth 2.0 autentifikácia
│   ├── types/
│   │   └── index.ts           # TypeScript typy
│   ├── locales/
│   │   └── sk.json            # Slovenské preklady
│   └── i18n/
│       └── request.ts         # next-intl konfigurácia
├── public/                     # Statické súbory
├── .env.example               # Ukážka env premenných
├── .env.local                 # Lokálne env premenné (git ignore)
├── next.config.ts             # Next.js konfigurácia
├── tailwind.config.ts         # Tailwind konfigurácia
└── tsconfig.json              # TypeScript konfigurácia
```

---

## 🎨 Farebná schéma

```css
--primary: #2563EB       /* Modrá - hlavná farba */
--primary-dark: #1D4ED8  /* Tmavá modrá */
--secondary: #10B981     /* Zelená - nabíjanie, úspech */
--accent: #F59E0B        /* Oranžová - upozornenia */
--background: #F8FAFC    /* Svetlé pozadie */
--surface: #FFFFFF       /* Biele karty */
--text-primary: #1E293B  /* Tmavý text */
--text-secondary: #64748B /* Sekundárny text */
--error: #EF4444         /* Červená - chyby */
```

---

## 🔌 eCarUp API Integrácia

### Autentifikácia (OAuth 2.0)

Aplikácia používa **OAuth 2.0 Client Credentials Flow** cez smart-me identity server.

```typescript
// Získanie access tokenu
import { getAccessToken } from '@/services/api/authService';

const tokens = await getAccessToken();
// { accessToken, refreshToken, expiresIn, tokenType }
```

### API Endpointy

- **Base URL**: `https://public-api.ecarup.com`
- **Dokumentácia**: [Swagger](https://public-api.ecarup.com/swagger/index.html)
- **Wiki**: [eCarUp API Guide](https://sites.google.com/smart-me.com/wiki-english/3rd-party-systems/ecarup-api)

Príklady:
```typescript
// Získanie histórie nabíjaní
GET /v1/history/station/{stationId}

// Spustenie nabíjania
POST /v1/charging/start

// Aktuálny stav nabíjania
GET /v1/charging/sessions/{sessionId}
```

---

## 📱 Komponenty

### Základné komponenty

```tsx
import { Button, Card, Input, Loading } from '@/components/Common';

// Button
<Button variant="primary" size="md" fullWidth>
  Spustiť nabíjanie
</Button>

// Card
<Card padding="md" shadow hover>
  <CardHeader title="Nadpis" subtitle="Podnadpis" />
  <CardContent>Obsah...</CardContent>
</Card>

// Input
<Input
  label="E-mail"
  type="email"
  error="Nesprávny formát"
  icon={<EmailIcon />}
/>

// Loading
<Loading size="md" text="Načítavam..." />
```

### Navigácia

Spodná navigácia s 4 tabmi:
- 🗺️ Mapa
- ⚡ Nabíjanie
- 📊 História
- 👤 Profil

---

## 🌍 Jazyky (slovenčina, angličtina)

Aplikácia používa `next-intl`. Predvolená je slovenčina, používateľ prepína jazyk v Nastaveniach
alebo na prihlasovacej stránke; voľba sa uloží do cookie `NEXT_LOCALE`.

- Texty: `src/locales/<jazyk>/<oblasť>.json` (vzorom je `sk`), zoznam jazykov: `src/i18n/config.ts`.
- Kontrola, že všetky jazyky majú rovnaké kľúče a premenné: `npm run check:i18n`.

**Nový jazyk** (napr. nemčina `de`):
1. skopíruj `src/locales/en` do `src/locales/de` a prelož hodnoty (kľúče nemeň),
2. v `src/i18n/config.ts` pridaj `'de'` do `locales`, názov do `localeNames` a tag do `intlLocale`,
3. v `src/i18n/request.ts` pridaj loader `de: () => import('../locales/de')`,
4. `npm run check:i18n` a `npx tsc --noEmit` ohlásia všetko, čo chýba.

---

## 🛠️ Development

### Dostupné scripty

```bash
# Development server
npm run dev

# Production build
npm run build

# Spustenie production servera
npm start

# Linting
npm run lint
```

### Typescript typy

Všetky API typy sú definované v `src/types/index.ts`:
- `ChargingStation` - Nabíjacia stanica
- `ChargingSession` - Nabíjacia relácia
- `ChargingHistory` - História nabíjania
- `User` - Používateľ
- `PaymentMethod` - Platobná metóda
- a ďalšie...

---

## 📋 Roadmap (Ďalšie fázy)

### Fáza 2: Mapa a stanice ✅ (pripravené)
- [ ] Integrácia Leaflet mapy
- [ ] Zobrazenie staníc na mape s markermi
- [ ] Detail stanice s real-time stavom
- [ ] Filtrovanie (typ konektora, výkon, cena)

### Fáza 3: eCarUp API integrácia
- [x] OAuth autentifikácia (hotové)
- [ ] Načítanie staníc z API
- [ ] História nabíjaní z API
- [ ] Real-time stav staníc

### Fáza 4: Nabíjanie
- [ ] QR skener (react-native-camera)
- [ ] Spustenie/zastavenie nabíjania
- [ ] Live monitoring (WebSocket/polling)
- [ ] Push notifikácie

### Fáza 5: Profil a platby
- [ ] Registrácia/prihlásenie
- [ ] Správa platobných metód (Stripe?)
- [ ] Generovanie faktúr
- [ ] Exporty do PDF

---

## 🔐 Bezpečnosť

- **Environment premenné**: `ECARUP_CLIENT_SECRET` NIKDY nevkladajte do git!
- **API tokeny**: Ukladané v localStorage s expiráciou
- **HTTPS**: Všetky API volania cez HTTPS
- **Input validácia**: Client + server-side validácia

---

## 📄 Licencia

MIT License - voľne použiteľné pre osobné aj komerčné účely.

---

## 🤝 Podpora

- **eCarUp API Dokumentácia**: https://public-api.ecarup.com/swagger/index.html
- **eCarUp Wiki**: https://sites.google.com/smart-me.com/wiki-english/home
- **Next.js Docs**: https://nextjs.org/docs
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

## ✨ Autor

Vytvorené s pomocou **Claude Code** a Next.js 🚀

**Verzia**: 0.1.0 (Fáza 1 - Základná štruktúra)
