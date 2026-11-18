import { hash, json } from '../waitlist'
import type { Env } from '../waitlist'

async function authorized(request: Request, env: Env) {
  if (!env.DB || !env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) return false
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return false
  const supplied = await hash(header.slice(7))
  const expected = await hash(env.ADMIN_TOKEN)
  let different = 0
  for (let index = 0; index < expected.length; index++) different |= supplied.charCodeAt(index) ^ expected.charCodeAt(index)
  return different === 0
}

function cell(value: unknown) {
  const raw = value == null ? '' : String(value)
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(raw) ? "'" + raw : raw
  return '"' + safe.replaceAll('"', '""') + '"'
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await authorized(request, env)) return json(404, 'Seite nicht gefunden.')
  const sql = `SELECT e.id, e.email, e.confirmed_at, e.contacted_at, i.product_name, i.color, i.size, i.quantity
    FROM waitlist_entries e JOIN waitlist_items i ON i.entry_id = e.id
    WHERE e.confirmed_at IS NOT NULL AND e.id > ?
    ORDER BY e.id, i.product_id, i.size LIMIT 3000`
  const after = new URL(request.url).searchParams.get('after') ?? ''
  const results = (await env.DB.prepare(sql).bind(after).all<Record<string, unknown>>()).results
  let cursor: string | undefined
  if (results.length === 3000) {
    const lastId = results.at(-1)!.id
    while (results.at(-1)?.id === lastId) results.pop()
    cursor = String(results.at(-1)!.id)
  }
  const columns = ['id', 'email', 'confirmed_at', 'contacted_at', 'product_name', 'color', 'size', 'quantity']
  const csv = [columns.join(','), ...results.map(row => columns.map(column => cell(row[column])).join(','))].join('\r\n')
  const headers = new Headers({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="gzn-vormerkungen.csv"',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  if (cursor) headers.set('X-Next-After', cursor)
  return new Response(csv, { headers })
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!await authorized(request, env)) return json(404, 'Seite nicht gefunden.')
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return json(400, 'Vormerknummer fehlt.')
  const result = await env.DB.prepare(
    'UPDATE waitlist_entries SET contacted_at = COALESCE(contacted_at, ?) WHERE id = ? AND confirmed_at IS NOT NULL RETURNING id',
  ).bind(Date.now(), id).first()
  return result ? json(200, 'Als kontaktiert markiert.') : json(404, 'Vormerkung nicht gefunden.')
}
