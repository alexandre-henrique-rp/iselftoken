const Database = require('better-sqlite3');
const db = new Database('data/iselftoken.db');

const rows = db.prepare(
  "SELECT s.slug, k.url, k.originalName FROM startups s JOIN \"KYCProfile\" k ON s.logo_id = k.id WHERE s.slug IN ('techinnovate', 'greenenergy', 'fintechpro')"
).all();
rows.forEach(r => console.log(r.slug, r.url));

db.close();
