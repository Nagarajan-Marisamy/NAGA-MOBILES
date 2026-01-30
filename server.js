import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      version: 1,
      updatedAt: new Date().toISOString(),
      products: [
        { id: '1', name: 'Wired Earphones', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&fit=crop' },
        { id: '2', name: 'Wired Earphones High Quality', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&fit=crop' },
        { id: '3', name: 'Mobile', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&fit=crop' },
        { id: '4', name: 'Remote', imageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&fit=crop' },
        { id: '5', name: 'Charger', imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f5ff1f8?w=800&fit=crop' },
        { id: '6', name: 'Temper', imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800&fit=crop' },
        { id: '7', name: 'Pouch', imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&fit=crop' }
      ],
      invoices: [],
      sales: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(next) {
  next.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(next, null, 2), 'utf-8');
}

function invoiceId() {
  return `INV-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('invalid json')); }
    });
  });
}

function serveStatic(reqUrlPath, res) {
  // Prevent path traversal
  const safePath = path.normalize(reqUrlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(__dirname)) return false;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;

  const ext = path.extname(filePath).toLowerCase();
  const type = ({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  })[ext] || 'application/octet-stream';

  const buf = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length });
  res.end(buf);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  try {
    // Health
    if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, { ok: true });

    // Products
    if (req.method === 'GET' && pathname === '/api/products') {
      const db = readDb();
      return sendJson(res, 200, db.products);
    }

    if (req.method === 'POST' && pathname === '/api/products') {
      const body = await readBody(req);
      const { name, imageUrl } = body || {};
      if (!name || !String(name).trim()) return sendJson(res, 400, { error: 'name required' });
      if (!imageUrl || !String(imageUrl).trim()) return sendJson(res, 400, { error: 'imageUrl required' });
      const db = readDb();
      const product = { id: String(Date.now()) + Math.random().toString(36).slice(2, 9), name: String(name).trim(), imageUrl: String(imageUrl).trim() };
      db.products.push(product);
      writeDb(db);
      return sendJson(res, 201, product);
    }

    if ((req.method === 'PUT' || req.method === 'DELETE') && pathname.startsWith('/api/products/')) {
      const id = pathname.split('/').pop();
      const db = readDb();
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'not found' });

      if (req.method === 'DELETE') {
        db.products.splice(idx, 1);
        writeDb(db);
        return sendJson(res, 200, { ok: true });
      }

      const body = await readBody(req);
      const { name, imageUrl } = body || {};
      if (typeof name === 'string' && name.trim()) db.products[idx].name = name.trim();
      if (typeof imageUrl === 'string' && imageUrl.trim()) db.products[idx].imageUrl = imageUrl.trim();
      writeDb(db);
      return sendJson(res, 200, db.products[idx]);
    }

    // Invoices
    if (req.method === 'POST' && pathname === '/api/invoices') {
      const body = await readBody(req);
      const { items } = body || {};
      if (!Array.isArray(items) || items.length === 0) return sendJson(res, 400, { error: 'items required' });
      for (const it of items) {
        if (!it || !it.productId || !it.productName) return sendJson(res, 400, { error: 'invalid item' });
        if (!(Number(it.quantity) > 0)) return sendJson(res, 400, { error: 'invalid quantity' });
        if (!(Number(it.price) > 0)) return sendJson(res, 400, { error: 'invalid price' });
      }
      const total = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
      const date = new Date().toISOString();
      const inv = { id: invoiceId(), date, items, total };
      const db = readDb();
      db.invoices.push(inv);
      db.sales.push({ invoiceId: inv.id, date, items, total });
      writeDb(db);
      return sendJson(res, 201, inv);
    }

    // Reports
    if (req.method === 'GET' && pathname === '/api/reports/daily') {
      const date = String(url.searchParams.get('date') || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendJson(res, 400, { error: 'date=YYYY-MM-DD required' });
      const db = readDb();
      const sales = db.sales.filter((s) => String(s.date).startsWith(date));
      const map = new Map();
      for (const sale of sales) for (const it of sale.items) {
        const key = it.productName;
        const cur = map.get(key) || { productName: key, quantity: 0, revenue: 0 };
        cur.quantity += Number(it.quantity);
        cur.revenue += Number(it.price) * Number(it.quantity);
        map.set(key, cur);
      }
      const items = Array.from(map.values());
      const totalRevenue = items.reduce((s, it) => s + it.revenue, 0);
      return sendJson(res, 200, { date, items, totalRevenue });
    }

    if (req.method === 'GET' && pathname === '/api/reports/monthly') {
      const year = Number(url.searchParams.get('year'));
      const month = Number(url.searchParams.get('month'));
      if (!(year >= 2000 && year <= 2100)) return sendJson(res, 400, { error: 'year required' });
      if (!(month >= 1 && month <= 12)) return sendJson(res, 400, { error: 'month 1-12 required' });
      const monthStr = String(month).padStart(2, '0');
      const prefix = `${year}-${monthStr}`;
      const db = readDb();
      const sales = db.sales.filter((s) => String(s.date).startsWith(prefix));
      const map = new Map();
      for (const sale of sales) for (const it of sale.items) {
        const key = it.productName;
        const cur = map.get(key) || { productName: key, quantity: 0, revenue: 0 };
        cur.quantity += Number(it.quantity);
        cur.revenue += Number(it.price) * Number(it.quantity);
        map.set(key, cur);
      }
      const items = Array.from(map.values());
      const totalRevenue = items.reduce((s, it) => s + it.revenue, 0);
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return sendJson(res, 200, { month: monthNames[month - 1], year, items, totalRevenue });
    }

    // Static files
    if (req.method === 'GET' && serveStatic(pathname, res)) return;
    if (req.method === 'GET' && serveStatic('/index.html', res)) return;
    return sendJson(res, 404, { error: 'not found' });
  } catch (e) {
    return sendJson(res, 500, { error: String(e.message || e) });
  }
});

ensureDb();
server.listen(PORT, () => {
  console.log(`NAGA MOBILES server running on http://localhost:${PORT}`);
});

