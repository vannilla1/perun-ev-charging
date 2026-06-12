/**
 * Secret Vault — šifrovanie citlivých hodnôt v databáze (encrypt-at-rest)
 *
 * Používa AES-256-GCM s kľúčom odvodeným (SHA-256) z JWT_SECRET.
 * Formát uloženej hodnoty: 'enc:v1:<iv>:<tag>:<ciphertext>' (base64url segmenty).
 * Hodnoty bez prefixu 'enc:v1:' sa považujú za legacy plaintext (base64 basic-auth)
 * a čítajú sa transparentne — migrácia prebieha pri najbližšom zápise.
 */

import crypto from 'crypto';
import type { UserDocument } from '../mongodb';

const ENC_PREFIX = 'enc:v1:';
const DEV_JWT_FALLBACK = 'perun-ev-charging-default-secret-change-me';

function getEncryptionKey(): Buffer {
  const raw = process.env.JWT_SECRET;
  if (!raw) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PHASE !== 'phase-production-build'
    ) {
      throw new Error('JWT_SECRET env var is required in production');
    }
    return crypto.createHash('sha256').update(DEV_JWT_FALLBACK).digest();
  }
  return crypto.createHash('sha256').update(raw).digest();
}

/** Či je hodnota už zašifrovaná týmto modulom */
export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

/** Zašifruje plaintext hodnotu (AES-256-GCM) */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

/**
 * Dešifruje uloženú hodnotu.
 * Legacy hodnoty (bez 'enc:v1:' prefixu) vracia bez zmeny — transparentná migrácia.
 */
export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) {
    return stored;
  }
  const parts = stored.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Neplatný formát zašifrovanej hodnoty');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Vráti hodnotu pre HTTP 'Authorization' hlavičku smart-me Basic Auth
 * z používateľského dokumentu, alebo null ak používateľ nemá uložené prihlásenie.
 */
export function getBasicAuthHeader(user: Pick<UserDocument, 'smartmeBasicAuth'>): string | null {
  if (!user.smartmeBasicAuth) return null;
  return `Basic ${decryptSecret(user.smartmeBasicAuth)}`;
}
