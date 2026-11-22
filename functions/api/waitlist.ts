import { allow, day, hash, insertItem, json, keyedHash, parseItems, readBody, ready, sendMail } from '../waitlist'
import { appsScriptMailerConfigured } from '../apps-script-mailer'
import type { Entry, Env } from '../waitlist'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!ready(env)) return json(503, 'Die Warteliste ist gerade geschlossen.')

  const body = await readBody(request, env)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const cleanName = (value: unknown) => typeof value === 'string' ? value.trim().normalize('NFC') : ''
  const firstName = cleanName(body?.firstName)
  const lastName = cleanName(body?.lastName)
  if (![firstName, lastName].every(name => name.length > 0 && name.length <= 80 && !/[\u0000-\u001f\u007f]/u.test(name))) {
    return json(400, 'Bitte überprüfe deinen Vor- und Nachnamen.')
  }
  const id = body?.requestId
  const items = parseItems(body?.items)
  if (!items || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id) || body.company) {
    return json(400, 'Bitte überprüfe deine E-Mail-Adresse und deine Auswahl.')
  }

  const secret = env.TOKEN_SECRET!
  const fingerprint = await keyedHash(secret, JSON.stringify([email, firstName, lastName, items]))
  const now = Date.now()

  try {
    const lookup = () => env.DB.prepare('SELECT * FROM waitlist_entries WHERE id = ?').bind(id).first<Entry>()
    let entry = await lookup()
    if (!entry) {
      const ip = await keyedHash(secret, request.headers.get('CF-Connecting-IP') ?? 'local')
      const recipient = await keyedHash(secret, email)
      if (!await allow(env.DB, 'submit/ip/' + ip, day / 24, 10) ||
          !await allow(env.DB, 'submit/mail/' + recipient, day, 4) ||
          !await allow(env.DB, 'submit/global', day, appsScriptMailerConfigured(env) ? 30 : 45)) {
        return json(429, 'Gerade sind zu viele Vormerkungen eingegangen. Versuche es später erneut.')
      }

      const token = await keyedHash(secret, 'verification/' + id)
      await env.DB.batch([
        env.DB.prepare(
          'INSERT OR IGNORE INTO waitlist_entries (id, email, first_name, last_name, fingerprint, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).bind(id, email, firstName, lastName, fingerprint, await hash(token), now, now + 2 * day),
        ...items.map(item => insertItem(env.DB, id, fingerprint, item)),
      ])
      entry = await lookup()
    }

    if (!entry || entry.fingerprint !== fingerprint || entry.expires_at <= now) {
      return json(409, 'Diese Anfrage ist abgelaufen oder wurde bereits anders verwendet. Lade die Seite neu.')
    }
    if (!entry.verification_sent_at) {
      const token = await keyedHash(secret, 'verification/' + entry.id)
      if (!await sendMail(env, entry, 'verify', token)) {
        return json(503, 'Deine Auswahl ist gespeichert. Der Mailversand ist gerade gestört. Versuche es erneut.')
      }
      await env.DB.prepare('UPDATE waitlist_entries SET verification_sent_at = ? WHERE id = ?').bind(now, id).run()
    }
    return json(202, 'Bestätige deine E-Mail-Adresse über den Link in deinem Postfach.')
  } catch {
    return json(503, 'Die Warteliste ist gerade nicht erreichbar. Versuche es erneut.')
  }
}
