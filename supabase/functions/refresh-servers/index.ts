// Supabase Edge Function to refresh server data
// This can be called by an external cron service

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateSlug(name: string, externalId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
  return `${baseSlug}-${externalId}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Optional: Add a secret key check for security
  const authHeader = req.headers.get('authorization')
  const expectedKey = Deno.env.get('CRON_SECRET')
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Fetching servers from hytaleonlineservers.com...')

    const response = await fetch(
      'https://hytaleonlineservers.com/api/servers2?page=1&limit=100&sort=players',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HytaleCollective-Scraper/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || !data.servers) {
      throw new Error('Invalid API response')
    }

    console.log(`Found ${data.servers.length} servers`)

    let updated = 0
    let inserted = 0

    for (const server of data.servers) {
      const slug = generateSlug(server.name, server.id)

      const serverData = {
        name: server.name,
        slug,
        description: server.description || `Server from Hytale Online Servers`,
        short_description: server.short_description || null,
        ip_address: server.ip,
        port: 25565,
        current_players: server.players_online || 0,
        max_players: server.players_total || 100,
        status: server.status === 1 ? 'online' : 'offline',
        // Don't import external votes - only count votes from our site
        source: 'hytaleonlineservers',
        source_url: server.server_link || 'https://hytaleonlineservers.com',
        external_id: String(server.id),
        website: server.server_link || null,
        banner_url: server.banner_url || null,
        last_ping_at: new Date().toISOString()
      }

      // Check if exists
      const { data: existing } = await supabase
        .from('servers')
        .select('id')
        .eq('source', 'hytaleonlineservers')
        .eq('external_id', String(server.id))
        .maybeSingle()

      if (existing) {
        await supabase.from('servers').update(serverData).eq('id', existing.id)
        updated++
      } else {
        await supabase.from('servers').insert(serverData)
        inserted++
      }
    }

    // Update last refresh timestamp in a settings table or just log
    const result = {
      success: true,
      message: `Refreshed ${updated} servers, added ${inserted} new`,
      updated,
      inserted,
      total: data.servers.length,
      timestamp: new Date().toISOString()
    }

    console.log(result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Refresh error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
