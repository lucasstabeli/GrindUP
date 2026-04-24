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

function timeMatchesNow(scheduledTime: string, utcOffsetMinutes: number): boolean {
  const nowUtc = new Date()
  const localMs = nowUtc.getTime() + utcOffsetMinutes * 60 * 1000
  const local = new Date(localMs)
  const [h, m] = scheduledTime.split(':').map(Number)
  return h === local.getUTCHours() && m === local.getUTCMinutes()
}

async function sendOneSignal(userId: string, message: string) {
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
  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err))
  }
  return true
}

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: users, error } = await supabase
      .from('user_game_data')
      .select('user_id, data')
      .filter('data->notifSettings->>enabled', 'eq', 'true')

    if (error) throw error
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results = await Promise.allSettled(
      users.map(async ({ user_id, data }) => {
        const notif = data?.notifSettings
        if (!notif?.enabled || !notif?.times?.length) return null

        const utcOffset: number = notif.utcOffset ?? -180
        const shouldFire = notif.times.some((t: string) => timeMatchesNow(t, utcOffset))
        if (!shouldFire) return null

        const messages: string[] = notif.messages || DEFAULT_MESSAGES
        const msg = messages[Math.floor(Math.random() * messages.length)]
        await sendOneSignal(user_id, msg)
        return user_id
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value != null).length

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('cron-push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
