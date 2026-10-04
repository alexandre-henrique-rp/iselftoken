import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SeedImageResult {
  ok: boolean;
  uploaded: boolean;
  url: string;
  url_sm: string;
  url_md: string;
  url_web: string;
  url_lg: string;
  size: number;
  contentType: string;
  /** Extensao do arquivo com ponto (ex: ".jpg", ".png"). Presente quando
   *  o upload foi feito a partir de arquivo local; pode ser `undefined` no
   *  fallback (URL externa). */
  extension?: string;
  bucket?: string;
  key?: string;
}

const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
const strict = () => process.env.NODE_ENV === 'production';
const assetsDir = () =>
  path.resolve(
    process.env.SEED_ASSETS_DIR ||
      path.join(process.cwd(), 'storage/image/seed'),
  );

const assetsRootDir = () =>
  path.resolve(
    process.env.SEED_ASSETS_ROOT_DIR ||
      path.join(process.cwd(), 'prisma/seeds/assets'),
  );

const startupsDir = () =>
  path.resolve(
    process.env.SEED_STARTUPS_DIR || path.join(assetsRootDir(), 'startups'),
  );

const usersDir = () =>
  path.resolve(
    process.env.SEED_USERS_DIR || path.join(assetsRootDir(), 'users'),
  );
function mime(extension: string): string {
  return (
    (
      {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      } as Record<string, string>
    )[extension] || 'application/octet-stream'
  );
}

function extensionFromMime(contentType: string, sourceUrl = ''): string {
  const type = contentType.split(';')[0].trim().toLowerCase();
  const byType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  if (byType[type]) return byType[type];
  const match = sourceUrl.match(/\.(jpe?g|png|webp|svg)(?:\?|$)/i);
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

async function readAsset(name: string) {
  const baseName = name.replace(/\.[^.]+$/, '');
  for (const extension of extensions) {
    try {
      const buffer = await fs.readFile(
        path.join(assetsDir(), `${baseName}${extension}`),
      );
      return {
        buffer,
        size: buffer.length,
        extension,
        contentType: mime(extension),
      };
    } catch {
      // Continua tentando as demais extensões.
    }
  }
  return null;
}

async function readAssetFromFolder(
  folder: string,
  slug: string,
  fileName: string,
) {
  const assetDir = path.join(folder, slug);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  for (const extension of extensions) {
    try {
      const buffer = await fs.readFile(
        path.join(assetDir, `${baseName}${extension}`),
      );
      return {
        buffer,
        size: buffer.length,
        extension,
        contentType: mime(extension),
      };
    } catch {
      // Continua tentando as demais extensões.
    }
  }
  return null;
}

async function readStartupAsset(slug: string, fileName: string) {
  return readAssetFromFolder(startupsDir(), slug, fileName);
}

async function readUserAsset(slug: string, fileName: string) {
  return readAssetFromFolder(usersDir(), slug, fileName);
}

async function download(sourceUrl: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(sourceUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      size: buffer.length,
      contentType,
      extension: extensionFromMime(contentType, sourceUrl),
    };
  } finally {
    clearTimeout(timer);
  }
}

function bucketName(): string {
  return (
    process.env.S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    process.env.S3_BUCKET ||
    (process.env.S3_BUCKET_PREFIX
      ? `${process.env.S3_BUCKET_PREFIX}-image`
      : 'image')
  );
}

function s3Client(): S3Client {
  return new S3Client({
    region:
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'sa-east-1',
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
}

function publicUrl(bucket: string, key: string): string {
  const cdn = process.env.S3_CDN_URL?.replace(/\/$/, '');
  if (cdn) return `${cdn}/${key}`;
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (base)
    return `${base}/${base.includes('amazonaws.com') ? key : `${bucket}/${key}`}`;
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function buildResult(
  image: { size: number; contentType: string; extension: string },
  url: string,
  bucket: string,
  key: string,
): SeedImageResult {
  return {
    ok: true,
    uploaded: true,
    url,
    url_sm: url,
    url_md: url,
    url_web: url,
    url_lg: url,
    size: image.size,
    contentType: image.contentType,
    extension: image.extension,
    bucket,
    key,
  };
}

async function persist(
  slug: string,
  image: {
    buffer: Buffer;
    size: number;
    extension: string;
    contentType: string;
  },
): Promise<SeedImageResult> {
  const key = `seed/${slug}${image.extension}`;
  const bucket = bucketName();
  await s3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: image.buffer,
      ContentType: image.contentType,
      ContentLength: image.size,
    }),
  );
  return buildResult(image, publicUrl(bucket, key), bucket, key);
}

function fallback(url: string, reason: string): SeedImageResult {
  console.warn(`⚠️ [seed-image] URL externa usada: ${reason}`);
  return {
    ok: true,
    uploaded: false,
    url,
    url_sm: url,
    url_md: url,
    url_web: url,
    url_lg: url,
    size: 0,
    contentType: 'image/jpeg',
    extension: '.jpg',
  };
}

/** Faz upload de um arquivo existente em storage/image/seed. */
export async function seedImageFromAsset(
  assetName: string,
  objectName = assetName,
): Promise<SeedImageResult> {
  const image = await readAsset(assetName);
  if (!image)
    throw new Error(
      `[seed-image] asset não encontrado: ${path.join(assetsDir(), assetName)}`,
    );
  return persist(objectName, image);
}

/** Procura primeiro o asset local com o mesmo nome do slug e depois usa a URL legada. */
export async function seedImageFromUrl(
  slug: string,
  sourceUrl: string,
  timeoutMs = 15000,
): Promise<SeedImageResult> {
  const localImage = await readAsset(slug);
  if (localImage) return persist(slug, localImage);

  try {
    return await persist(slug, await download(sourceUrl, timeoutMs));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (strict())
      throw new Error(`[seed-image] falha para ${slug}: ${message}`);
    return fallback(sourceUrl, message);
  }
}

/** Faz upload de um arquivo da pasta organizada prisma/seeds/assets/startups/{slug}/. */
export async function seedImageFromStartup(
  slug: string,
  fileName: string,
  objectName?: string,
): Promise<SeedImageResult> {
  const image = await readStartupAsset(slug, fileName);
  if (!image) {
    throw new Error(
      `[seed-image] asset não encontrado: prisma/seeds/assets/startups/${slug}/${fileName}`,
    );
  }
  return persist(objectName || `${slug}/${fileName}`, image);
}

/**
 * Faz upload de um arquivo da pasta `prisma/seeds/assets/users/{slug}/`
 * (espelha `seedImageFromStartup` mas para avatars/documentos de usuario).
 *
 * Estrutura esperada:
 * ```
 * prisma/seeds/assets/users/
 *   carloseduardo/
 *     avatar.jpg     <- KYC avatar
 *     biofacial.jpg   <- KYC biofacial
 *     doc-cpf.jpg     <- documento CPF
 *     doc-rg.jpg      <- documento RG
 * ```
 *
 * Uso:
 * ```ts
 * const avatar = await seedImageFromUser('carloseduardo', 'avatar');
 * const cpfDoc = await seedImageFromUser('carloseduardo', 'doc-cpf');
 * ```
 */
export async function seedImageFromUser(
  slug: string,
  fileName: string,
  objectName?: string,
): Promise<SeedImageResult> {
  const image = await readUserAsset(slug, fileName);
  if (!image) {
    throw new Error(
      `[seed-image] asset não encontrado: prisma/seeds/assets/users/${slug}/${fileName}`,
    );
  }
  return persist(objectName || `users/${slug}/${fileName}`, image);
}
