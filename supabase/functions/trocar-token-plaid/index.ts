import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { public_token, user_id } = await req.json()
    if (!public_token || !user_id) {
      return new Response(JSON.stringify({ error: 'public_token and user_id required' }), { status: 400, headers: CORS })
    }

    const clientId = Deno.env.get('PLAID_CLIENT_ID')
    const secret   = Deno.env.get('PLAID_SECRET')
    if (!clientId || !secret) throw new Error('Plaid credentials not configured')

    const res = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, public_token }),
    })

    const data = await res.json()
    if (data.error_code) throw new Error(data.error_message ?? data.error_code)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ plaid_access_token: data.access_token })
      .eq('id', user_id)

    if (dbError) throw dbError

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
