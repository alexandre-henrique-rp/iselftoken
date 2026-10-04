const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('data/iselftoken.db');
const secret = process.env.APP_SECRET || 'dev-secret-change-in-prod';

const logo = db.prepare("SELECT id FROM \"KYCProfile\" WHERE originalName LIKE '%fintechpro%'").get();
if (logo) {
  const key = 'seed/fintechpro/logo.png';
  const bucket = 'image';
  const ttl = 315360000;
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${bucket}/${key}:${expires}`;
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const url = `https://api.iselftoken.com/api/files/${bucket}/${key}?token=${token}&expires=${expires}`;
  db.prepare("UPDATE \"KYCProfile\" SET url = ?, url_sm = ?, url_md = ?, url_lg = ?, extension = 'png', mineType = 'image/png' WHERE id = ?").run(url, url, url, url, logo.id);
  console.log(`✅ Updated fintechpro URL: ${url.substring(0, 100)}`);
} else {
  console.log('⚠️  fintechpro logo not found');
}
db.close();
