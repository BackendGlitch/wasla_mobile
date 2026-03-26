/* eslint-disable no-console */
const { io } = require('socket.io-client');

const baseUrl = (process.env.BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const healthUrl = `${baseUrl}/health`;
const namespaceUrl = `${baseUrl}/realtime`;

async function main() {
  console.log('Wasla Mobile realtime test client');
  console.log('baseUrl:', baseUrl);
  console.log('healthUrl:', healthUrl);
  console.log('namespaceUrl:', namespaceUrl);

  try {
    const res = await fetch(healthUrl);
    console.log('GET /health ->', res.status);
  } catch (e) {
    console.log('GET /health failed:', e?.message || e);
  }

  const socket = io(namespaceUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: false,
  });

  const startedAt = Date.now();
  const t = () => `${((Date.now() - startedAt) / 1000).toFixed(2)}s`;

  socket.on('connect', () => console.log(t(), 'connect', socket.id));
  socket.on('disconnect', (reason) => console.log(t(), 'disconnect', reason));
  socket.on('connect_error', (err) => console.log(t(), 'connect_error', err?.message || err));
  socket.on('ready', (payload) => {
    console.log(t(), 'ready', payload);
    socket.emit('ping', { source: 'test-realtime-client', timestamp: Date.now() });
  });
  socket.on('pong', (payload) => {
    console.log(t(), 'pong', payload);
    socket.disconnect();
  });

  setTimeout(() => {
    console.log('Timeout reached; disconnecting.');
    socket.disconnect();
    process.exit(0);
  }, 15000);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

