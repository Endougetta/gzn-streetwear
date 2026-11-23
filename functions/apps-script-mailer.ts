export type AppsScriptMailConfig = {
  GOOGLE_APPS_SCRIPT_URL?: string
  GOOGLE_APPS_SCRIPT_TOKEN?: string
}

export type AppsScriptMessage = {
  to: string[]
  reply_to?: string
  subject: string
  text: string
  html?: string
}

export function appsScriptMailerConfigured(env: AppsScriptMailConfig) {
  if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_APPS_SCRIPT_TOKEN) return false
  try {
    const url = new URL(env.GOOGLE_APPS_SCRIPT_URL)
    return url.protocol === 'https:' && url.hostname === 'script.google.com'
      && url.pathname.startsWith('/macros/s/') && url.pathname.endsWith('/exec')
      && env.GOOGLE_APPS_SCRIPT_TOKEN.length >= 32
  } catch {
    return false
  }
}

export async function sendAppsScriptMail(env: AppsScriptMailConfig, message: AppsScriptMessage) {
  if (!appsScriptMailerConfigured(env) || message.to.length !== 1) return false
  try {
    const response = await fetch(env.GOOGLE_APPS_SCRIPT_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: env.GOOGLE_APPS_SCRIPT_TOKEN,
        to: message.to[0],
        replyTo: message.reply_to ?? '',
        subject: message.subject,
        text: message.text,
        html: message.html ?? '<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">'
          + message.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
          + '</pre>',
      }),
      signal: AbortSignal.timeout(12000),
    })
    const result = await response.json() as { ok?: boolean }
    return response.ok && result.ok === true
  } catch {
    return false
  }
}
