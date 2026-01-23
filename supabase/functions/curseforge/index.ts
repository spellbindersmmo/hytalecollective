import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CURSEFORGE_API = 'https://api.curseforge.com/v1'
const API_KEY = Deno.env.get('CURSEFORGE_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the CurseForge API URL
    const cfUrl = `${CURSEFORGE_API}${endpoint}`

    // Forward the request to CurseForge
    const cfResponse = await fetch(cfUrl, {
      method: req.method,
      headers: {
        'x-api-key': API_KEY!,
        'Content-Type': 'application/json',
      },
      body: req.method === 'POST' ? await req.text() : undefined,
    })

    const data = await cfResponse.json()

    return new Response(
      JSON.stringify(data),
      {
        status: cfResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
