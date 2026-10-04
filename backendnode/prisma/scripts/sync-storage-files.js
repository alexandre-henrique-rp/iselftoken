const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const uploadsDir = path.join(rootDir, 'uploads');
const storageDir = path.join(rootDir, 'storage');

const storageImageDir = path.join(storageDir, 'image');
const storageDocDir = path.join(storageDir, 'document');

async function syncDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await syncDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('📦 Sincronizando todos os arquivos fisicos para a estrutura de STORAGE oficial (storage/image/ e storage/document/)...');

  // 1. Sincronizar Imagens de Startups (logos, covers, thumbs)
  const startupUploadsDir = path.join(uploadsDir, 'startups');
  if (fs.existsSync(startupUploadsDir)) {
    const slugs = fs.readdirSync(startupUploadsDir);
    for (const slug of slugs) {
      const srcDir = path.join(startupUploadsDir, slug);
      if (!fs.lstatSync(srcDir).isDirectory()) continue;

      const destImageDir = path.join(storageImageDir, 'startups', slug);
      const destDocDir = path.join(storageDocDir, 'startups', slug);

      fs.mkdirSync(destImageDir, { recursive: true });
      fs.mkdirSync(destDocDir, { recursive: true });

      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        const srcFile = path.join(srcDir, file);
        if (fs.lstatSync(srcFile).isDirectory()) continue;

        if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp') || file.endsWith('.svg')) {
          fs.copyFileSync(srcFile, path.join(destImageDir, file));
        } else if (file.endsWith('.pdf') || file.endsWith('.xlsx') || file.endsWith('.doc') || file.endsWith('.docx')) {
          fs.copyFileSync(srcFile, path.join(destDocDir, file));
        }
      }
      console.log(`  ✓ Startup ${slug}: imagens em storage/image/startups/${slug}/ e documentos em storage/document/startups/${slug}/`);
    }
  }

  // 2. Sincronizar Usuários (avatars, selfies, documentos)
  const userUploadsDir = path.join(uploadsDir, 'users');
  if (fs.existsSync(userUploadsDir)) {
    const userSlugs = fs.readdirSync(userUploadsDir);
    for (const slug of userSlugs) {
      const srcDir = path.join(userUploadsDir, slug);
      if (!fs.lstatSync(srcDir).isDirectory()) continue;

      const destImageDir = path.join(storageImageDir, 'users', slug);
      const destDocDir = path.join(storageDocDir, 'users', slug);

      fs.mkdirSync(destImageDir, { recursive: true });
      fs.mkdirSync(destDocDir, { recursive: true });

      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        const srcFile = path.join(srcDir, file);
        if (fs.lstatSync(srcFile).isDirectory()) continue;

        if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp')) {
          fs.copyFileSync(srcFile, path.join(destImageDir, file));
        } else if (file.endsWith('.pdf')) {
          fs.copyFileSync(srcFile, path.join(destDocDir, file));
        }
      }
      console.log(`  ✓ Usuário ${slug}: imagens em storage/image/users/${slug}/ e documentos em storage/document/users/${slug}/`);
    }
  }

  console.log('\n✅ Todos os arquivos foram sincronizados no diretório oficial storage/!');
}

main().catch(console.error);
