const Database = require('better-sqlite3');
const db = new Database('data/iselftoken.db');

const rows = db.prepare(
  "SELECT slug, logo_id, cover_id FROM startups WHERE slug IN ('techinnovate', 'greenenergy', 'fintechpro')"
).all();
rows.forEach(r => console.log(r.slug, 'logo_id:', r.logo_id, 'cover_id:', r.cover_id));

console.log('\n--- All startup logo URLs ---');
const all = db.prepare(
  "SELECT s.slug, k.url, k.originalName FROM startups s JOIN \"KYCProfile\" k ON s.logo_id = k.id ORDER BY s.slug LIMIT 5"
).all();
all.forEach(r => console.log(r.slug, r.originalName, r.url?.substring(0, 120)));

db.close();
