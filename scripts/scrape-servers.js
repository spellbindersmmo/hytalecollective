// Simple server scraper script
// Run with: node scripts/scrape-servers.js

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables!');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cache of existing tags by slug
let tagCache = {};

function generateSlug(name, externalId) {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  return `${baseSlug}-${externalId}`;
}

function normalizeTagSlug(typeName) {
  return typeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Tag color based on category
function getTagColor(slug) {
  const colors = {
    'pvp': '#e74c3c',
    'pve': '#27ae60',
    'survival': '#2ecc71',
    'creative': '#9b59b6',
    'economy': '#f39c12',
    'mini-games': '#3498db',
    'minigames': '#3498db',
    'factions': '#e67e22',
    'skyblock': '#1abc9c',
    'vanilla': '#95a5a6',
    'hardcore': '#c0392b',
    'roleplay': '#8e44ad',
    'towny': '#16a085',
    'mmo': '#2980b9',
    'mcmmo': '#2980b9',
    'kitpvp': '#d35400'
  };
  return colors[slug] || '#6bb8cc';
}

async function loadExistingTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('id, slug, name');

  if (error) {
    console.error('Error loading tags:', error.message);
    return;
  }

  tagCache = {};
  for (const tag of data) {
    tagCache[tag.slug] = tag;
  }
  console.log(`Loaded ${data.length} existing tags`);
}

async function getOrCreateTag(typeName) {
  const slug = normalizeTagSlug(typeName);
  if (!slug) return null;

  // Check cache first
  if (tagCache[slug]) {
    return tagCache[slug].id;
  }

  // Create new tag
  const { data, error } = await supabase
    .from('tags')
    .insert({
      name: typeName.trim(),
      slug: slug,
      color: getTagColor(slug)
    })
    .select('id, slug, name')
    .single();

  if (error) {
    // Might be a duplicate, try to fetch it
    const { data: existing } = await supabase
      .from('tags')
      .select('id, slug, name')
      .eq('slug', slug)
      .single();

    if (existing) {
      tagCache[slug] = existing;
      return existing.id;
    }
    console.error(`Error creating tag ${typeName}:`, error.message);
    return null;
  }

  tagCache[slug] = data;
  console.log(`  Created new tag: ${typeName} (${slug})`);
  return data.id;
}

async function updateServerTags(serverId, types) {
  if (!types) return;

  // Parse types string into array
  const typeList = types.split(',').map(t => t.trim()).filter(t => t);
  if (typeList.length === 0) return;

  // Delete existing tags for this server
  await supabase
    .from('server_tags')
    .delete()
    .eq('server_id', serverId);

  // Get or create tag IDs
  const tagIds = [];
  for (const typeName of typeList) {
    const tagId = await getOrCreateTag(typeName);
    if (tagId) {
      tagIds.push(tagId);
    }
  }

  if (tagIds.length === 0) return;

  // Insert new server_tags entries
  const inserts = tagIds.map(tagId => ({
    server_id: serverId,
    tag_id: tagId
  }));

  const { error } = await supabase
    .from('server_tags')
    .insert(inserts);

  if (error) {
    console.error(`  Error inserting tags for server ${serverId}:`, error.message);
  }
}

async function scrapeHytaleOnlineServers() {
  console.log('Fetching servers from hytaleonlineservers.com...');

  // Load existing tags into cache
  await loadExistingTags();

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
  let tagsUpdated = 0;

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

    let serverId = existing?.id;
    let result;

    if (existing) {
      // Update existing
      result = await supabase
        .from('servers')
        .update(serverData)
        .eq('id', existing.id);
      if (!result.error) updated++;
    } else {
      // Insert new and get the ID
      result = await supabase
        .from('servers')
        .insert(serverData)
        .select('id')
        .single();
      if (!result.error) {
        inserted++;
        serverId = result.data.id;
      }
    }

    if (result.error) {
      console.error(`Error for ${server.name}:`, result.error.message);
      errors++;
      continue;
    }

    // Update tags for this server using the types field from API
    if (serverId && server.types) {
      await updateServerTags(serverId, server.types);
      tagsUpdated++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Tags updated: ${tagsUpdated}`);
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
