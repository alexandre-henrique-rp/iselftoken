import * as fs from 'fs/promises';
import * as path from 'path';
import 'dotenv/config';
import { seedImageFromAsset } from './seed-image-helper';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

async function main() {
  const assetsDir = path.resolve(
    process.env.SEED_ASSETS_DIR || path.join(process.cwd(), 'storage/image/seed'),
  );

  // Tolerância a pasta ausente/vazia: o `storage/image/seed` é opcional em
  // deploys fresh (DB recém-criada em reset). Antes, `throw` quebrava o fluxo
  // do `deploy.sh reset` com exit 1. Agora: warn + exit 0 (no-op graceful).
  // Operador que precisar semear assets reais deve popular a pasta antes
  // (ou montar via SEED_ASSETS_DIR) e rodar `pnpm run seed:assets` direto.
  let allEntries: string[];
  try {
    allEntries = await fs.readdir(assetsDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      console.log(
        `⚠️  Pasta de assets ausente (${assetsDir}). Seed de assets pulado (no-op).`,
      );
      return;
    }
    throw err;
  }

  const files = allEntries
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log(
      `⚠️  Nenhum asset em ${assetsDir}. Seed de assets pulado (no-op).`,
    );
    console.log(
      '   Para enviar imagens, copie para storage/image/seed/ e rode `pnpm run seed:assets`.',
    );
    return;
  }

  console.log(`🖼️  Enviando ${files.length} asset(s) de ${assetsDir}...`);
  for (const file of files) {
    const assetName = file.replace(/\.[^.]+$/, '');
    await seedImageFromAsset(assetName, assetName);
    console.log(`  ✅ ${file}`);
  }
  console.log('✅ Assets enviados com sucesso.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro ao enviar assets:', error);
    console.error(
      '\n💡 Dica: copie imagens para storage/image/seed/ antes de rodar este seed',
    );
    console.error(
      '   (ou monte um volume com SEED_ASSETS_DIR apontando para a pasta desejada).',
    );
    process.exit(1);
  });
}

export { main as seedAssets };
