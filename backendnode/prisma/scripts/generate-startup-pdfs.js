"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path = __importStar(require("path"));
const md_to_pdf_1 = require("md-to-pdf");
const blueprints_1 = require("../seeds/blueprints");
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/home/kingdev/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const BACKEND_DIR = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(BACKEND_DIR, 'prisma', 'seeds', 'docs');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'uploads', 'startups');
function formatBRL(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function buildMarkdown(bp) {
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
async function ensureDir(dir) {
    await fs_1.promises.mkdir(dir, { recursive: true });
}
async function processOne(bp) {
    const startupDir = path.join(UPLOADS_DIR, bp.slug);
    const pdfPath = path.join(startupDir, 'pitch.pdf');
    const mdPath = path.join(DOCS_DIR, `${bp.slug}.md`);
    await ensureDir(startupDir);
    await ensureDir(DOCS_DIR);
    const md = buildMarkdown(bp);
    await fs_1.promises.writeFile(mdPath, md, 'utf-8');
    try {
        const pdfStat = await fs_1.promises.stat(pdfPath);
        if (pdfStat.size > 0) {
            return { skipped: true };
        }
    }
    catch {
    }
    await (0, md_to_pdf_1.mdToPdf)({ content: md }, {
        dest: pdfPath,
        launch_options: {
            executablePath: CHROMIUM_PATH,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    });
    return { skipped: false };
}
async function main() {
    console.log(`🧾 Gerando MDs + PDFs para ${blueprints_1.STARTUP_BLUEPRINTS.length} startups...`);
    let generated = 0;
    let skipped = 0;
    for (const bp of blueprints_1.STARTUP_BLUEPRINTS) {
        const { skipped: wasSkipped } = await processOne(bp);
        if (wasSkipped) {
            skipped++;
            console.log(`  ⊝ ${bp.slug} (já existe)`);
        }
        else {
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
//# sourceMappingURL=generate-startup-pdfs.js.map