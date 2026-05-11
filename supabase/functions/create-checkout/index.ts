import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLANS = {
  monthly: { title: 'GrindUP Premium — Mensal', price: 19.90 },
  annual:  { title: 'GrindUP Premium — Anual',  price: 149.00 },
} as const

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

    const { appUrl, plan = 'monthly' } = await req.json()
    if (!appUrl) throw new Error('appUrl é obrigatório')
    if (!PLANS[plan as keyof typeof PLANS]) throw new Error('Plano inválido')

    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) throw new Error('MP_ACCESS_TOKEN não configurado — adicione o segredo no Supabase')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const { title, price } = PLANS[plan as keyof typeof PLANS]

    const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify({
        items: [{
          title,
          quantity: 1,
          unit_price: price,
          currency_id: 'BRL',
        }],
        payer: { email: user.email },
        back_urls: {
          success: `${appUrl}/app?sub=success`,
          failure: `${appUrl}/app?sub=failure`,
          pending: `${appUrl}/app?sub=pending`,
        },
        auto_return: 'approved',
        // userId:plan codificado para o webhook saber qual plano ativar
        external_reference: `${user.id}:${plan}`,
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
