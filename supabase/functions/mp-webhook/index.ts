import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()

    // MP envia type = 'payment' quando um pagamento é processado
    if (body.type !== 'payment' || !body.data?.id) {
      return new Response('ok')
    }

    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) throw new Error('MP_ACCESS_TOKEN não configurado')

    // Busca detalhes do pagamento na API do Mercado Pago
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` },
    })
    const payment = await paymentRes.json()

    if (payment.status !== 'approved') {
      return new Response('ok')
    }

    const userId = payment.external_reference
    if (!userId) throw new Error('external_reference ausente no pagamento')

    // Usa service role para atualizar sem restrição de RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin.from('profiles').update({
      subscription_status: 'active',
      subscription_ends_at: thirtyDaysFromNow,
    }).eq('id', userId)

    return new Response('ok')
  } catch (error) {
    console.error('mp-webhook error:', error)
    // Retorna 200 mesmo em erro para o MP não reenviar indefinidamente
    return new Response('ok')
  }
})
