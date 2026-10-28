// Overí, že každý jazyk v src/locales/ má presne tie isté kľúče a premenné ({name}) ako slovenčina.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// Parser ICU správ prichádza s next-intl; bez neho sa preskočí len kontrola syntaxe.
let IntlMessageFormat = null;
try {
  IntlMessageFormat = createRequire(import.meta.url)('intl-messageformat').IntlMessageFormat;
} catch {
  console.warn('intl-messageformat nenájdený — kontrola syntaxe ICU preskočená');
}

const root = new URL('../src/locales/', import.meta.url).pathname;
const base = 'sk';
const locales = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const files = (loc) => readdirSync(join(root, loc)).filter((f) => f.endsWith('.json')).sort();

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
// Premenné ICU na najvyššej úrovni ({count, plural, ...} → count); vnorené vetvy pluralu sa nepočítajú.
function args(msg) {
  const names = new Set();
  let depth = 0;
  for (let i = 0; i < msg.length; i++) {
    if (msg[i] === '{') {
      if (depth === 0) {
        const m = /^\{\s*([A-Za-z0-9_]+)/.exec(msg.slice(i));
        if (m) names.add(m[1]);
      }
      depth++;
    } else if (msg[i] === '}') depth = Math.max(0, depth - 1);
  }
  return [...names].sort().join(',');
}

const errors = [];
const baseFiles = files(base);
const load = (loc, f) => flatten(JSON.parse(readFileSync(join(root, loc, f), 'utf8')));

for (const loc of locales) {
  const locFiles = files(loc);
  for (const f of baseFiles) if (!locFiles.includes(f)) errors.push(`${loc}/${f}: súbor chýba`);
  for (const f of locFiles) if (!baseFiles.includes(f)) errors.push(`${loc}/${f}: súbor navyše (nie je v ${base})`);
  for (const f of baseFiles.filter((x) => locFiles.includes(x))) {
    const a = load(base, f);
    const b = load(loc, f);
    for (const [k, v] of Object.entries(b)) {
      if (typeof v !== 'string' || v.trim() === '') errors.push(`${loc}/${f}: ${k} je prázdny`);
      else if (IntlMessageFormat) {
        try {
          new IntlMessageFormat(v, loc);
        } catch (e) {
          errors.push(`${loc}/${f}: ${k} má chybnú syntax ICU (${e.message})`);
        }
      }
    }
    if (loc === base) continue;
    for (const k of Object.keys(a)) if (!(k in b)) errors.push(`${loc}/${f}: chýba ${k}`);
    for (const k of Object.keys(b)) if (!(k in a)) errors.push(`${loc}/${f}: navyše ${k}`);
    for (const k of Object.keys(a)) {
      if (k in b && typeof a[k] === 'string' && typeof b[k] === 'string' && args(a[k]) !== args(b[k])) {
        errors.push(`${loc}/${f}: ${k} má iné premenné (${args(a[k])} ≠ ${args(b[k])})`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} chýb v prekladoch`);
  process.exit(1);
}
console.log(`Preklady OK: ${locales.join(', ')} · ${baseFiles.length} súborov`);
