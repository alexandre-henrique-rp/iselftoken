const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, 'generated', 'prisma');

if (!fs.existsSync(source)) {
  console.log(
    'Prisma client não sincronizado: generated/prisma ainda não existe. ' +
      'Execute prisma generate primeiro.',
  );
  process.exit(0);
}

const targets = new Set([
  path.join(projectRoot, 'node_modules', '.prisma', 'client'),
]);

try {
  const packageEntry = require.resolve('@prisma/client');
  const packageDirectory = path.dirname(packageEntry);
  targets.add(path.resolve(packageDirectory, '..', '..', '.prisma', 'client'));
} catch (error) {
  console.warn(
    `Não foi possível resolver @prisma/client durante a sincronização: ${String(error)}`,
  );
}

for (const target of targets) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
  console.log(`Prisma client sincronizado em ${path.relative(projectRoot, target)}`);
}
