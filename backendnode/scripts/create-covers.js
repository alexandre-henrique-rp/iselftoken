const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('data/iselftoken.db');
const secret = process.env.APP_SECRET || 'dev-secret-change-in-prod';

function makePresignedUrl(key) {
  const bucket = 'image';
  const ttl = 315360000; // 10 anos
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${bucket}/${key}:${expires}`;
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `https://api.iselftoken.com/api/files/${bucket}/${key}?token=${token}&expires=${expires}`;
}

const covers = [
  { slug: 'techinnovate', key: 'seed/techinnovate/cover.jpg', name: 'cover-techinnovate' },
  { slug: 'greenenergy', key: 'seed/greenenergy/cover.jpg', name: 'cover-greenenergy' },
  { slug: 'fintechpro', key: 'seed/fintechpro/cover.jpg', name: 'cover-fintechpro' },
];

for (const c of covers) {
  const startup = db.prepare("SELECT id, cover_id FROM startups WHERE slug = ?").get(c.slug);
  if (!startup) { console.log(`⚠️  ${c.slug}: startup not found`); continue; }

  const url = makePresignedUrl(c.key);
  const data = {
    originalName: `${c.name}.jpg`,
    size: 80000,
    mineType: 'image/jpeg',
    extension: 'jpg',
    url,
    url_sm: url,
    url_md: url,
    url_lg: url,
    status: 'APPROVED',
  };

  if (startup.cover_id) {
    db.prepare('UPDATE "KYCProfile" SET url = ?, url_sm = ?, url_md = ?, url_lg = ? WHERE id = ?')
      .run(url, url, url, url, startup.cover_id);
    console.log(`✅ ${c.slug}: updated existing cover #${startup.cover_id}`);
  } else {
    const now = new Date().toISOString();
    const result = db.prepare('INSERT INTO "KYCProfile" (originalName, size, mineType, extension, url, url_sm, url_md, url_lg, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(data.originalName, data.size, data.mineType, data.extension, data.url, data.url_sm, data.url_md, data.url_lg, data.status, now, now);
    db.prepare("UPDATE startups SET cover_id = ? WHERE id = ?").run(result.lastInsertRowid, startup.id);
    console.log(`✅ ${c.slug}: created cover #${result.lastInsertRowid} and linked`);
  }
}

db.close();
