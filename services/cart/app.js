const http = require('http');

// Simulate a cart store (in prod this would be Redis)
const cartStore = new Map();

const routes = {
  'GET /health': (req, res) => {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'cart',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }));
  },
  'GET /items': (req, res) => {
    const userId = req.headers['x-user-id'] || 'default';
    res.writeHead(200);
    res.end(JSON.stringify({
      userId,
      items: cartStore.get(userId) || [],
      count: (cartStore.get(userId) || []).length
    }));
  },
  'POST /add': (req, res) => {
    const userId = req.headers['x-user-id'] || 'default';
    const items = cartStore.get(userId) || [];
    items.push({ id: Date.now(), name: 'Product', addedAt: new Date().toISOString() });
    cartStore.set(userId, items);
    res.writeHead(201);
    res.end(JSON.stringify({ message: 'Added', total: items.length }));
  }
};

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Service', 'cart-v1');
  const handler = routes[`${req.method} ${req.url}`];
  if (handler) {
    handler(req, res);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Graceful shutdown — critical for Kubernetes
const shutdown = (signal) => {
  console.log(`Received ${signal}. Graceful shutdown start.`);
  server.close(() => {
    console.log('HTTP server closed. Exiting.');
    process.exit(0);
  });
  // Force exit after 30s if server doesn't close
  setTimeout(() => process.exit(1), 30000);
};
process.on('SIGTERM', () => shutdown('SIGTERM')); // Kubernetes sends this
process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C sends this

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Cart service on :${PORT}`));
