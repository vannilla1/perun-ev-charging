# eCarUp / smart-me API Research

## Executive Summary

Cielom bolo implementovat vlastnu slovensku aplikaciu pre nabijanie elektromobilov s Stripe platobnym systemom, ktora by na pozadi komunikovala s eCarUp/smart-me infrastrukturou.

**Zaver:** Public API eCarUp a smart-me nepodporuju remote start/stop nabijania. Je potrebne kontaktovat eCarUp pre Partner API pristup.

---

## Testovane API Endpoints

### 1. eCarUp Public API
**URL:** https://public-api.ecarup.com

| Endpoint | Metoda | Funkcnost | Vysledok |
|----------|--------|-----------|----------|
| `/v1/stations` | GET | Zoznam stanic | OK - read-only |
| `/v1/station/{id}` | GET | Detail stanice | OK - read-only |
| `/v1/station/{stationId}/connectors/{connectorId}/active-charging` | GET | Aktivne nabijanie | OK - read-only |
| `/v1/history/station/{id}` | GET | Historia nabijania | OK - read-only |
| `/v1/history/driver` | GET | Historia vodicov | OK - read-only |

**Zaver:** Vsetky endpointy su read-only. Ziadne endpointy pre start/stop nabijania.

---

### 2. smart-me API
**URL:** https://smart-me.com/api

| Endpoint | Metoda | Funkcnost | Vysledok |
|----------|--------|-----------|----------|
| `/api/Devices` | GET | Zoznam zariadeni | OK - 86 zariadeni |
| `/api/Devices/{id}` | GET | Detail zariadenia | OK |
| `/api/DevicesBySubType?meterSubType=3` | GET | E-Charging zariadenia | OK - 82 stanic |
| `/api/pico/charging/{id}` | GET | Stav nabijania | OK - State: 7 |
| `/api/actions/{id}` | GET | Dostupne akcie | OK - ale vracia [] |
| `/api/actions` | POST | Vykonat akciu | 204 - ale bez efektu |
| `/api/Pico` | GET | Pico stanice | OK - ale 0 stanic |
| `/api/pico/tryenablecablelock/{id}` | POST | Zamknut kabel | 400 - "No pico station" |
| `/api/Devices/{id}?switchState=true` | PUT | Zapnut zariadenie | 405 - Method Not Allowed |

**Zaver:**
- Stanice vracaju `Actions: []` - ziadne remote akcie nie su dostupne
- Zariadenia su typu `MeterSubType: 3` (E-Charging) ale nie su "Pico"
- Endpoint `/api/Pico` vracia 0 zariadeni - tieto stanice nie su priamo smart-me Pico

---

### 3. eCarUp OCPP Endpoint
**URL:** wss://www.ecarup.com/api/Ocpp16/61242188CDF335B2/{serial}

| Sprava | Smer | Vysledok |
|--------|------|----------|
| BootNotification | -> | Accepted |
| StatusNotification | -> | Accepted |
| Heartbeat | -> | Accepted |
| MeterValues | -> | Accepted |
| RemoteStartTransaction | <- | **TIMEOUT** - nepodporovane |
| RemoteStopTransaction | <- | **TIMEOUT** - nepodporovane |

**Zaver:** OCPP endpoint prijima spravy OD stanic (charge point -> CSMS), ale NEpodporuje posielanie prikazov NA stanice (CSMS -> charge point). Je to jednosmerna komunikacia.

---

## Testovane Zariadenia

### ePerun MI Dukelska/Obchodna L
- **Serial:** 5593
- **smart-me ID:** bcae5485-0e8b-958d-cf72-6dd6e03b3f46
- **DeviceEnergyType:** 1
- **MeterSubType:** 3 (E-Charging)
- **FamilyType:** 1001
- **State:** 7 (Available)
- **Actions:** [] (ziadne)

### ePerun Nizny Hrabovec L
- **Serial:** 20006
- **smart-me ID:** 9e998ae7-2f1b-72df-11a8-2e5e9b9e6430
- **State:** 7 (Available)
- **Actions:** [] (ziadne)

---

## eMobiel Aplikacia

eMobiel je aplikacia vyvinuta priamo spolocnostou **smart-me AG**:
- Play Store: com.ecarup.esb
- Umoznuje vyhladavanie stanic, odomknutie a platbu
- Je to **interna aplikacia** smart-me, nie white-label riesenie
- Ma priamy pristup k backendu smart-me/eCarUp

---

## Odporucania

### Moznost 1: Partner API pristup (odporucane)
Kontaktovat eCarUp a poziadat o:
- Gold Partner API pristup s remote start/stop funkcionalitou
- White-label SDK podobne ako pouziva eMobiel
- Dokumentaciu pre CPO integraciu

### Moznost 2: Vlastny OCPP backend
- Prepojit stanice priamo na vlastny OCPP server
- Implementovat RemoteStartTransaction/RemoteStopTransaction
- Vyzaduje zmenu konfiguracie na staniciach

### Moznost 3: Hybridny pristup
- Pouzit eCarUp pre monitoring a billing
- Roaming cez OCPI pre pristup k dalsim sietam
- Vlastne UI v slovencine

---

## Email pre eCarUp Support

```
Subject: API Access Request - Remote Charging Control for CPO Integration

Dear eCarUp Support Team,

We are ePerun, a Charge Point Operator with 80+ charging stations across Slovakia using eCarUp OCPP backend. We are developing a custom mobile application with Slovak language support and Stripe payment integration.

We have tested the following APIs:
1. eCarUp Public API (https://public-api.ecarup.com) - read-only, no start/stop
2. smart-me API - our stations return Actions: [] (no remote actions)
3. eCarUp OCPP endpoint - accepts messages FROM stations only

Our requirements:
1. Remote Start/Stop charging via API (RemoteStartTransaction)
2. Pre-authorization payment flow (block amount -> charge -> capture actual)
3. Real-time session monitoring
4. Slovak language mobile app (eMobiel is not available in Slovak)

Questions:
1. Is there a Partner API with remote charging control?
2. How does the eMobiel app achieve remote start/stop functionality?
3. What are the options for CPO integration with custom payment flow?
4. Is there a white-label SDK available?

Our account credentials:
- OAuth Client ID: E2QIyEXmHH1MJfkv707sYQAUec7cli
- OCPP URL: ws://www.ecarup.com/api/Ocpp16/61242188CDF335B2

Thank you for your assistance.

Best regards,
ePerun Team
```

---

## Referencie

- [eCarUp Public API Swagger](https://public-api.ecarup.com/swagger/index.html)
- [smart-me API Swagger](https://api.smart-me.com/swagger/index.html)
- [eCarUp OCPP Backend](https://web.ecarup.com/en/ocppbackend/)
- [eMobiel Google Play](https://play.google.com/store/apps/details?id=com.ecarup.esb)
- [smart-me Wiki](https://sites.google.com/smart-me.com/wiki-english/)
