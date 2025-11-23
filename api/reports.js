// pages/api/reports.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 500');
      const isAdmin = req.query.admin === 'true';
      const data = isAdmin ? rows : rows.map(r => {
        const { id, name, phone, victim, rescue, food, medicine, lat, lng, address, status, priority, images, created_at } = r;
        return { id, name, phone, victim, rescue, food, medicine, lat, lng, address, status, priority, images, created_at };
      });
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const {
        name = '',
        phone = '',
        victim = '',
        rescue = '',
        food = '',
        medicine = '',
        lat = null,
        lng = null,
        address = '',
        status = '',
        priority = 0,
        images = []
      } = body;

      const created_at = new Date().toISOString();

      const insertQuery = `
        INSERT INTO messages 
        (name, phone, victim, rescue, food, medicine, lat, lng, address, status, priority, images, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
      `;

      const values = [name, phone, victim, rescue, food, medicine, lat, lng, address, status, priority, images, created_at];
      const { rows } = await pool.query(insertQuery, values);

      const report = rows[0];
      return res.status(200).json({ success: true, report });
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { rowCount } = await pool.query('DELETE FROM messages WHERE id=$1', [id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ success: true });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
