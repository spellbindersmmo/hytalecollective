// Supabase Edge Function for scraping servers from external sources
// Deploy with: supabase functions deploy scrape-servers
// Invoke with: supabase functions invoke scrape-servers

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScraperSource {
  id: string
  name: string
  slug: string
  base_url: string
  scrape_endpoint: string | null
  api_type: 'json' | 'html' | 'custom'
  field_mapping: Record<string, string>
  is_active: boolean
}

interface ExternalServer {
  name: string
  description?: string
  short_description?: string
  ip_address: string
  port?: number
  current_players?: number
  max_players?: number
  status?: 'online' | 'offline' | 'maintenance'
  external_id: string
  website?: string
  discord_invite?: string
  banner_url?: string
  icon_url?: string
}

// Normalize status from various formats to our enum
function normalizeStatus(status: unknown): 'online' | 'offline' | 'maintenance' {
  if (status === undefined || status === null) return 'online'

  // Handle numeric status (1 = online, 0 = offline)
  if (typeof status === 'number') {
    return status === 1 ? 'online' : 'offline'
  }

  // Handle string status
  const statusStr = String(status).toLowerCase()
  if (statusStr === 'online' || statusStr === '1' || statusStr === 'true') {
    return 'online'
  }
  if (statusStr === 'maintenance') {
    return 'maintenance'
  }
  return 'offline'
}

// Generate a URL-safe slug from server name
function generateSlug(name: string, externalId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  return `${baseSlug}-${externalId}`
}

// Map external data to our server format using field mapping
function mapServerData(
  externalData: Record<string, unknown>,
  fieldMapping: Record<string, string>
): Partial<ExternalServer> {
  const mapped: Partial<ExternalServer> = {}

  for (const [ourField, theirField] of Object.entries(fieldMapping)) {
    if (theirField && externalData[theirField] !== undefined) {
      // Handle nested fields like 'data.server_name'
      let value = externalData
      for (const key of theirField.split('.')) {
        value = (value as Record<string, unknown>)?.[key]
      }
      if (value !== undefined) {
        (mapped as Record<string, unknown>)[ourField] = value
      }
    }
  }

  return mapped
}

// Fetch servers from a JSON API source
async function fetchJsonSource(source: ScraperSource): Promise<ExternalServer[]> {
  const url = source.scrape_endpoint
    ? `${source.base_url}${source.scrape_endpoint}`
    : source.base_url

  console.log(`Fetching from ${url}`)

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'HytaleCollective-Scraper/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch from ${url}: ${response.status}`)
  }

  const data = await response.json()

  // Handle both array responses and responses with a data property
  const servers = Array.isArray(data) ? data : (data.servers || data.data || [])

  return servers.map((serverData: Record<string, unknown>) => {
    const mapped = mapServerData(serverData, source.field_mapping)

    // Ensure required fields
    if (!mapped.name || !mapped.ip_address || !mapped.external_id) {
      console.warn('Skipping server with missing required fields:', mapped)
      return null
    }

    return {
      name: String(mapped.name),
      description: mapped.description ? String(mapped.description) : undefined,
      short_description: mapped.short_description ? String(mapped.short_description) : undefined,
      ip_address: String(mapped.ip_address),
      port: mapped.port ? Number(mapped.port) : 25565,
      current_players: mapped.current_players ? Number(mapped.current_players) : 0,
      max_players: mapped.max_players ? Number(mapped.max_players) : 100,
      status: normalizeStatus(mapped.status),
      external_id: String(mapped.external_id),
      website: mapped.website ? String(mapped.website) : undefined,
      discord_invite: mapped.discord_invite ? String(mapped.discord_invite) : undefined,
      banner_url: mapped.banner_url ? String(mapped.banner_url) : undefined,
      icon_url: mapped.icon_url ? String(mapped.icon_url) : undefined,
    } as ExternalServer
  }).filter(Boolean) as ExternalServer[]
}

// Main scraping handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get optional source slug from request body
    let targetSourceSlug: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        targetSourceSlug = body.source || null
      } catch {
        // No body or invalid JSON is fine
      }
    }

    // Fetch active scraper sources
    let query = supabase
      .from('scraper_sources')
      .select('*')
      .eq('is_active', true)

    if (targetSourceSlug) {
      query = query.eq('slug', targetSourceSlug)
    }

    const { data: sources, error: sourcesError } = await query

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active scraper sources found', scraped: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: { source: string; success: boolean; count: number; error?: string }[] = []

    for (const source of sources as ScraperSource[]) {
      console.log(`Processing source: ${source.name}`)

      try {
        let externalServers: ExternalServer[] = []

        // Fetch servers based on API type
        if (source.api_type === 'json') {
          externalServers = await fetchJsonSource(source)
        } else if (source.api_type === 'custom') {
          // Custom sources would need specific handler implementations
          console.log(`Skipping custom source ${source.slug} - needs custom implementation`)
          results.push({ source: source.slug, success: false, count: 0, error: 'Custom source type not implemented' })
          continue
        } else {
          console.log(`Unsupported API type: ${source.api_type}`)
          results.push({ source: source.slug, success: false, count: 0, error: `Unsupported API type: ${source.api_type}` })
          continue
        }

        console.log(`Found ${externalServers.length} servers from ${source.name}`)

        // Upsert servers into database
        let insertedCount = 0
        for (const server of externalServers) {
          const slug = generateSlug(server.name, server.external_id)
          const sourceUrl = source.scrape_endpoint
            ? `${source.base_url}${source.scrape_endpoint}`
            : source.base_url

          const { error: upsertError } = await supabase
            .from('servers')
            .upsert({
              name: server.name,
              slug,
              description: server.description || `Server from ${source.name}`,
              short_description: server.short_description,
              ip_address: server.ip_address,
              port: server.port || 25565,
              current_players: server.current_players || 0,
              max_players: server.max_players || 100,
              status: server.status || 'online',
              source: source.slug,
              source_url: sourceUrl,
              external_id: server.external_id,
              website: server.website,
              discord_invite: server.discord_invite,
              banner_url: server.banner_url,
              icon_url: server.icon_url,
              last_ping_at: new Date().toISOString(),
              // Create a dummy owner_id for scraped servers (system user)
              // In production, you'd create a system user or make owner_id nullable for scraped servers
            }, {
              onConflict: 'source,external_id',
              ignoreDuplicates: false
            })

          if (upsertError) {
            console.error(`Failed to upsert server ${server.name}:`, upsertError)
          } else {
            insertedCount++
          }
        }

        // Update source metadata
        await supabase
          .from('scraper_sources')
          .update({
            last_scraped_at: new Date().toISOString(),
            total_servers_scraped: insertedCount,
            last_error: null
          })
          .eq('id', source.id)

        results.push({ source: source.slug, success: true, count: insertedCount })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing source ${source.name}:`, error)

        // Update source with error
        await supabase
          .from('scraper_sources')
          .update({
            last_scraped_at: new Date().toISOString(),
            last_error: errorMessage
          })
          .eq('id', source.id)

        results.push({ source: source.slug, success: false, count: 0, error: errorMessage })
      }
    }

    const totalScraped = results.reduce((sum, r) => sum + r.count, 0)
    const successfulSources = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({
        message: `Scraped ${totalScraped} servers from ${successfulSources}/${results.length} sources`,
        results,
        totalScraped
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Scraper error:', error)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
