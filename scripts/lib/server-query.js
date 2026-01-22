// Multi-protocol server query system
// Supports HyQuery, Minecraft SLP, Source A2S, and raw connectivity

const dgram = require('dgram');
const net = require('net');

const DEFAULT_TIMEOUT = 400; // ms per protocol

/**
 * Unified query result
 * @typedef {Object} QueryResult
 * @property {boolean} online - Whether the server is reachable
 * @property {string|null} protocol - Which protocol succeeded
 * @property {{online: number|null, max: number|null}|null} players - Player counts
 * @property {string|null} motd - Message of the day
 * @property {string|null} version - Server version
 */

/**
 * Create an empty/offline result
 * @returns {QueryResult}
 */
function offlineResult() {
  return {
    online: false,
    protocol: null,
    players: null,
    motd: null,
    version: null
  };
}

/**
 * Create a connectivity-only result
 * @returns {QueryResult}
 */
function connectivityResult() {
  return {
    online: true,
    protocol: 'connectivity',
    players: null,
    motd: null,
    version: null
  };
}

// ============================================
// PROTOCOL: HyQuery (Custom Hytale UDP Protocol)
// ============================================

/**
 * Query server using HyQuery protocol
 * HyQuery is a simple UDP query protocol used by Hytale community servers
 * Request: Magic bytes + query type
 * Response: JSON or binary data with server info
 */
async function queryHyQuery(host, port, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      socket.close();
      resolve(null);
    }, timeout);

    socket.on('error', () => {
      clearTimeout(timer);
      socket.close();
      resolve(null);
    });

    socket.on('message', (msg) => {
      clearTimeout(timer);
      socket.close();

      try {
        // HyQuery response format:
        // Byte 0: Response type (0x00 = info)
        // Bytes 1-4: Online players (uint32 BE)
        // Bytes 5-8: Max players (uint32 BE)
        // Bytes 9+: Null-terminated strings (MOTD, version)

        if (msg.length < 9) {
          resolve(null);
          return;
        }

        const responseType = msg.readUInt8(0);

        // Check for JSON response (some servers return JSON)
        if (responseType === 0x7B) { // '{' character
          try {
            const json = JSON.parse(msg.toString('utf8'));
            resolve({
              online: true,
              protocol: 'hyquery',
              players: {
                online: json.players?.online ?? json.online ?? null,
                max: json.players?.max ?? json.max ?? null
              },
              motd: json.motd ?? json.description ?? null,
              version: json.version ?? null
            });
            return;
          } catch {
            // Not valid JSON, try binary
          }
        }

        // Binary format
        if (responseType === 0x00 && msg.length >= 9) {
          const onlinePlayers = msg.readUInt32BE(1);
          const maxPlayers = msg.readUInt32BE(5);

          // Parse null-terminated strings
          let offset = 9;
          const strings = [];
          while (offset < msg.length && strings.length < 2) {
            const end = msg.indexOf(0x00, offset);
            if (end === -1) break;
            strings.push(msg.toString('utf8', offset, end));
            offset = end + 1;
          }

          resolve({
            online: true,
            protocol: 'hyquery',
            players: {
              online: onlinePlayers,
              max: maxPlayers
            },
            motd: strings[0] || null,
            version: strings[1] || null
          });
          return;
        }

        resolve(null);
      } catch {
        resolve(null);
      }
    });

    // HyQuery request packet
    // Magic: "HYQUERY" + Query type (0x00 = status)
    const request = Buffer.from([
      0x48, 0x59, 0x51, 0x55, 0x45, 0x52, 0x59, // "HYQUERY"
      0x00 // Query type: status
    ]);

    socket.send(request, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        socket.close();
        resolve(null);
      }
    });
  });
}

// ============================================
// PROTOCOL: Minecraft Server List Ping (TCP)
// ============================================

/**
 * Query server using Minecraft Server List Ping protocol
 * Used by many game servers for compatibility
 */
