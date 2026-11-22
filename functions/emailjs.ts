export type EmailJsConfig = {
  EMAILJS_SERVICE_ID?: string
  EMAILJS_TEMPLATE_ID?: string
  EMAILJS_PUBLIC_KEY?: string
}

export type EmailJsMessage = {
  to: string[]
  reply_to?: string
  subject: string
  text: string
  html?: string
}

export function emailJsConfigured(env: EmailJsConfig) {
  return Boolean(env.EMAILJS_SERVICE_ID && env.EMAILJS_TEMPLATE_ID && env.EMAILJS_PUBLIC_KEY)
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function toHtml(message: EmailJsMessage) {
  return message.html ?? '<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">'
    + escapeHtml(message.text) + '</pre>'
}

export async function sendEmailJs(env: EmailJsConfig, message: EmailJsMessage) {
  if (!emailJsConfigured(env) || message.to.length !== 1) return false
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: env.EMAILJS_SERVICE_ID,
        template_id: env.EMAILJS_TEMPLATE_ID,
        user_id: env.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: message.to[0],
          subject: message.subject,
          reply_to: message.reply_to ?? '',
          message_html: toHtml(message),
        },
      }),
      signal: AbortSignal.timeout(10000),
    })
    await response.body?.cancel()
    return response.ok
  } catch {
    return false
  }
}
