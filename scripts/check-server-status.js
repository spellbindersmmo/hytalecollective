// Server status checker script
// Uses multi-protocol query system with fallback
// Run with: node scripts/check-server-status.js

const { createClient } = require('@supabase/supabase-js');
const { queryServer } = require('./lib/server-query.js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAllServers() {
  console.log('Fetching community servers to check...\n');

  // Get all community-submitted servers
  const { data: servers, error } = await supabase
    .from('servers')
    .select('id, name, ip_address, port, status, current_players, max_players')
    .eq('source', 'community');

  if (error) {
    console.error('Error fetching servers:', error);
    return;
  }

  if (!servers || servers.length === 0) {
    console.log('No community servers to check');
    return;
  }

  console.log(`Checking ${servers.length} servers...\n`);
  console.log('─'.repeat(70));

  const stats = {
    online: 0,
    offline: 0,
    withPlayerData: 0,
    protocols: {}
  };

  for (const server of servers) {
    const port = server.port || 25565;
    console.log(`\nQuerying: ${server.name} (${server.ip_address}:${port})`);

    const result = await queryServer(server.ip_address, port);

    // Track stats
    if (result.online) {
      stats.online++;
      if (result.protocol) {
        stats.protocols[result.protocol] = (stats.protocols[result.protocol] || 0) + 1;
      }
      if (result.players) {
        stats.withPlayerData++;
      }
    } else {
      stats.offline++;
    }

    // Log result
    if (result.online) {
      console.log(`  Status: ONLINE (via ${result.protocol})`);
      if (result.players) {
        console.log(`  Players: ${result.players.online ?? '?'}/${result.players.max ?? '?'}`);
      }
      if (result.motd) {
        console.log(`  MOTD: ${result.motd.substring(0, 50)}${result.motd.length > 50 ? '...' : ''}`);
      }
      if (result.version) {
        console.log(`  Version: ${result.version}`);
      }
    } else {
      console.log(`  Status: OFFLINE`);
    }

    // Build update object
    const update = {
      status: result.online ? 'online' : 'offline',
      last_ping_at: new Date().toISOString()
    };

    // Only update player counts if we have data
    if (result.players) {
      if (result.players.online !== null) {
        update.current_players = result.players.online;
      }
      if (result.players.max !== null) {
        update.max_players = result.players.max;
      }
    }

    // Update database
    const { error: updateError } = await supabase
      .from('servers')
      .update(update)
      .eq('id', server.id);

    if (updateError) {
      console.log(`  DB Error: ${updateError.message}`);
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(70));
  console.log('\nSUMMARY');
  console.log('─'.repeat(70));
  console.log(`Total servers checked: ${servers.length}`);
  console.log(`Online: ${stats.online}`);
  console.log(`Offline: ${stats.offline}`);
  console.log(`With player data: ${stats.withPlayerData}`);
  console.log('\nProtocols used:');
  for (const [protocol, count] of Object.entries(stats.protocols)) {
    console.log(`  ${protocol}: ${count}`);
  }
}

checkAllServers()
  .then(() => {
    console.log('\nStatus check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Status check failed:', error);
    process.exit(1);
  });
