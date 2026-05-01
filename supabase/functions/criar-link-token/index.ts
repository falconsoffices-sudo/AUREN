import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { user_id } = await req.json()
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: CORS })

    const clientId = Deno.env.get('PLAID_CLIENT_ID')
    const secret   = Deno.env.get('PLAID_SECRET')
    if (!clientId || !secret) throw new Error('Plaid credentials not configured')

    const res = await fetch('https://sandbox.plaid.com/link/token/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:    clientId,
        secret:       secret,
        client_name:  'AUREN',
        user:         { client_user_id: user_id },
        products:     ['transactions'],
        country_codes: ['US', 'BR'],
        language:     'pt',
      }),
    })

    const data = await res.json()
    if (data.error_code) throw new Error(data.error_message ?? data.error_code)

    return new Response(JSON.stringify({ link_token: data.link_token }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
