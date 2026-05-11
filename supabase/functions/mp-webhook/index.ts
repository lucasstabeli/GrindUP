import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()

    if (body.type !== 'payment' || !body.data?.id) {
      return new Response('ok')
    }

    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) throw new Error('MP_ACCESS_TOKEN não configurado')

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` },
    })
    const payment = await paymentRes.json()

    if (payment.status !== 'approved') {
      return new Response('ok')
    }

    // external_reference = "userId:plan" (ex: "abc123:monthly" ou "abc123:annual")
    const [userId, plan] = (payment.external_reference ?? '').split(':')
    if (!userId) throw new Error('external_reference inválido')

    const daysToAdd = plan === 'annual' ? 365 : 30
    const subscriptionEndsAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseAdmin.from('profiles').update({
      subscription_status: 'active',
      subscription_ends_at: subscriptionEndsAt,
      plan_type: plan || 'monthly',
    }).eq('id', userId)

    return new Response('ok')
  } catch (error) {
    console.error('mp-webhook error:', error)
    return new Response('ok')
  }
})