async function queryMinecraftSLP(host, port, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let buffer = Buffer.alloc(0);

    const timer = setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, timeout);

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(null);
    });

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);

      try {
        // Read packet length (varint)
        let offset = 0;
        let packetLength = 0;
        let shift = 0;

        while (offset < buffer.length) {
          const byte = buffer[offset++];
          packetLength |= (byte & 0x7F) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }

        if (buffer.length < offset + packetLength) return; // Need more data

        // Read packet ID
        const packetId = buffer[offset++];
        if (packetId !== 0x00) {
          clearTimeout(timer);
          socket.destroy();
          resolve(null);
          return;
        }

        // Read JSON length (varint)
        let jsonLength = 0;
        shift = 0;
        while (offset < buffer.length) {
          const byte = buffer[offset++];
          jsonLength |= (byte & 0x7F) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }

        const jsonStr = buffer.toString('utf8', offset, offset + jsonLength);
        const json = JSON.parse(jsonStr);

        clearTimeout(timer);
        socket.destroy();

        resolve({
          online: true,
          protocol: 'minecraft-slp',
          players: {
            online: json.players?.online ?? null,
            max: json.players?.max ?? null
          },
          motd: typeof json.description === 'string'
            ? json.description
            : json.description?.text ?? null,
          version: json.version?.name ?? null
        });
      } catch {
        // Need more data or parse error
      }
    });

    socket.on('connect', () => {
      // Build handshake packet
      const hostBuffer = Buffer.from(host, 'utf8');
      const handshakeData = Buffer.concat([
        Buffer.from([0x00]), // Packet ID
        Buffer.from([0xFF, 0x05]), // Protocol version (varint: 765)
        Buffer.from([hostBuffer.length]), // Host length (varint)
        hostBuffer,
        Buffer.from([(port >> 8) & 0xFF, port & 0xFF]), // Port (unsigned short)
        Buffer.from([0x01]) // Next state: status
      ]);

      const handshakePacket = Buffer.concat([
        Buffer.from([handshakeData.length]), // Packet length (varint)
        handshakeData
      ]);

      // Status request packet
      const statusRequest = Buffer.from([0x01, 0x00]); // Length, Packet ID

      socket.write(Buffer.concat([handshakePacket, statusRequest]));
    });

    socket.connect(port, host);
  });
}

// ============================================
// PROTOCOL: Source Engine A2S Query (UDP)
// ============================================

/**
 * Query server using Source Engine A2S_INFO protocol
 * Common in many game servers
 */
async function querySourceA2S(host, port, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');

    const timer = setTimeout(() => {
      socket.close();
      resolve(null);
    }, timeout);

    socket.on('error', () => {
      clearTimeout(timer);
      socket.close();
      resolve(null);
    });

    socket.on('message', (msg) => {
      clearTimeout(timer);
      socket.close();

      try {
        // Check header
        if (msg.length < 5 || msg.readInt32LE(0) !== -1) {
          resolve(null);
          return;
        }

        const header = msg.readUInt8(4);

        // A2S_INFO response (0x49 = 'I')
        if (header === 0x49 && msg.length > 5) {
          let offset = 5;

          // Skip protocol
          offset += 1;

          // Read null-terminated strings
          const readString = () => {
            const end = msg.indexOf(0x00, offset);
            if (end === -1) return null;
            const str = msg.toString('utf8', offset, end);
            offset = end + 1;
            return str;
          };

          const serverName = readString(); // Server name
          readString(); // Map
          readString(); // Folder
          readString(); // Game

          // Skip steam app id
          offset += 2;

          if (offset + 2 > msg.length) {
            resolve(null);
            return;
          }

          const players = msg.readUInt8(offset);
          const maxPlayers = msg.readUInt8(offset + 1);

          resolve({
            online: true,
            protocol: 'source-a2s',
            players: {
              online: players,
              max: maxPlayers
            },
            motd: serverName,
            version: null
          });
          return;
        }

        // Challenge response - need to resend with challenge
        if (header === 0x41 && msg.length >= 9) {
          // For simplicity, we don't handle challenge-response
          // Most servers respond directly
          resolve(null);
          return;
        }

        resolve(null);
      } catch {
        resolve(null);
      }
    });

    // A2S_INFO request
    // Header: 0xFF 0xFF 0xFF 0xFF
    // Type: 0x54 ('T')
    // Payload: "Source Engine Query\0"
    const request = Buffer.from([
      0xFF, 0xFF, 0xFF, 0xFF,
      0x54, // 'T' - A2S_INFO
      0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20, // "Source "
      0x45, 0x6E, 0x67, 0x69, 0x6E, 0x65, 0x20, // "Engine "
      0x51, 0x75, 0x65, 0x72, 0x79, 0x00 // "Query\0"
    ]);

    socket.send(request, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        socket.close();
        resolve(null);
      }
    });
  });
}

