const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || 'aeb9dee6-91d7-4806-b7b5-b01f7851d4b7'
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY') ?? ''

const DEFAULT_MESSAGES = [
  'Bora treinar! Não perde o streak. 🔥',
  'Já fez as missões de hoje? Foca! 💪',
  'Um dia de cada vez. Bora lá! 🎯',
  'Missões te esperando. Vai! 💥',
  'Hora de focar. Você consegue! 🏆',
]

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const { userId, body: customBody, test } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: 'userId required' }), { status: 400, headers: CORS })
    }

    if (!ONESIGNAL_REST_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'ONESIGNAL_REST_API_KEY not configured' }), { headers: CORS })
    }

    const message = customBody || (test
      ? 'Notificacao de teste GrindUP!'
      : DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES.length)])

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [userId] },
        target_channel: 'push',
        headings: { en: 'GrindUP' },
        contents: { en: message },
        url: '/',
        chrome_web_icon: '/icons/icon-192.png',
      }),
    })

    let data: unknown
    try { data = await res.json() } catch { data = {} }

    if (!res.ok) {
      console.error('OneSignal error', res.status, JSON.stringify(data))
      return new Response(JSON.stringify({ ok: false, osError: true, osStatus: res.status, osData: data }), { headers: CORS })
    }

    const d = data as { recipients?: number; errors?: unknown }
    if (d.recipients === 0) {
      console.warn('OneSignal: no recipients for', userId, JSON.stringify(d.errors))
      return new Response(JSON.stringify({ ok: false, noRecipients: true, errors: d.errors }), { headers: CORS })
    }

    return new Response(JSON.stringify({ ok: true, recipients: d.recipients }), { headers: CORS })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { headers: CORS })
  }
})
