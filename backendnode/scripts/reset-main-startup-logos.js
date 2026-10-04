const Database = require('better-sqlite3');
const db = new Database('data/iselftoken.db');

const slugs = ['techinnovate', 'greenenergy', 'fintechpro'];

for (const slug of slugs) {
  const startup = db.prepare('SELECT id, logo_id, cover_id FROM startups WHERE slug = ?').get(slug);
  if (!startup) {
    console.log(`⚠️  ${slug}: startup not found`);
    continue;
  }

  // Delete old KYCProfiles and unlink from startup
  if (startup.logo_id) {
    db.prepare('DELETE FROM "KYCProfile" WHERE id = ?').run(startup.logo_id);
    console.log(`🗑️  ${slug}: deleted old logo KYCProfile #${startup.logo_id}`);
  }
  if (startup.cover_id) {
    db.prepare('DELETE FROM "KYCProfile" WHERE id = ?').run(startup.cover_id);
    console.log(`🗑️  ${slug}: deleted old cover KYCProfile #${startup.cover_id}`);
  }
  db.prepare('UPDATE startups SET logo_id = NULL, cover_id = NULL WHERE id = ?').run(startup.id);
  console.log(`✅ ${slug}: unlinked logo/cover from startup`);
}

db.close();
console.log('\n🔄 Done. Re-run seed to recreate with local assets.');
