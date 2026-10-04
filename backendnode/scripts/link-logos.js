const Database = require('better-sqlite3');
const db = new Database('data/iselftoken.db');

const mappings = [
  { startup: 'techinnovate', originalName: 'logo-techinnovate' },
  { startup: 'greenenergy', originalName: 'logo-greenenergy' },
  { startup: 'fintechpro', originalName: 'logo-fintechpro' },
];

for (const m of mappings) {
  const startup = db.prepare("SELECT id FROM startups WHERE slug = ?").get(m.startup);
  if (!startup) { console.log(`⚠️  ${m.startup}: startup not found`); continue; }

  const logo = db.prepare('SELECT id FROM "KYCProfile" WHERE originalName LIKE ?').get(`%${m.originalName}%`);
  if (!logo) { console.log(`⚠️  ${m.startup}: logo KYCProfile not found`); continue; }

  db.prepare("UPDATE startups SET logo_id = ? WHERE id = ?").run(logo.id, startup.id);
  console.log(`✅ ${m.startup}: linked logo_id=${logo.id} to startup_id=${startup.id}`);
}

db.close();
