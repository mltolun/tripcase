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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Invalid or expired token')

    const userId = user.id

    const { error: carsErr } = await supabase.from('car_rentals').delete().eq('user_id', userId)
    if (carsErr) throw carsErr

    const { error: hotelsErr } = await supabase.from('hotels').delete().eq('user_id', userId)
    if (hotelsErr) throw hotelsErr

    const { error: flightsErr } = await supabase.from('flights').delete().eq('user_id', userId)
    if (flightsErr) throw flightsErr

    const { error: tripsErr } = await supabase.from('trips').delete().eq('user_id', userId)
    if (tripsErr) throw tripsErr

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
    if (deleteErr) throw deleteErr

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
