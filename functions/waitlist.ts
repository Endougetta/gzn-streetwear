import { gmailConfigured, sendGmail } from './gmail'
import type { GmailConfig } from './gmail'
import { isLine, lineKey, maxLines, productById } from '../src/catalog'
import type { Line } from '../src/catalog'

export type Env = GmailConfig & {
  DB: D1Database
  SITE_URL?: string
  TOKEN_SECRET?: string
  RESEND_API_KEY?: string
  OWNER_EMAIL?: string
  MAIL_FROM?: string
  MAIL_REPLY_TO?: string
  ADMIN_TOKEN?: string
  LOCAL_MAIL?: string
  WAITLIST_ENABLED?: string
}

export type Entry = {
  id: string
  first_name: string | null
  last_name: string | null
  owner_notified_at: number | null
  email: string
  fingerprint: string
  expires_at: number
  verification_sent_at: number | null
  confirmed_at: number | null
  confirmation_sent_at: number | null
}

export const day = 24 * 60 * 60 * 1000
const maxBody = 12000

export function json(status: number, message: string) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function readBody(request: Request, env: Env) {
  if (!env.SITE_URL || request.headers.get('Origin') !== new URL(env.SITE_URL).origin ||
      !request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return null
  const reader = request.body?.getReader()
  if (!reader) return null
  const decoder = new TextDecoder()
  let result = ''
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBody) {
        await reader.cancel()
        return null
      }
      result += decoder.decode(value, { stream: true })
    }
    const body = JSON.parse(result + decoder.decode())
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function hash(value: string) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

export async function keyedHash(secret: string, value: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

export function localMail(env: Env) {
  if (env.LOCAL_MAIL !== '1' || !env.SITE_URL) return false
  return ['localhost', '127.0.0.1'].includes(new URL(env.SITE_URL).hostname)
}

export function ready(env: Env) {
  return Boolean(env.DB && env.SITE_URL && env.TOKEN_SECRET && env.TOKEN_SECRET.length >= 32
    && (localMail(env) || (env.WAITLIST_ENABLED === '1' && (gmailConfigured(env) || env.RESEND_API_KEY) && env.MAIL_FROM && env.OWNER_EMAIL &&
      new URL(env.SITE_URL).protocol === 'https:')))
}

export function parseItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > maxLines || !value.every(isLine)) return null
  if (new Set(value.map(lineKey)).size !== value.length) return null
  return value.map(({ productId, size, quantity }) => ({ productId, size, quantity }))
    .sort((left, right) => lineKey(left).localeCompare(lineKey(right)))
}

export async function allow(db: D1Database, subject: string, period: number, limit: number) {
  const now = Date.now()
  const expiresAt = (Math.floor(now / period) + 1) * period
  const allowance = await db.prepare(
    'INSERT INTO rate_limits VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 WHERE attempts < ? RETURNING attempts',
  ).bind(subject + '/' + expiresAt, expiresAt, limit).first()
  return allowance !== null
}

