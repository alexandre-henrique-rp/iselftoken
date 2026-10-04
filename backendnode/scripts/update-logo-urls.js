const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('data/iselftoken.db');
const secret = process.env.APP_SECRET || 'dev-secret-change-in-prod';

const slugs = ['techinnovate', 'greenenergy', 'fintechpro'];

for (const slug of slugs) {
  const logo = db.prepare(
    'SELECT k.id FROM startups s JOIN "KYCProfile" k ON s.logo_id = k.id WHERE s.slug = ?'
  ).get(slug);

  if (!logo) {
    console.log(`⚠️  ${slug}: logo not found in DB`);
    continue;
  }

  const key = `seed/${slug}.jpg`;
  const bucket = 'image';
  const ttl = 315360000; // 10 anos
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${bucket}/${key}:${expires}`;
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const url = `https://api.iselftoken.com/api/files/${bucket}/${key}?token=${token}&expires=${expires}`;

  db.prepare(
    'UPDATE "KYCProfile" SET url = ?, url_sm = ?, url_md = ?, url_lg = ? WHERE id = ?'
  ).run(url, url, url, url, logo.id);

  console.log(`✅ ${slug}: ${url.substring(0, 80)}...`);
}

db.close();
