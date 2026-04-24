import { createClient } from 'npm:@supabase/supabase-js@2'
import webPush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@grindupapp.com'
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const DEFAULT_MESSAGES = [
  'Bora treinar! Não perde o streak. 🔥',
  'Já fez as missões de hoje? Foca! 💪',
  'Um dia de cada vez. Bora lá! 🎯',
  'Missões te esperando. Vai! 💥',
  'Hora de focar. Você consegue! 🏆',
]

function timeMatchesNow(scheduledTime: string, utcOffsetMinutes: number): boolean {
  const nowUtc = new Date()
  // Convert UTC now to user's local time
  const localMs = nowUtc.getTime() + utcOffsetMinutes * 60 * 1000
  const local = new Date(localMs)
  const localH = local.getUTCHours()
  const localM = local.getUTCMinutes()

  const [h, m] = scheduledTime.split(':').map(Number)
  return h === localH && m === localM
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

  // Verify secret to prevent unauthorized calls
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    if (!auth.includes(CRON_SECRET)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: usersWithNotif, error: err2 } = await supabase
      .from('user_game_data')
      .select('user_id, data')
      .filter('data->notifSettings->>enabled', 'eq', 'true')

    if (err2) throw err2

    if (!usersWithNotif || usersWithNotif.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No users with notifications enabled' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results = await Promise.allSettled(
      usersWithNotif.map(async ({ user_id, data }) => {
        const notifSettings = data?.notifSettings
        if (!notifSettings?.enabled || !notifSettings?.times?.length) return null

        const utcOffset: number = notifSettings.utcOffset ?? -180 // default Brazil UTC-3
        const times: string[] = notifSettings.times
        const messages: string[] = notifSettings.messages || DEFAULT_MESSAGES

        const shouldFire = times.some(t => timeMatchesNow(t, utcOffset))
        if (!shouldFire) return null

        // Get push subscription for this user
        const { data: sub, error: subErr } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', user_id)
          .single()

        if (subErr || !sub) return null

        const msg = messages[Math.floor(Math.random() * messages.length)]
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: 'GrindUP', body: msg, url: '/' }),
        )
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
