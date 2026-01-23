// Test script for server query
// Usage: node scripts/test-server-query.js <host> [port]
// Example: node scripts/test-server-query.js play.hyfable.com 25565

import { queryServer, queryHytaleQueryPlugin, queryHyQuery, queryMinecraftSLP, querySourceA2S } from './lib/server-query.js';

const host = process.argv[2];
const port = parseInt(process.argv[3]) || 25565;

if (!host) {
  console.log('Usage: node scripts/test-server-query.js <host> [port]');
  console.log('Example: node scripts/test-server-query.js play.hyfable.com 25565');
  process.exit(1);
}

async function testServer() {
  console.log(`\nTesting server: ${host}:${port}`);
  console.log('═'.repeat(50));

  // Test each protocol individually
  console.log('\n1. Testing Hytale Query Plugin (HTTP on port+3)...');
  const hytaleQuery = await queryHytaleQueryPlugin(host, port, 2000);
  console.log('   Result:', hytaleQuery ? JSON.stringify(hytaleQuery, null, 2).replace(/\n/g, '\n   ') : 'No response');

  console.log('\n2. Testing HyQuery (UDP)...');
  const hyquery = await queryHyQuery(host, port, 500);
  console.log('   Result:', hyquery ? JSON.stringify(hyquery, null, 2).replace(/\n/g, '\n   ') : 'No response');

  console.log('\n3. Testing Minecraft SLP (TCP)...');
  const minecraft = await queryMinecraftSLP(host, port, 500);
  console.log('   Result:', minecraft ? JSON.stringify(minecraft, null, 2).replace(/\n/g, '\n   ') : 'No response');

  console.log('\n4. Testing Source A2S (UDP)...');
  const source = await querySourceA2S(host, port, 500);
  console.log('   Result:', source ? JSON.stringify(source, null, 2).replace(/\n/g, '\n   ') : 'No response');

  // Test combined query with fallback
  console.log('\n' + '═'.repeat(50));
  console.log('COMBINED QUERY (with fallback):');
  console.log('═'.repeat(50));

  const result = await queryServer(host, port);
  console.log(JSON.stringify(result, null, 2));
}

testServer()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
