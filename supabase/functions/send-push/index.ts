import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!

const DEFAULT_MESSAGES = [
  'Bora treinar! Não perde o streak. 🔥',
  'Já fez as missões de hoje? Foca! 💪',
  'Um dia de cada vez. Bora lá! 🎯',
  'Missões te esperando. Vai! 💥',
  'Hora de focar. Você consegue! 🏆',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { userId, body: customBody, test } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 })
    }

    const message = customBody || (test
      ? '🔔 Notificação de teste GrindUP!'
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

    const data = await res.json()

    if (!res.ok) {
      console.error('OneSignal error:', data)
      return new Response(JSON.stringify({ error: data }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
