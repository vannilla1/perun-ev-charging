# 🚀 Lokálne testovanie aplikácie EV Nabíjačka

Tento návod vás prevedie spustením aplikácie na vašom počítači.

## ✅ Príprava dokončená

Projekt je **pripravený na spustenie**. Vyčistil som:
- ✅ Odstránené duplicitné súbory
- ✅ Nakonfigurované `.env.local` pre testovanie
- ✅ Závislosti už nainštalované
- ✅ Development server otestovaný

---

## 🎯 Rýchle spustenie (3 kroky)

### 1. Otvorte terminál v priečinku projektu

```bash
cd /Users/martinkosco/Desktop/eperun-charging-app/ev-nabijacka
```

### 2. Spustite development server

```bash
npm run dev
```

### 3. Otvorte v prehliadači

```
http://localhost:3000
```

**Hotovo!** 🎉 Aplikácia by mala bežať.

---

## 📱 Čo môžete testovať

Po spustení máte k dispozícii 4 stránky:

### 1. **Mapa nabíjačiek** (hlavná stránka)
- URL: `http://localhost:3000/`
- Zobrazuje mock data 3 staníc v blízkosti
- Vyhľadávanie (zatiaľ nefunkčné)
- Filter tlačidlo (UI only)

### 2. **Nabíjanie**
- URL: `http://localhost:3000/charging`
- Stránka pre spustenie nabíjania
- QR scanner placeholder
- Mock UI komponenty

### 3. **História**
- URL: `http://localhost:3000/history`
- História nabíjaní
- Štatistiky a prehľady

### 4. **Profil**
- URL: `http://localhost:3000/profile`
- Používateľský profil
- Nastavenia účtu

### ⬇️ Spodná navigácia
- Funguje na všetkých stránkach
- Prepínanie medzi sekciami
- Moderný floating dizajn s animáciami

---

## 🔧 Užitočné príkazy

### Spustenie dev servera
```bash
npm run dev
```

### Zastavenie servera
Stlačte `Ctrl + C` v termináli

### Build pre produkciu (zopár minút)
```bash
npm run build
```

### Spustenie production buildu
```bash
npm run build
npm start
```

### Kontrola kódu (ESLint)
```bash
npm run lint
```

### Vyčistenie cache
```bash
rm -rf .next
npm run dev
```

---

## 🌐 Zmena portu (ak je 3000 obsadený)

Ak máte na porte 3000 už niečo spustené:

```bash
PORT=3001 npm run dev
```

Potom otvorte: `http://localhost:3001`

---

## 🔍 Riešenie problémov

### ❌ "Port 3000 is already in use"

**Riešenie:**
```bash
# Zabiť proces na porte 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Alebo použite iný port
PORT=3001 npm run dev
```

### ❌ "Module not found"

**Riešenie:**
```bash
# Preinštalovať závislosti
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### ❌ Aplikácia sa nespúšťa

**Riešenie:**
```bash
# Vyčistiť Next.js cache
rm -rf .next
npm run dev
```

### ❌ "EADDRINUSE" alebo port errors

**Riešenie:**
```bash
# Zabiť všetky Node procesy
pkill -f node

# Alebo reštartujte terminál a skúste znova
npm run dev
```

---

## 📋 Súbory a konfigurácia

### `.env.local` (už nakonfigurované)
```env
NEXT_PUBLIC_ECARUP_CLIENT_ID=demo_client_id
ECARUP_CLIENT_SECRET=demo_client_secret
NODE_ENV=development
```

Pre **testovanie bez API** môžete ponechať tieto hodnoty.

### Pre **reálne API volania** získajte credentials:
1. Prejdite na: https://sites.google.com/smart-me.com/wiki-english/3rd-party-systems/ecarup-api
2. Zaregistrujte sa a získajte API credentials
3. Vložte do `.env.local`:
```env
NEXT_PUBLIC_ECARUP_CLIENT_ID=your_real_client_id
ECARUP_CLIENT_SECRET=your_real_client_secret
```

---

## 🎨 Technológie v projekte

- **Framework**: Next.js 16.1 (App Router)
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS Variables
- **API**: Axios, OAuth 2.0
- **Mapy**: React Leaflet (pripravené)
- **Preklady**: next-intl (slovenčina)

---

## 📱 Testovanie na mobile

### Spustenie na lokálnej sieti

1. Zistite IP adresu vašeho počítača:
```bash
# macOS
ipconfig getifaddr en0

# alebo
ifconfig | grep "inet " | grep -v 127.0.0.1
```

2. Spustite server:
```bash
npm run dev
```

3. Na mobile otvorte:
```
http://[VAŠA_IP]:3000
```

Napríklad: `http://192.168.1.100:3000`

---

## 🚀 Hot Reload

Aplikácia podporuje **hot reload** - zmeny v kóde sa automaticky prejavia v prehliadači bez reštartu servera.

Skúste:
1. Spustite `npm run dev`
2. Otvorte súbor `src/app/page.tsx`
3. Zmeňte nejaký text
4. Uložte súbor
5. Prehliadač sa automaticky aktualizuje ✨

---

## 📊 Development info

Pri spustení uvidíte v termináli:

```
  ▲ Next.js 16.1.1
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Starting...
 ✓ Ready in 2.3s
```

---

## 💡 Tipy

1. **DevTools**: Otvorte Chrome DevTools (F12) pre debugging
2. **React DevTools**: Nainštalujte React Developer Tools extension
3. **Network Tab**: Sledujte API volania v DevTools → Network
4. **Console**: Kontrolujte chyby v DevTools → Console

---

## 🎯 Ďalšie kroky

Po úspešnom spustení môžete:

1. **Preskúmať UI komponenty** v `src/components/`
2. **Upraviť farebné schémy** v `src/app/globals.css`
3. **Pridať mock dáta** pre testovanie
4. **Integrovať Leaflet mapu** na hlavnú stránku
5. **Implementovať API volania** v `src/services/`

---

## 📞 Pomoc

Ak niečo nefunguje:
1. Skontrolujte, či Node.js verzia je 20+: `node --version`
2. Skontrolujte konzolu terminálu pre chybové hlášky
3. Pozrite sa do browser console (F12)
4. Skúste vyčistiť cache: `rm -rf .next && npm run dev`

---

**Vyrobené s ❤️ pomocou Claude Code a Next.js**

Posledná aktualizácia: 29.12.2024
