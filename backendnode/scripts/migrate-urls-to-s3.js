// migrate-urls-to-s3.js — Migra URLs de KYCProfile de /api/files para S3 presigned
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Database = require('better-sqlite3');

const db = new Database('data/iselftoken.db');
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'sa-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PREFIX = 'iselftoken-prod';
const BUCKET_MAP = {
  'image': `${PREFIX}-image`,
  'image-sm': `${PREFIX}-image-sm`,
  'image-md': `${PREFIX}-image-md`,
  'document': `${PREFIX}-document`,
  'comprovante': `${PREFIX}-comprovante`,
};

async function migrateUrl(oldUrl) {
  if (!oldUrl || !oldUrl.includes('/api/files/')) return oldUrl;
  
  try {
    const urlObj = new URL(oldUrl);
    const pathMatch = urlObj.pathname.match(/\/api\/files\/([^/]+)\/(.+)/);
    if (!pathMatch) return oldUrl;
    
    const bucket = pathMatch[1];
    const key = pathMatch[2];
    const s3Bucket = BUCKET_MAP[bucket] || `${PREFIX}-${bucket}`;
    
    const presigned = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: s3Bucket, Key: key }),
      { expiresIn: 604800 },
    );
    return presigned;
  } catch (e) {
    console.error('Failed to migrate URL:', oldUrl, e.message);
    return oldUrl;
  }
}

async function main() {
  const profiles = db.prepare('SELECT id, url, url_sm, url_md, url_lg FROM "KYCProfile"').all();
  console.log(`Migrating ${profiles.length} KYCProfile URLs...`);
  
  let migrated = 0;
  for (const p of profiles) {
    const newUrl = await migrateUrl(p.url);
    const newUrlSm = await migrateUrl(p.url_sm);
    const newUrlMd = await migrateUrl(p.url_md);
    const newUrlLg = await migrateUrl(p.url_lg);
    
    if (newUrl !== p.url || newUrlSm !== p.url_sm) {
      db.prepare('UPDATE "KYCProfile" SET url=?, url_sm=?, url_md=?, url_lg=? WHERE id=?')
        .run(newUrl, newUrlSm, newUrlMd, newUrlLg, p.id);
      migrated++;
    }
  }
  
  console.log(`Migrated ${migrated}/${profiles.length} profiles`);
  db.close();
}

main().catch(console.error);
