// api/index.js - PHIÊN BẢN 2025 HOÀN CHỈNH - KHÔNG XÓA BÁO CÁO NẠN NHÂN NỮA!
const STORAGE_KEY = "CUUHO_REPORTS_2025";
const MAX_REPORTS = 1000; // Tăng lên để lưu lâu dài
let reports = [];

// Giả lập localStorage cho Vercel
if (typeof localStorage === "undefined") {
  global.localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; }
  };
}

// Load dữ liệu cũ
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) reports = JSON.parse(saved);
} catch (e) { reports = []; }

// TỰ ĐỘNG ĐÁNH DẤU "ĐÃ XỬ LÝ" CHO BÁO CÁO CẦN CỨU SAU 30 PHÚT
function autoMarkResolved() {
  const now = Date.now();
  let updated = false;
  reports.forEach(report => {
    if ((report.type === 'victim' || !report.type) && !report.resolved) {
      const age = now - new Date(report.timestamp).getTime();
      if (age > 30 * 60 * 1000) { // Quá 30 phút
        report.resolved = true;
        report.resolvedAt = new Date().toLocaleString('vi-VN');
        updated = true;
      }
    }
  });
  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }
}

export const config = { api: { bodyParser: true } };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // TỰ ĐỘNG CHẠY MỖI LẦN CÓ REQUEST ĐẾN (rất hiệu quả trên Vercel)
  autoMarkResolved();

  if (req.method === 'GET') {
    const isAdmin = req.url.includes('admin=true') || req.query.admin === 'true';
    const data = isAdmin ? reports : reports.map(r => {
      const { ip, id, ...x } = r;
      return x;
    });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Đảm bảo có tọa độ
    if (!body.lat || !body.lng) {
      body.lat = 12.24;
      body.lng = 109.19;
    }

    const newReport = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(), // Dùng ISO để dễ tính toán
      displayTime: new Date().toLocaleString('vi-VN'),
      ip: req.headers['x-forwarded-for']?.split(',')[0] || 'hidden',
      type: ['victim','rescue','warning'].includes(body.type) ? body.type : 'victim',
      resolved: false, // Mới tạo thì chưa xử lý
      ...body
    };

    reports.unshift(newReport);

    // Chỉ cắt bớt nếu quá nhiều (giữ lại 1000 báo cáo)
    if (reports.length > MAX_REPORTS) {
      reports = reports.slice(0, MAX_REPORTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    
    const { ip, ...safe } = newReport;
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