export function insertItem(db: D1Database, id: string, fingerprint: string, item: Line) {
  const product = productById.get(item.productId)!
  return db.prepare(
    `INSERT OR IGNORE INTO waitlist_items (entry_id, product_id, product_name, color, size, quantity)
     SELECT id, ?, ?, ?, ?, ? FROM waitlist_entries WHERE id = ? AND fingerprint = ?`,
  ).bind(item.productId, product.name, product.color, item.size, item.quantity, id, fingerprint)
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

export async function sendMail(env: Env, entry: Entry, type: 'verify' | 'confirmed' | 'owner', token?: string) {
  if (localMail(env)) return true
  const items = await env.DB.prepare(
    'SELECT product_name, color, size, quantity FROM waitlist_items WHERE entry_id = ? ORDER BY product_id, size',
  ).bind(entry.id).all<{ product_name: string; color: string; size: string; quantity: number }>()
  const summary = items.results.map(item => item.product_name + ' · ' + item.color + ' · ' + item.size + ' · ' + item.quantity + ' Stück').join('\n')
  const link = new URL('/bestaetigen', env.SITE_URL)
  link.hash = 'token=' + (token ?? '')
  const text = type === 'verify'
    ? 'Bitte bestätige deine unverbindliche Vormerkung für den GZN First Drop über diesen Link (48 Stunden gültig):\n' + link.href
    : 'Deine unverbindliche Vormerkung für den GZN First Drop ist bestätigt. Wir melden uns persönlich, wenn wir deine Auswahl anbieten können.'
  const title = type === 'verify' ? 'Vormerkung bestätigen' : 'Deine Vormerkung ist bestätigt'
  const description = type === 'verify'
    ? 'Bestätige deine E-Mail-Adresse innerhalb von 48 Stunden.'
    : 'Wir melden uns persönlich, wenn wir deine Auswahl anbieten können.'
  const action = type === 'verify'
    ? '<p><a style="display:inline-block;padding:14px 20px;background:#161819;color:#fff;text-decoration:none;font-weight:bold" href="' + escapeHtml(link.href) + '">E-Mail-Adresse bestätigen</a></p>'
    : ''
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eff1f2" lang="de" style="font-family:Arial,Helvetica,sans-serif;color:#171b20"><tr><td align="center" style="padding:24px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:560px;border:1px solid #d8dde0">
<tr><td bgcolor="#18242e" style="padding:24px;color:#ffffff"><strong style="font-size:38px;letter-spacing:-3px">GZN<span style="color:#9bbbd0">.</span></strong><span style="float:right;font-size:11px;letter-spacing:2px;padding-top:16px">FIRST DROP</span></td></tr>
<tr><td style="padding:28px 24px 8px"><p style="margin:0 0 10px;color:#742e43;font-size:12px;font-weight:bold;letter-spacing:1.5px">UNVERBINDLICHE VORMERKUNG</p><h1 style="margin:0 0 12px;font-size:29px;line-height:1.12">${title}</h1><p style="margin:0;line-height:1.6">${description}</p>${action}</td></tr>
<tr><td style="padding:16px 24px"><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><caption style="text-align:left;font-size:18px;font-weight:bold;padding-bottom:12px">Deine Auswahl</caption><thead><tr bgcolor="#eef2f5"><th align="left" style="padding:10px">Artikel</th><th align="right" style="padding:10px">Menge</th></tr></thead><tbody>${items.results.map(item => '<tr><td style="padding:14px 10px;border-bottom:1px solid #d8dde0"><strong>' + escapeHtml(item.product_name) + '</strong><br><span style="color:#505d67;font-size:13px">' + escapeHtml(item.color) + ' · Größe ' + escapeHtml(item.size) + '</span></td><td align="right" style="padding:10px;border-bottom:1px solid #d8dde0">' + item.quantity + '</td></tr>').join('')}</tbody></table></td></tr>
<tr><td style="padding:8px 24px 24px"><p>Danke, dass du beim ersten Drop dabei bist.<br><strong>Imad von GZN</strong></p><p style="color:#505d67;font-size:12px;overflow-wrap:anywhere">Vormerknummer<br>${escapeHtml(entry.id)}</p></td></tr></table></td></tr></table>`
  try {
    const message = {
        from: env.MAIL_FROM!, to: [type === 'owner' ? env.OWNER_EMAIL! : entry.email], reply_to: type === 'owner' ? entry.email : env.MAIL_REPLY_TO,
        subject: type === 'owner' ? 'GZN · Neue bestätigte Vormerkung' : type === 'verify' ? 'GZN · Vormerkung bestätigen' : 'GZN · Deine Vormerkung ist bestätigt',
        html: type === 'owner' ? undefined : html,
        text: (type === 'owner' ? ['Neue bestätigte Vormerkung', entry.first_name, entry.last_name, entry.email].filter(Boolean).join('\n') : text) + '\n\nDeine Auswahl:\n' + summary + '\n\nVormerknummer: ' + entry.id,
    }
    if (gmailConfigured(env)) return await sendGmail(env, message, type + '-' + entry.id)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'gzn/' + type + '/' + entry.id,
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(8000),
    })
    await response.body?.cancel()
    return response.ok
  } catch {
    return false
  }
}
