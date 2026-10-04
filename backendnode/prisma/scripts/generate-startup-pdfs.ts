/**
 * Gera os pitch decks (PDFs) das 20 startups da seed.
 *
 * Para cada blueprint:
 *  1. Renderiza um Markdown procedural com Problema, Solução, Mercado,
 *     Modelo de Receita, Equipe e Tração.
 *  2. Salva o MD em backend/prisma/seeds/docs/<slug>.md
 *  3. Converte para PDF via md-to-pdf -> backend/uploads/startups/<slug>/pitch.pdf
 *
 * Idempotente: pula PDFs já gerados.
 *
 * Uso:
 *   npx ts-node prisma/scripts/generate-startup-pdfs.ts
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { mdToPdf } from 'md-to-pdf';
import { STARTUP_BLUEPRINTS, StartupBlueprint } from '../seeds/blueprints';

const CHROMIUM_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/home/kingdev/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';

const BACKEND_DIR = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(BACKEND_DIR, 'prisma', 'seeds', 'docs');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'uploads', 'startups');

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function buildMarkdown(bp: StartupBlueprint): string {
  const progress = Math.round((bp.campaign.tokensSold / bp.campaign.totalTokens) * 100);
  const raised = bp.campaign.tokensSold * bp.campaign.tokenPrice;

  return `# ${bp.name}

> **Pitch Executivo**
>
> Setor: ${bp.area_atuacao} · Estágio: ${bp.estagio} · Categoria: ${bp.category}

## Sobre

${bp.descricao}

## O Problema

${bp.problema}

## Nossa Solução

${bp.solucao}

## Modelo de Receita

${bp.modelo_receita}

## Oportunidade de Investimento

| Métrica | Valor |
| --- | --- |
| Valuation post-money | ${formatBRL(bp.campaign.valuation)} |
| Meta da rodada | ${formatBRL(bp.campaign.targetAmount)} |
| Investimento mínimo | ${formatBRL(bp.campaign.minInvestment)} |
| Captado até hoje | ${formatBRL(raised)} (${progress}%) |
| Preço do token | ${formatBRL(bp.campaign.tokenPrice)} |

## Equipe Fundadora

- **${bp.founder.nome}** — Fundador & CEO

## Por que agora

A ${bp.name} surge num momento em que o setor de ${bp.area_atuacao.toLowerCase()} passa por
transformação acelerada. Estamos posicionados para capturar essa onda com tecnologia
proprietária e equipe enxuta de alto desempenho.

## Próximos passos

1. Conclusão da rodada de captação
2. Expansão da equipe técnica e comercial
3. Aceleração de aquisição de clientes/usuários
4. Preparação para próxima rodada

---

*Documento gerado automaticamente pela seed da plataforma iSelfToken para fins de demonstração.*
`;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function processOne(bp: StartupBlueprint): Promise<{ skipped: boolean }> {
  const startupDir = path.join(UPLOADS_DIR, bp.slug);
  const pdfPath = path.join(startupDir, 'pitch.pdf');
  const mdPath = path.join(DOCS_DIR, `${bp.slug}.md`);

  await ensureDir(startupDir);
  await ensureDir(DOCS_DIR);

  const md = buildMarkdown(bp);
  await fs.writeFile(mdPath, md, 'utf-8');

  try {
    const pdfStat = await fs.stat(pdfPath);
    if (pdfStat.size > 0) {
      return { skipped: true };
    }
  } catch {
    // arquivo não existe, segue
  }

  await mdToPdf(
    { content: md },
    {
      dest: pdfPath,
      launch_options: {
        executablePath: CHROMIUM_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    },
  );
  return { skipped: false };
}

async function main() {
  console.log(`🧾 Gerando MDs + PDFs para ${STARTUP_BLUEPRINTS.length} startups...`);
  let generated = 0;
  let skipped = 0;
  for (const bp of STARTUP_BLUEPRINTS) {
    const { skipped: wasSkipped } = await processOne(bp);
    if (wasSkipped) {
      skipped++;
      console.log(`  ⊝ ${bp.slug} (já existe)`);
    } else {
      generated++;
      console.log(`  ✓ ${bp.slug}`);
    }
  }
  console.log('');
  console.log(`✅ ${generated} PDF(s) gerado(s), ${skipped} pulado(s).`);
}

main()
  .catch((err) => {
    console.error('❌ Falha ao gerar PDFs:', err);
    process.exit(1);
  });
