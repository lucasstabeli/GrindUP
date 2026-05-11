import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { appUrl } = await req.json()
    if (!appUrl) throw new Error('appUrl é obrigatório')

    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) throw new Error('MP_ACCESS_TOKEN não configurado — adicione o segredo no Supabase')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify({
        items: [{
          title: 'GrindUP — Acesso Mensal',
          quantity: 1,
          unit_price: 5.00,
          currency_id: 'BRL',
        }],
        payer: { email: user.email },
        back_urls: {
          success: `${appUrl}/app?sub=success`,
          failure: `${appUrl}/app?sub=failure`,
          pending: `${appUrl}/app?sub=pending`,
        },
        auto_return: 'approved',
        external_reference: user.id,
        notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
        statement_descriptor: 'GRINDUP',
      }),
    })

    const preference = await preferenceRes.json()

    if (!preference.init_point) {
      throw new Error(preference.message || 'Falha ao criar preferência no Mercado Pago')
    }

    return new Response(
      JSON.stringify({ checkoutUrl: preference.init_point }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
