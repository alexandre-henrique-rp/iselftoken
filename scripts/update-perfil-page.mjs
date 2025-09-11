// scripts/update-perfil-page.mjs
// Gera/atualiza src/app/(protected)/perfil/page.tsx usando o prompt e o documento de contexto.
// Requer: process.env.OPENAI_API_KEY (ou ajuste para seu provedor LLM)

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const PROMPT_PATH = path.resolve('doc/prompt/atualizar-frontend-perfil.md');
const CONTEXT_DOC_PATH = path.resolve('doc/context/frontend-perfil.md');
const TARGET_PAGE_PATH = path.resolve('src/app/(protected)/perfil/page.tsx');
const DRY_RUN = process.argv.includes('--dry-run');

async function readFileOrThrow(p) {
  const data = await fs.readFile(p, 'utf-8');
  if (!data || !data.trim()) throw new Error(`Arquivo vazio: ${p}`);
  return data;
}

function assertLooksLikeTSX(tsx) {
  const requiredHints = [
    "import",
    "export default",
    "function Page",
    "return (",
  ];
  const missing = requiredHints.filter((h) => !tsx.includes(h));
  if (missing.length) {
    throw new Error(
      `TSX gerado parece incompleto. Faltando: \n- ${missing.join('\n- ')}`
    );
  }
}

async function callLLMToGeneratePage(prompt, contextDoc, currentPage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurado.');

  const system = [
    'Você é um engenheiro(a) sênior especialista em Next.js 15 (App Router), React 19, TypeScript, UX/UI, Clean Architecture e DDD.',
    'Saída deve ser um arquivo TSX completo e pronto para uso em src/app/(protected)/perfil/page.tsx.',
    'Mantenha imports no topo, componentes server/client conforme necessário.',
    'Use RHF + Zod quando aplicável, follow Clean Architecture (adapters/use-cases apenas se já existirem; caso contrário, mock minimal).',
  ].join(' ');

  const user = [
    'PROMPT (orientações para atualizar documento de perfil):',
    prompt,
    '\n---\nDocumento de Contexto (doc/context/frontend-perfil.md):',
    contextDoc,
    '\n---\nArquivo atual (src/app/(protected)/perfil/page.tsx):',
    currentPage || '[ARQUIVO INEXISTENTE OU VAZIO]',
    '\nGere a NOVA VERSÃO COMPLETA do arquivo page.tsx, respeitando o contexto, o padrão { status, message, data }, i18n, acessibilidade e responsividade.',
    'Inclua apenas código TSX (sem explicações).',
  ].join('\n');

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha LLM: ${res.status} - ${text}`);
  }
  const json = await res.json();
  let content = json?.choices?.[0]?.message?.content || '';

  // Remover cercas de código se presentes
  content = content.replace(/^```[a-zA-Z]*\n/, '').replace(/```\s*$/, '');

  return content.trim();
}

async function ensureDirFor(targetPath) {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const [prompt, contextDoc] = await Promise.all([
    readFileOrThrow(PROMPT_PATH),
    readFileOrThrow(CONTEXT_DOC_PATH),
  ]);

  let currentPage = '';
  try {
    currentPage = await fs.readFile(TARGET_PAGE_PATH, 'utf-8');
  } catch {
    currentPage = '';
  }

  const nextTsx = await callLLMToGeneratePage(prompt, contextDoc, currentPage);

  assertLooksLikeTSX(nextTsx);

  if (DRY_RUN) {
    console.log('--- DRY RUN (TSX gerado) ---\n');
    console.log(nextTsx);
    return;
  }

  await ensureDirFor(TARGET_PAGE_PATH);
  await fs.writeFile(TARGET_PAGE_PATH, nextTsx, 'utf-8');
  console.log(`Atualizado: ${TARGET_PAGE_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
