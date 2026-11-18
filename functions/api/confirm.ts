import { allow, day, hash, json, keyedHash, readBody, ready, sendMail } from '../waitlist'
import type { Entry, Env } from '../waitlist'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!ready(env)) return json(503, 'Die Warteliste ist gerade geschlossen.')
  const body = await readBody(request, env)
  if (typeof body?.token !== 'string' || !/^[0-9a-f]{64}$/.test(body.token)) {
    return json(400, 'Dieser Bestätigungslink ist ungültig.')
  }

  try {
    const ip = await keyedHash(env.TOKEN_SECRET!, request.headers.get('CF-Connecting-IP') ?? 'local')
    if (!await allow(env.DB, 'confirm/ip/' + ip, day / 24, 20)) {
      return json(429, 'Zu viele Versuche. Versuche es später erneut.')
    }
    const now = Date.now()
    const tokenHash = await hash(body.token)
    const entry = await env.DB.prepare(
      `UPDATE waitlist_entries SET confirmed_at = COALESCE(confirmed_at, ?)
       WHERE token_hash = ? AND expires_at > ? RETURNING *`,
    ).bind(now, tokenHash, now).first<Entry>()
    if (!entry) return json(404, 'Dieser Bestätigungslink ist ungültig oder abgelaufen.')
    if (!entry.confirmation_sent_at && await sendMail(env, entry, 'confirmed')) {
      await env.DB.prepare('UPDATE waitlist_entries SET confirmation_sent_at = ? WHERE id = ?').bind(now, entry.id).run()
    }
    return json(200, 'Deine Vormerkung ist bestätigt. Wir melden uns, wenn wir deine Auswahl anbieten können.')
  } catch {
    return json(503, 'Die Warteliste ist gerade nicht erreichbar. Versuche es erneut.')
  }
}