// ============================================
// PROTOCOL: Raw Connectivity Check
// ============================================

/**
 * Simple TCP connectivity check
 * Last resort - only determines online/offline
 */
async function checkTCPConnectivity(host, port, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Simple UDP connectivity check
 * Sends a packet and waits for any response
 */
async function checkUDPConnectivity(host, port, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');

    const timer = setTimeout(() => {
      socket.close();
      resolve(false);
    }, timeout);

    socket.on('error', () => {
      clearTimeout(timer);
      socket.close();
      resolve(false);
    });

    socket.on('message', () => {
      clearTimeout(timer);
      socket.close();
      resolve(true);
    });

    // Send a generic ping
    const ping = Buffer.from([0x00]);
    socket.send(ping, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        socket.close();
        resolve(false);
      }
    });
  });
}

// ============================================
// MAIN QUERY FUNCTION
// ============================================

/**
 * Protocol handlers in fallback order
 */
const PROTOCOL_HANDLERS = [
  { name: 'hyquery', handler: queryHyQuery },
  { name: 'minecraft-slp', handler: queryMinecraftSLP },
  { name: 'source-a2s', handler: querySourceA2S }
];

/**
 * Query a server using multiple protocols with fallback
 * @param {string} host - Server hostname or IP
 * @param {number} port - Server port
 * @param {number} timeout - Timeout per protocol in ms
 * @returns {Promise<QueryResult>}
 */
async function queryServer(host, port = 25565, timeout = DEFAULT_TIMEOUT) {
  // Clean the host
  const cleanHost = host.replace(/^https?:\/\//, '').split('/')[0];

  // Try each protocol in order
  for (const { name, handler } of PROTOCOL_HANDLERS) {
    try {
      const result = await handler(cleanHost, port, timeout);
      if (result && result.online) {
        return result;
      }
    } catch (err) {
      // Protocol failed, try next
      console.debug(`Protocol ${name} failed for ${cleanHost}:${port}:`, err.message);
    }
  }

  // All rich protocols failed, try raw connectivity
  const tcpOnline = await checkTCPConnectivity(cleanHost, port, timeout);
  if (tcpOnline) {
    return connectivityResult();
  }

  const udpOnline = await checkUDPConnectivity(cleanHost, port, timeout);
  if (udpOnline) {
    return connectivityResult();
  }

  // Server is offline
  return offlineResult();
}

/**
 * Query multiple servers concurrently
 * @param {Array<{host: string, port: number}>} servers
 * @param {number} concurrency - Max concurrent queries
 * @param {number} timeout - Timeout per protocol
 * @returns {Promise<Map<string, QueryResult>>}
 */
async function queryServers(servers, concurrency = 10, timeout = DEFAULT_TIMEOUT) {
  const results = new Map();
  const queue = [...servers];

  async function worker() {
    while (queue.length > 0) {
      const server = queue.shift();
      if (!server) break;

      const key = `${server.host}:${server.port}`;
      const result = await queryServer(server.host, server.port, timeout);
      results.set(key, result);
    }
  }

  // Start workers
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, servers.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

module.exports = {
  queryServer,
  queryServers,
  queryHyQuery,
  queryMinecraftSLP,
  querySourceA2S,
  checkTCPConnectivity,
  checkUDPConnectivity,
  offlineResult,
  connectivityResult
};
