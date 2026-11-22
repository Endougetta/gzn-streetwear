export type GmailConfig = {
  GMAIL_CLIENT_ID?: string
  GMAIL_CLIENT_SECRET?: string
  GMAIL_REFRESH_TOKEN?: string
}

type Message = {
  from: string
  to: string[]
  reply_to?: string
  subject: string
  text: string
  html?: string
}

export function gmailConfigured(env: GmailConfig) {
  return Boolean(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN)
}

function base64(value: string) {
  return btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join(''))
}

export function encodeMessage(message: Message, id: string) {
  const addresses = [message.from, ...message.to]
  if (message.reply_to) addresses.push(message.reply_to)
  if (message.to.length !== 1 || !addresses.every(address => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+$/.test(address) && !/[\r\n]/.test(address))) {
    throw new Error('Expected one mailbox per address')
  }
  const boundary = 'gzn-' + id
  const headers = [
    'From: GZN Streetwear <' + message.from + '>',
    'To: ' + message.to[0],
    'Subject: =?UTF-8?B?' + base64(message.subject) + '?=',
    'Message-ID: <' + id + '@gzn-streetwear.pages.dev>',
    'MIME-Version: 1.0',
  ]
  if (message.reply_to) headers.push('Reply-To: ' + message.reply_to)
  const part = (type: string, body: string) => [
    'Content-Type: ' + type + '; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
    base64(body).match(/.{1,76}/g)?.join('\r\n') ?? '',
  ]
  if (message.html) {
    headers.push('Content-Type: multipart/alternative; boundary="' + boundary + '"', '',
      '--' + boundary, ...part('text/plain', message.text),
      '--' + boundary, ...part('text/html', message.html), '--' + boundary + '--')
  } else {
    headers.push(...part('text/plain', message.text))
  }
  return base64(headers.join('\r\n')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export async function sendGmail(env: GmailConfig, message: Message, id: string) {
  const raw = encodeMessage(message, id)
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env.GMAIL_CLIENT_ID!, client_secret: env.GMAIL_CLIENT_SECRET!,
      refresh_token: env.GMAIL_REFRESH_TOKEN!, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(8000),
  })
  if (!token.ok) return false
  const { access_token } = await token.json() as { access_token?: string }
  if (!access_token) return false
  const sent = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }), signal: AbortSignal.timeout(8000),
  })
  await sent.body?.cancel()
  return sent.ok
}
