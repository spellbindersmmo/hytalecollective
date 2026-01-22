// Simple server scraper script
// Run with: node scripts/scrape-servers.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables!');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generateSlug(name, externalId) {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  return `${baseSlug}-${externalId}`;
}

async function scrapeHytaleOnlineServers() {
  console.log('Fetching servers from hytaleonlineservers.com...');

  const response = await fetch(
    'https://hytaleonlineservers.com/api/servers2?page=1&limit=100&sort=players',
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HytaleCollective-Scraper/1.0'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.servers) {
    throw new Error('Invalid API response');
  }

  console.log(`Found ${data.servers.length} servers`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const server of data.servers) {
    const slug = generateSlug(server.name, server.id);

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
    };

    // Try to upsert (insert or update on conflict)
    const { data: existing } = await supabase
      .from('servers')
      .select('id')
      .eq('source', 'hytaleonlineservers')
      .eq('external_id', String(server.id))
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing
      result = await supabase
        .from('servers')
        .update(serverData)
        .eq('id', existing.id);
      if (!result.error) updated++;
    } else {
      // Insert new
      result = await supabase
        .from('servers')
        .insert(serverData);
      if (!result.error) inserted++;
    }

    if (result.error) {
      console.error(`Error for ${server.name}:`, result.error.message);
      errors++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
}

// Run the scraper
scrapeHytaleOnlineServers()
  .then(() => {
    console.log('\nScraping complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });
