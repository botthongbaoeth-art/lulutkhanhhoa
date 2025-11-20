// reports.js - Đặt ngang hàng với index.html và quantri.html
// Thay thế 100% app.py, chạy trên Vercel Serverless

const STORAGE_KEY = "CUUHO_REPORTS_2025";
const MAX_REPORTS = 500;

let reports = [];

if (typeof localStorage === "undefined") {
  global.localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; }
  };
}

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) reports = JSON.parse(saved);
} catch (e) { reports = []; }

export const config = { api: { bodyParser: true } };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const isAdmin = req.url.includes('admin=true');
    const data = isAdmin ? reports : reports.map(r => { const {ip,id,...x} = r; return x; });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const newReport = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleString('vi-VN'),
      ip: req.headers['x-forwarded-for']?.split(',')[0] || 'hidden',
      type: ['victim','rescue','warning'].includes(body.type) ? body.type : 'victim',
      ...body
    };
    reports.unshift(newReport);
    if (reports.length > MAX_REPORTS) reports.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    const {ip, ...safe} = newReport;
    return res.status(200).json({ success: true, report: safe });
  }

  if (req.method === 'DELETE') {
    const id = parseFloat(req.url.split('/').pop());
    const before = reports.length;
    reports = reports.filter(r => r.id !== id);
    if (reports.length < before) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      return res.status(200).json({ success: true });
    }
    return res.status(404).json({ error: 'Not found' });
  }

  res.status(405).end();
}
