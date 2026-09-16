// Erzeugt ein VAPID-Schluesselpaar fuer Web-Push.
// Aufruf: node scripts/vapid.mjs
// Der oeffentliche Schluessel kommt in die .env.local des Frontends,
// beide gehoeren in die Supabase Secrets der Edge Function.
import { webcrypto as crypto } from 'node:crypto'

const b64u = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
])
const raw = await crypto.subtle.exportKey('raw', pair.publicKey)
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

console.log('VAPID_PUBLIC_KEY =', b64u(raw))
console.log('VAPID_PRIVATE_KEY=', jwk.d)
console.log('')
console.log('Frontend (.env.local):')
console.log(`VITE_VAPID_PUBLIC_KEY=${b64u(raw)}`)
console.log('')
console.log('Supabase Edge Function Secrets:')
console.log(`supabase secrets set VAPID_PUBLIC_KEY=${b64u(raw)}`)
console.log(`supabase secrets set VAPID_PRIVATE_KEY=${jwk.d}`)
console.log('supabase secrets set VAPID_SUBJECT=mailto:deine@adresse.de')
