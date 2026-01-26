// Server Status Webhook
// Allows server owners to update their server status via POST request
// URL: /server-webhook/{webhook_token}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Extract webhook token from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const webhookToken = pathParts[pathParts.length - 1]

    if (!webhookToken || webhookToken === 'server-webhook') {
      return new Response(
        JSON.stringify({ error: 'Webhook token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate body
    const { status, duration } = body

    if (status && !['online', 'offline'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Status must be "online" or "offline"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Valid duration options in hours
    const validDurations: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '12h': 12,
      '24h': 24,
      '48h': 48,
      '1w': 168
    }

    if (duration && !validDurations[duration]) {
      return new Response(
        JSON.stringify({ error: 'Invalid duration. Valid options: 1h, 6h, 12h, 24h, 48h, 1w' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find server by webhook token
    const { data: server, error: fetchError } = await supabase
      .from('servers')
      .select('id, webhook_token')
      .eq('webhook_token', webhookToken)
      .single()

    if (fetchError || !server) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build update object
    const update: Record<string, unknown> = {
      webhook_last_ping: new Date().toISOString(),
    }

    if (status) {
      update.status = status

      // Calculate expiration if status is online
      if (status === 'online') {
        // Use provided duration or default to 24 hours
        const durationKey = duration || '24h'
        const hours = validDurations[durationKey] || 24
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
        update.status_expires_at = expiresAt.toISOString()
      } else {
        // Clear expiration if setting to offline
        update.status_expires_at = null
      }
    }

    update.manual_updated_at = new Date().toISOString()

    // Update server
    const { error: updateError } = await supabase
      .from('servers')
      .update(update)
      .eq('id', server.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Server status updated',
        updated: update
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
