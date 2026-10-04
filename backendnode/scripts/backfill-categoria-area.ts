/**
 * Script de backfill heurístico: startups.area_atuacao (string legado) ->
 * categoryId + areaAtuacaoId (FKs relacionais ADR-007).
 *
 * Uso:
 *   npx tsx scripts/backfill-categoria-area.ts [--dry-run]
 *
 * Variaveis de ambiente:
 *   DATABASE_URL - URL do banco MySQL (default: mysql://dev:changeme@localhost:3307/fintech_db)
 *
 * O script:
 * 1. Inventaria valores unicos de area_atuacao
 * 2. Para cada startup com area_atuacao NOT NULL E categoryId IS NULL,
 *    normaliza o valor, busca no MAPEAMENTO_MANUAL e atualiza as FKs.
 * 3. Valores sem match vao para other/outra com needs_manual_review=true
 * 4. E IDEMPOTENTE: usa WHERE categoryId IS NULL
 *
 * Dependencias (executadas inline, sem Prisma ORM):
 *   mysql2/promise
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

// ==========================================
// Configuracao
// ==========================================

const DRY_RUN = process.argv.includes('--dry-run');

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function parseDatabaseUrl(url: string): DbConfig {
  const match = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!match) throw new Error(`DATABASE_URL invalida: ${url}`);
  const [, user, password, host, portRaw, database] = match;
  return { host, port: Number(portRaw), user, password, database };
}

const dbConfig: DbConfig = (() => {
  const url = process.env.DATABASE_URL ?? 'mysql://dev:changeme@localhost:3307/fintech_db';
  return parseDatabaseUrl(url);
})();

// ==========================================
// Mapeamento manual de strings legadas para { categoriaSlug, areaSlug }
// Cobertura baseada em ADR-007 §3.3 + mapAreaAtuacaoToCategory do startup.service.ts
// ==========================================

/**
 * Mapa de normalizacao: variations => { categoriaSlug, areaSlug }
 * Cada chave do mapa e uma variacao possivel do valor em area_atuacao.
 * O valor e a combinacao { categoriaSlug, areaSlug } correspondente.
 */
const MAPEAMENTO_MANUAL: Record<string, { categoriaSlug: string; areaSlug: string }> = {
  // ---------- FINTECH ----------
  fintech: { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  'fin tech': { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  'fintech ': { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  ' fintech': { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  fintechs: { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  pagamentos: { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  'pagamentos ': { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  pix: { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  'pix ': { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  'pagamentos pix': { categoriaSlug: 'fintech', areaSlug: 'pagamentos_pix' },
  adquirencia: { categoriaSlug: 'fintech', areaSlug: 'adquirencia' },
  'adquirência': { categoriaSlug: 'fintech', areaSlug: 'adquirencia' },
  'conta digital': { categoriaSlug: 'fintech', areaSlug: 'conta_digital_pf' },
  'conta digital pf': { categoriaSlug: 'fintech', areaSlug: 'conta_digital_pf' },
  'conta digital pessoa fisica': { categoriaSlug: 'fintech', areaSlug: 'conta_digital_pf' },
  'conta digitalpj': { categoriaSlug: 'fintech', areaSlug: 'conta_digital_pj' },
  'conta digital pj': { categoriaSlug: 'fintech', areaSlug: 'conta_digital_pj' },
  'conta digital pessoa juridica': { categoriaSlug: 'fintech', areaSlug: 'conta_digital_pj' },
  'emprestimos p2p': { categoriaSlug: 'fintech', areaSlug: 'emprestimos_p2p' },
  'emprestimo p2p': { categoriaSlug: 'fintech', areaSlug: 'emprestimos_p2p' },
  'emprestimos': { categoriaSlug: 'fintech', areaSlug: 'emprestimos_p2p' },
  'emprestimo': { categoriaSlug: 'fintech', areaSlug: 'emprestimos_p2p' },
  investimentos: { categoriaSlug: 'fintech', areaSlug: 'investimentos' },
  'investimento ': { categoriaSlug: 'fintech', areaSlug: 'investimentos' },
  'investiment': { categoriaSlug: 'fintech', areaSlug: 'investimentos' },
  'investimentos ': { categoriaSlug: 'fintech', areaSlug: 'investimentos' },
  baas: { categoriaSlug: 'fintech', areaSlug: 'banking_as_service' },
  'banking as a service': { categoriaSlug: 'fintech', areaSlug: 'banking_as_service' },
  'banking-as-a-service': { categoriaSlug: 'fintech', areaSlug: 'banking_as_service' },
  'banking as service': { categoriaSlug: 'fintech', areaSlug: 'banking_as_service' },
  seguros: { categoriaSlug: 'fintech', areaSlug: 'seguros' },
  'seguros ': { categoriaSlug: 'fintech', areaSlug: 'seguros' },
  'seguro': { categoriaSlug: 'fintech', areaSlug: 'seguros' },
  crypto: { categoriaSlug: 'fintech', areaSlug: 'crypto_fintech' },
  crypto_fintech: { categoriaSlug: 'fintech', areaSlug: 'crypto_fintech' },
  cryptocurrencies: { categoriaSlug: 'fintech', areaSlug: 'crypto_fintech' },
  criptomoedas: { categoriaSlug: 'fintech', areaSlug: 'crypto_fintech' },
  blockchain: { categoriaSlug: 'fintech', areaSlug: 'crypto_fintech' },
  'gestao financeira': { categoriaSlug: 'fintech', areaSlug: 'gestao_financeira_pessoal' },
  'gestao financeira pessoal': { categoriaSlug: 'fintech', areaSlug: 'gestao_financeira_pessoal' },
  'gestao financeiro': { categoriaSlug: 'fintech', areaSlug: 'gestao_financeira_pessoal' },
  'financeiro': { categoriaSlug: 'fintech', areaSlug: 'gestao_financeira_pessoal' },
  'financeira': { categoriaSlug: 'fintech', areaSlug: 'gestao_financeira_pessoal' },
  'credito': { categoriaSlug: 'fintech', areaSlug: 'emprestimos_p2p' },
  'risco de credito': { categoriaSlug: 'fintech', areaSlug: 'emprestimos_p2p' },
  'insurtech': { categoriaSlug: 'fintech', areaSlug: 'seguros' },
  'wealthtech': { categoriaSlug: 'fintech', areaSlug: 'investimentos' },

  // ---------- EDTECH ----------
  edtech: { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'ed tech': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'ed-tech': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'educacao': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'educação': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  education: { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'educacao ': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'educacao basica': { categoriaSlug: 'edtech', areaSlug: 'educacao_basica' },
  'educacao infantil': { categoriaSlug: 'edtech', areaSlug: 'edtech_infantil' },
  'educação infantil': { categoriaSlug: 'edtech', areaSlug: 'edtech_infantil' },
  'ensino infantil': { categoriaSlug: 'edtech', areaSlug: 'edtech_infantil' },
  'ensino fundamental': { categoriaSlug: 'edtech', areaSlug: 'educacao_basica' },
  'ensino medio': { categoriaSlug: 'edtech', areaSlug: 'educacao_basica' },
  'ensino médio': { categoriaSlug: 'edtech', areaSlug: 'educacao_basica' },
  'educacao superior': { categoriaSlug: 'edtech', areaSlug: 'educacao_superior' },
  'educação superior': { categoriaSlug: 'edtech', areaSlug: 'educacao_superior' },
  'ensino superior': { categoriaSlug: 'edtech', areaSlug: 'educacao_superior' },
  'faculdade': { categoriaSlug: 'edtech', areaSlug: 'educacao_superior' },
  'universidade': { categoriaSlug: 'edtech', areaSlug: 'educacao_superior' },
  'cursos online': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'cursos online ': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'cursos livres': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  ead: { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'e-learning': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  'elearning': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  idiomas: { categoriaSlug: 'edtech', areaSlug: 'idiomas' },
  'ensino de idiomas': { categoriaSlug: 'edtech', areaSlug: 'idiomas' },
  'aprendizado de idiomas': { categoriaSlug: 'edtech', areaSlug: 'idiomas' },
  'educacao corporativa': { categoriaSlug: 'edtech', areaSlug: 'educacao_corporativa' },
  'educação corporativa': { categoriaSlug: 'edtech', areaSlug: 'educacao_corporativa' },
  'treinamento corporativo': { categoriaSlug: 'edtech', areaSlug: 'educacao_corporativa' },
  'treinamento empresarial': { categoriaSlug: 'edtech', areaSlug: 'educacao_corporativa' },
  'lms': { categoriaSlug: 'edtech', areaSlug: 'educacao_corporativa' },
  'plataforma de ensino': { categoriaSlug: 'edtech', areaSlug: 'cursos_online' },
  gamificacao: { categoriaSlug: 'edtech', areaSlug: 'gamificacao_ensino' },
  'gamificação': { categoriaSlug: 'edtech', areaSlug: 'gamificacao_ensino' },
  gamification: { categoriaSlug: 'edtech', areaSlug: 'gamificacao_ensino' },
  'gestao escolar': { categoriaSlug: 'edtech', areaSlug: 'gestao_escolar' },
  'gestão escolar': { categoriaSlug: 'edtech', areaSlug: 'gestao_escolar' },
  'administracao escolar': { categoriaSlug: 'edtech', areaSlug: 'gestao_escolar' },
  'tech for kids': { categoriaSlug: 'edtech', areaSlug: 'edtech_infantil' },

  // ---------- HEALTHTECH ----------
  healthtech: { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'health tech': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'health-tech': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'health': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  saude: { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'saúde': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'saude ': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'tecnologia da saude': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'tecnologia em saude': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'technology health': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  telemedicina: { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'teleconsulta': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'telemedicina ': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'gestao hospitalar': { categoriaSlug: 'healthtech', areaSlug: 'gestao_hospitalar' },
  'gestão hospitalar': { categoriaSlug: 'healthtech', areaSlug: 'gestao_hospitalar' },
  hospital: { categoriaSlug: 'healthtech', areaSlug: 'gestao_hospitalar' },
  'hospital management': { categoriaSlug: 'healthtech', areaSlug: 'gestao_hospitalar' },
  'diagnostico ia': { categoriaSlug: 'healthtech', areaSlug: 'diagnostico_ia' },
  'diagnóstico ia': { categoriaSlug: 'healthtech', areaSlug: 'diagnostico_ia' },
  'diagnostico por ia': { categoriaSlug: 'healthtech', areaSlug: 'diagnostico_ia' },
  'ia diagnostico': { categoriaSlug: 'healthtech', areaSlug: 'diagnostico_ia' },
  'prontuario eletronico': { categoriaSlug: 'healthtech', areaSlug: 'prontuario_eletronico' },
  'prontuário eletrônico': { categoriaSlug: 'healthtech', areaSlug: 'prontuario_eletronico' },
  'prontuario': { categoriaSlug: 'healthtech', areaSlug: 'prontuario_eletronico' },
  'prontuário': { categoriaSlug: 'healthtech', areaSlug: 'prontuario_eletronico' },
  'healthtech farmacia': { categoriaSlug: 'healthtech', areaSlug: 'healthtech_farmacia' },
  'farmacia': { categoriaSlug: 'healthtech', areaSlug: 'healthtech_farmacia' },
  'farmácia': { categoriaSlug: 'healthtech', areaSlug: 'healthtech_farmacia' },
  'pharmacy': { categoriaSlug: 'healthtech', areaSlug: 'healthtech_farmacia' },
  'monitoramento paciente': { categoriaSlug: 'healthtech', areaSlug: 'monitoramento_paciente' },
  'monitoramento de paciente': { categoriaSlug: 'healthtech', areaSlug: 'monitoramento_paciente' },
  'monitoramento de saude': { categoriaSlug: 'healthtech', areaSlug: 'monitoramento_paciente' },
  'wearable health': { categoriaSlug: 'healthtech', areaSlug: 'monitoramento_paciente' },
  fisioterapia: { categoriaSlug: 'healthtech', areaSlug: 'fisioterapia_digital' },
  'fisioterapia digital': { categoriaSlug: 'healthtech', areaSlug: 'fisioterapia_digital' },
  'telereabilitacao': { categoriaSlug: 'healthtech', areaSlug: 'fisioterapia_digital' },
  nutricao: { categoriaSlug: 'healthtech', areaSlug: 'nutricao_wellness' },
  'nutrição': { categoriaSlug: 'healthtech', areaSlug: 'nutricao_wellness' },
  wellness: { categoriaSlug: 'healthtech', areaSlug: 'nutricao_wellness' },
  'bem-estar': { categoriaSlug: 'healthtech', areaSlug: 'nutricao_wellness' },
  'bem estar': { categoriaSlug: 'healthtech', areaSlug: 'nutricao_wellness' },
  'medtech': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },
  'biomedtech': { categoriaSlug: 'healthtech', areaSlug: 'diagnostico_ia' },
  'health analytics': { categoriaSlug: 'healthtech', areaSlug: 'diagnostico_ia' },
  'medical': { categoriaSlug: 'healthtech', areaSlug: 'telemedicina' },

  // ---------- AI ----------
  ai: { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'a.i': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'artificial intelligence': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'inteligencia artificial': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'inteligência artificial': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'ia ': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  ' ia': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'ia generativa': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'ia generativa ': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'generative ai': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  'generativeai': { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  genai: { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  llm: { categoriaSlug: 'ai', areaSlug: 'ia_generativa' },
  mlops: { categoriaSlug: 'ai', areaSlug: 'mlops' },
  'ml ops': { categoriaSlug: 'ai', areaSlug: 'mlops' },
  'machine learning': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  'machine-learning': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  'computer vision': { categoriaSlug: 'ai', areaSlug: 'computer_vision' },
  'visao computacional': { categoriaSlug: 'ai', areaSlug: 'computer_vision' },
  'visão computacional': { categoriaSlug: 'ai', areaSlug: 'computer_vision' },
  'nlp': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'nlp ': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'chatbot': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'chat bot': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'chatbots': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'nlp chatbots': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'assistente virtual': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'assistente digital': { categoriaSlug: 'ai', areaSlug: 'nlp_chatbots' },
  'voice ai': { categoriaSlug: 'ai', areaSlug: 'ia_voz' },
  'voice': { categoriaSlug: 'ai', areaSlug: 'ia_voz' },
  'audio ai': { categoriaSlug: 'ai', areaSlug: 'ia_voz' },
  'speech ai': { categoriaSlug: 'ai', areaSlug: 'ia_voz' },
  'ia垂直': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  'vertical ai': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  'ai for business': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  'ai solutions': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  'automation': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  automacao: { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },
  'automação': { categoriaSlug: 'ai', areaSlug: 'ia_vertical' },

  // ---------- SAAS ----------
  saas: { categoriaSlug: 'saas', areaSlug: 'crm' },
  'sa as': { categoriaSlug: 'saas', areaSlug: 'crm' },
  'saas ': { categoriaSlug: 'saas', areaSlug: 'crm' },
  'software as a service': { categoriaSlug: 'saas', areaSlug: 'crm' },
  'software as service': { categoriaSlug: 'saas', areaSlug: 'crm' },
  cloud: { categoriaSlug: 'saas', areaSlug: 'crm' },
  'cloud ': { categoriaSlug: 'saas', areaSlug: 'crm' },
  crm: { categoriaSlug: 'saas', areaSlug: 'crm' },
  'crm ': { categoriaSlug: 'saas', areaSlug: 'crm' },
  'customer relationship management': { categoriaSlug: 'saas', areaSlug: 'crm' },
  erp: { categoriaSlug: 'saas', areaSlug: 'erp' },
  'erp ': { categoriaSlug: 'saas', areaSlug: 'erp' },
  'enterprise resource planning': { categoriaSlug: 'saas', areaSlug: 'erp' },
  rh: { categoriaSlug: 'saas', areaSlug: 'rh' },
  'r.h.': { categoriaSlug: 'saas', areaSlug: 'rh' },
  'recursos humanos': { categoriaSlug: 'saas', areaSlug: 'rh' },
  'gestao de pessoas': { categoriaSlug: 'saas', areaSlug: 'rh' },
  'gestão de pessoas': { categoriaSlug: 'saas', areaSlug: 'rh' },
  hr: { categoriaSlug: 'saas', areaSlug: 'rh' },
  hrtech: { categoriaSlug: 'saas', areaSlug: 'rh' },
  'people analytics': { categoriaSlug: 'saas', areaSlug: 'rh' },
  'marketing digital': { categoriaSlug: 'saas', areaSlug: 'marketing_digital' },
  'marketing digital ': { categoriaSlug: 'saas', areaSlug: 'marketing_digital' },
  'marketing automation': { categoriaSlug: 'saas', areaSlug: 'marketing_digital' },
  'automacao de marketing': { categoriaSlug: 'saas', areaSlug: 'marketing_digital' },
  'automação de marketing': { categoriaSlug: 'saas', areaSlug: 'marketing_digital' },
  'digital marketing': { categoriaSlug: 'saas', areaSlug: 'marketing_digital' },
  'automacao de processos': { categoriaSlug: 'saas', areaSlug: 'automacao_processos' },
  'automação de processos': { categoriaSlug: 'saas', areaSlug: 'automacao_processos' },
  'process automation': { categoriaSlug: 'saas', areaSlug: 'automacao_processos' },
  'bpm': { categoriaSlug: 'saas', areaSlug: 'automacao_processos' },
  'gestao de projetos': { categoriaSlug: 'saas', areaSlug: 'gestao_projetos' },
  'gestão de projetos': { categoriaSlug: 'saas', areaSlug: 'gestao_projetos' },
  'project management': { categoriaSlug: 'saas', areaSlug: 'gestao_projetos' },
  'gestao de projetos ': { categoriaSlug: 'saas', areaSlug: 'gestao_projetos' },
  helpdesk: { categoriaSlug: 'saas', areaSlug: 'helpdesk' },
  'help desk': { categoriaSlug: 'saas', areaSlug: 'helpdesk' },
  'atendimento': { categoriaSlug: 'saas', areaSlug: 'helpdesk' },
  'suporte ao cliente': { categoriaSlug: 'saas', areaSlug: 'helpdesk' },
  'customer service': { categoriaSlug: 'saas', areaSlug: 'helpdesk' },
  'bi analytics': { categoriaSlug: 'saas', areaSlug: 'bi_analytics' },
  'bi': { categoriaSlug: 'saas', areaSlug: 'bi_analytics' },
  'business intelligence': { categoriaSlug: 'saas', areaSlug: 'bi_analytics' },
  'analytics': { categoriaSlug: 'saas', areaSlug: 'bi_analytics' },
  'data analytics': { categoriaSlug: 'saas', areaSlug: 'bi_analytics' },
  'b2b saas': { categoriaSlug: 'saas', areaSlug: 'crm' },
  'projetools': { categoriaSlug: 'saas', areaSlug: 'gestao_projetos' },

  // ---------- BIOTECH ----------
  biotech: { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'bio tech': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'bio-tech': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'biotecnologia': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'biotecnologia ': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'biotech saude': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'biotech saúde': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'biotech industrial': { categoriaSlug: 'biotech', areaSlug: 'biotech_industrial' },
  'biotech ambiental': { categoriaSlug: 'biotech', areaSlug: 'biotech_ambiental' },
  'bioinformática': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  bioinformatica: { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  bioinformatics: { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'synthetic biology': { categoriaSlug: 'biotech', areaSlug: 'biotech_industrial' },
  'genomics': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'genetica': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },
  'genética': { categoriaSlug: 'biotech', areaSlug: 'biotech_saude' },

  // ---------- AGROTECH ----------
  agrotech: { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agro tech': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agro-tech': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agro': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agro ': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  agritech: { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agricultura': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agricultura de precisao': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agricultura de precisão': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'agrotech precisao': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'precision agriculture': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'marketplace agro': { categoriaSlug: 'agrotech', areaSlug: 'marketplace_agro' },
  'agromarketplace': { categoriaSlug: 'agrotech', areaSlug: 'marketplace_agro' },
  'agro marketplace': { categoriaSlug: 'agrotech', areaSlug: 'marketplace_agro' },
  'gestao rural': { categoriaSlug: 'agrotech', areaSlug: 'gestao_rural' },
  'gestão rural': { categoriaSlug: 'agrotech', areaSlug: 'gestao_rural' },
  'farming management': { categoriaSlug: 'agrotech', areaSlug: 'gestao_rural' },
  'drones agricolas': { categoriaSlug: 'agrotech', areaSlug: 'drones_agricolas' },
  'drones agrícolas': { categoriaSlug: 'agrotech', areaSlug: 'drones_agricolas' },
  'agricultural drones': { categoriaSlug: 'agrotech', areaSlug: 'drones_agricolas' },
  'drone agricola': { categoriaSlug: 'agrotech', areaSlug: 'drones_agricolas' },
  'rastreabilidade alimentar': { categoriaSlug: 'agrotech', areaSlug: 'rastreabilidade_alimentar' },
  'food traceability': { categoriaSlug: 'agrotech', areaSlug: 'rastreabilidade_alimentar' },
  'agronegocio': { categoriaSlug: 'agrotech', areaSlug: 'gestao_rural' },
  'agronegócio': { categoriaSlug: 'agrotech', areaSlug: 'gestao_rural' },
  'iot agricola': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },
  'iot agrícola': { categoriaSlug: 'agrotech', areaSlug: 'agrotech_precisao' },

  // ---------- PROPTECH ----------
  proptech: { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'prop tech': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'prop-tech': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'real estate': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'real estate tech': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'imobiliario': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'imobiliário': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'imoveis': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'imóveis': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'marketplace imoveis': { categoriaSlug: 'proptech', areaSlug: 'marketplace_imoveis' },
  'gestao imobiliária': { categoriaSlug: 'proptech', areaSlug: 'gestao_imobiliaria' },
  'gestao imobiliario': { categoriaSlug: 'proptech', areaSlug: 'gestao_imobiliaria' },
  'property management': { categoriaSlug: 'proptech', areaSlug: 'gestao_imobiliaria' },
  'financiamento imobiliario': { categoriaSlug: 'proptech', areaSlug: 'financiamento_imobiliario' },
  'financiamento imobiliário': { categoriaSlug: 'proptech', areaSlug: 'financiamento_imobiliario' },
  'credito imobiliario': { categoriaSlug: 'proptech', areaSlug: 'financiamento_imobiliario' },
  'hipoteca': { categoriaSlug: 'proptech', areaSlug: 'financiamento_imobiliario' },
  'iot construcao': { categoriaSlug: 'proptech', areaSlug: 'iot_construcao' },
  'iot construção': { categoriaSlug: 'proptech', areaSlug: 'iot_construcao' },
  'construcao inteligente': { categoriaSlug: 'proptech', areaSlug: 'iot_construcao' },
  'construção inteligente': { categoriaSlug: 'proptech', areaSlug: 'iot_construcao' },
  'real estate tokenization': { categoriaSlug: 'proptech', areaSlug: 'real_estate_tokenization' },
  'tokenizacao imobiliaria': { categoriaSlug: 'proptech', areaSlug: 'real_estate_tokenization' },
  'tokenização imobiliária': { categoriaSlug: 'proptech', areaSlug: 'real_estate_tokenization' },
  'fractional ownership': { categoriaSlug: 'proptech', areaSlug: 'real_estate_tokenization' },
  'construtech': { categoriaSlug: 'proptech', areaSlug: 'iot_construcao' },
  construch: { categoriaSlug: 'proptech', areaSlug: 'iot_construcao' },

  // ---------- LOGISTICS ----------
  logistics: { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'logistics ': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'logistica': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'logística': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'logtech': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'log tech': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'supply chain': { categoriaSlug: 'logistics', areaSlug: 'warehouse' },
  'supply chain tech': { categoriaSlug: 'logistics', areaSlug: 'warehouse' },
  'last mile': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'last-mile': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'ultima milha': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'última milha': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'entrega': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'delivery': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'gestao de frota': { categoriaSlug: 'logistics', areaSlug: 'gestao_frota' },
  'gestão de frota': { categoriaSlug: 'logistics', areaSlug: 'gestao_frota' },
  'fleet management': { categoriaSlug: 'logistics', areaSlug: 'gestao_frota' },
  'frota': { categoriaSlug: 'logistics', areaSlug: 'gestao_frota' },
  'gestao de armazem': { categoriaSlug: 'logistics', areaSlug: 'warehouse' },
  'gestão de armazém': { categoriaSlug: 'logistics', areaSlug: 'warehouse' },
  warehouse: { categoriaSlug: 'logistics', areaSlug: 'warehouse' },
  'cross border': { categoriaSlug: 'logistics', areaSlug: 'cross_border' },
  'cross-border': { categoriaSlug: 'logistics', areaSlug: 'cross_border' },
  'crossborder': { categoriaSlug: 'logistics', areaSlug: 'cross_border' },
  'logistica internacional': { categoriaSlug: 'logistics', areaSlug: 'cross_border' },
  'frete': { categoriaSlug: 'logistics', areaSlug: 'gestao_frota' },
  'transporte': { categoriaSlug: 'logistics', areaSlug: 'gestao_frota' },
  'mobilidade': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'mobility': { categoriaSlug: 'logistics', areaSlug: 'last_mile' },
  'logtech sustentavel': { categoriaSlug: 'logistics', areaSlug: 'logtech_sustentavel' },
  'logística sustentável': { categoriaSlug: 'logistics', areaSlug: 'logtech_sustentavel' },
  'sustainable logistics': { categoriaSlug: 'logistics', areaSlug: 'logtech_sustentavel' },
  'green logistics': { categoriaSlug: 'logistics', areaSlug: 'logtech_sustentavel' },

  // ---------- CLEANTECH ----------
  cleantech: { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'clean tech': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'clean-tech': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'energia solar': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'solar energy': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'solar': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'energia renovavel': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'energia renovável': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'renewable energy': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'gestao de residuos': { categoriaSlug: 'cleantech', areaSlug: 'gestao_residuos' },
  'gestão de residuos': { categoriaSlug: 'cleantech', areaSlug: 'gestao_residuos' },
  'gestao de resíduos': { categoriaSlug: 'cleantech', areaSlug: 'gestao_residuos' },
  'waste management': { categoriaSlug: 'cleantech', areaSlug: 'gestao_residuos' },
  'residuos': { categoriaSlug: 'cleantech', areaSlug: 'gestao_residuos' },
  'resíduos': { categoriaSlug: 'cleantech', areaSlug: 'gestao_residuos' },
  'waste tech': { categoriaSlug: 'cleantech', areaSlug: 'gestao_residuos' },
  'mobilidade eletrica': { categoriaSlug: 'cleantech', areaSlug: 'mobilidade_eletrica' },
  'mobilidade elétrica': { categoriaSlug: 'cleantech', areaSlug: 'mobilidade_eletrica' },
  'electric mobility': { categoriaSlug: 'cleantech', areaSlug: 'mobilidade_eletrica' },
  'ev': { categoriaSlug: 'cleantech', areaSlug: 'mobilidade_eletrica' },
  'veiculos eletricos': { categoriaSlug: 'cleantech', areaSlug: 'mobilidade_eletrica' },
  'veículos elétricos': { categoriaSlug: 'cleantech', areaSlug: 'mobilidade_eletrica' },
  'electric vehicles': { categoriaSlug: 'cleantech', areaSlug: 'mobilidade_eletrica' },
  'carbon credits': { categoriaSlug: 'cleantech', areaSlug: 'carbon_credits' },
  'carbono': { categoriaSlug: 'cleantech', areaSlug: 'carbon_credits' },
  'carbon credit': { categoriaSlug: 'cleantech', areaSlug: 'carbon_credits' },
  'esg': { categoriaSlug: 'cleantech', areaSlug: 'carbon_credits' },
  'sustentabilidade': { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  sustainability: { categoriaSlug: 'cleantech', areaSlug: 'energia_solar' },
  'climate tech': { categoriaSlug: 'cleantech', areaSlug: 'carbon_credits' },
  climatetech: { categoriaSlug: 'cleantech', areaSlug: 'carbon_credits' },

  // ---------- RETAIL TECH ----------
  retail: { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'retail tech': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'retail-tech': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  retailtech: { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'varejo': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'e-commerce': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  ecommerce: { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'e-commerce platform': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'plataforma de e-commerce': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'plataforma de e commerce': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'pdv moderno': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'pdv ': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'ponto de venda': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'ponto de venda moderno': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'caixa ': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'pos ': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'marketplace vertical': { categoriaSlug: 'retail_tech', areaSlug: 'marketplace_vertical' },
  'vertical marketplace': { categoriaSlug: 'retail_tech', areaSlug: 'marketplace_vertical' },
  'vtex': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'shopify': { categoriaSlug: 'retail_tech', areaSlug: 'ecommerce_platform' },
  'retail media': { categoriaSlug: 'retail_tech', areaSlug: 'retail_media' },
  'midia varejista': { categoriaSlug: 'retail_tech', areaSlug: 'retail_media' },
  'mídia varejista': { categoriaSlug: 'retail_tech', areaSlug: 'retail_media' },
  'in-store tech': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'instore tech': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'automacao comercial': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },
  'automação comercial': { categoriaSlug: 'retail_tech', areaSlug: 'pdv_moderno' },

  // ---------- OUTROS / FALLBACK ----------
  outro: { categoriaSlug: 'other', areaSlug: 'outra' },
  outros: { categoriaSlug: 'other', areaSlug: 'outra' },
  outra: { categoriaSlug: 'other', areaSlug: 'outra' },
  'outras': { categoriaSlug: 'other', areaSlug: 'outra' },
  other: { categoriaSlug: 'other', areaSlug: 'outra' },
  others: { categoriaSlug: 'other', areaSlug: 'outra' },
  'nao classificado': { categoriaSlug: 'other', areaSlug: 'outra' },
  'não classificado': { categoriaSlug: 'other', areaSlug: 'outra' },
  'nao informado': { categoriaSlug: 'other', areaSlug: 'outra' },
  'não informado': { categoriaSlug: 'other', areaSlug: 'outra' },
  'sem categoria': { categoriaSlug: 'other', areaSlug: 'outra' },
  'sem categorizacao': { categoriaSlug: 'other', areaSlug: 'outra' },
  'nao se aplica': { categoriaSlug: 'other', areaSlug: 'outra' },
  'não se aplica': { categoriaSlug: 'other', areaSlug: 'outra' },
  'diversos': { categoriaSlug: 'other', areaSlug: 'outra' },
  'variados': { categoriaSlug: 'other', areaSlug: 'outra' },
  undefined: { categoriaSlug: 'other', areaSlug: 'outra' },
  null: { categoriaSlug: 'other', areaSlug: 'outra' },
  '': { categoriaSlug: 'other', areaSlug: 'outra' },
  ' ': { categoriaSlug: 'other', areaSlug: 'outra' },
};

// ==========================================
// Normalizacao de string
// ==========================================

/**
 * Normaliza um valor de area_atuacao para busca no mapeamento.
 * Passos: lowercase, trim, collapse de espacos duplicados.
 */
function normalize(value: string | null | undefined): string {
  if (!value) return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ==========================================
// Main
// ==========================================

async function main(): Promise<void> {
  console.log('[backfill-categoria-area] ==========================================');
  console.log(`[backfill-categoria-area] Modo: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`[backfill-categoria-area] DATABASE: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // ----------------------------------------------------------
    // PASSO 1: Inventariar valores unicos
    // ----------------------------------------------------------
    console.log('[backfill-categoria-area] PASSO 1: Inventariando valores unicos de area_atuacao...');

    const [distinctRows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT DISTINCT area_atuacao FROM startups WHERE area_atuacao IS NOT NULL AND area_atuacao != ""',
    );

    const distinctValues = distinctRows.map((r) => r.area_atuacao as string);
    console.log(`[backfill-categoria-area] Valores distintos encontrados: ${distinctValues.length}`);
    if (distinctValues.length > 0) {
      console.log('[backfill-categoria-area] Lista:', JSON.stringify(distinctValues));
    }

    // ----------------------------------------------------------
    // PASSO 2: Carregar cache de IDs (category e area)
    // ----------------------------------------------------------
    console.log('[backfill-categoria-area] PASSO 2: Carregando cache de categories e areas...');

    const [categoryRows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id, slug FROM categories',
    );
    const [areaRows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id, slug, categoryId FROM areas_atuacao',
    );

    const categoryIdBySlug = new Map<string, number>();
    for (const r of categoryRows) {
      categoryIdBySlug.set(r.slug as string, r.id as number);
    }

    const areaIdBySlug = new Map<string, number>();
    for (const r of areaRows) {
      areaIdBySlug.set(r.slug as string, r.id as number);
    }

    const otherCategoryId = categoryIdBySlug.get('other');
    const outraAreaId = areaIdBySlug.get('outra');

    if (!otherCategoryId || !outraAreaId) {
      throw new Error(`Falha ao carregar ID de fallback: other=${otherCategoryId}, outra=${outraAreaId}`);
    }

    console.log(`[backfill-categoria-area] Cache: ${categoryIdBySlug.size} categorias, ${areaIdBySlug.size} areas`);
    console.log(`[backfill-categoria-area] Fallback: otherCategoryId=${otherCategoryId}, outraAreaId=${outraAreaId}`);

    // ----------------------------------------------------------
    // PASSO 3: Processar cada startup
    // ----------------------------------------------------------
    console.log('[backfill-categoria-area] PASSO 3: Processando startups...');

    const [startupRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT id, area_atuacao, categoryId, areaAtuacaoId, needs_manual_review
       FROM startups
       WHERE area_atuacao IS NOT NULL AND area_atuacao != "" AND categoryId IS NULL`,
    );

    let backfilled_ok = 0;
    let needs_manual_review = 0;
    const distinct_unmapped: string[] = [];
    const unmappedSet = new Set<string>();

    for (const row of startupRows) {
      const id = row.id as number;
      const rawAreaAtuacao = row.area_atuacao as string;
      const normalized = normalize(rawAreaAtuacao);

      const mapping = MAPEAMENTO_MANUAL[normalized] ?? MAPEAMENTO_MANUAL[rawAreaAtuacao.trim()];

      if (mapping) {
        const catId = categoryIdBySlug.get(mapping.categoriaSlug);
        const areaId = areaIdBySlug.get(mapping.areaSlug);

        if (catId && areaId) {
          if (DRY_RUN) {
            console.log(`[DRY-RUN] UPDATE startup ${id}: area_atuacao="${rawAreaAtuacao}" -> categoryId=${catId}, areaAtuacaoId=${areaId}`);
          } else {
            await connection.query(
              `UPDATE startups SET categoryId = ?, areaAtuacaoId = ?, needs_manual_review = false WHERE id = ?`,
              [catId, areaId, id],
            );
          }
          backfilled_ok++;
        } else {
          // Mapeamento existe mas slug nao encontrado no banco
          console.warn(`[WARN] Mapeamento encontrado para "${rawAreaAtuacao}" mas slug nao existe no DB: categoria=${mapping.categoriaSlug}, area=${mapping.areaSlug}`);
          if (!unmappedSet.has(rawAreaAtuacao)) {
            unmappedSet.add(rawAreaAtuacao);
            distinct_unmapped.push(rawAreaAtuacao);
          }
          if (DRY_RUN) {
            console.log(`[DRY-RUN] UPDATE startup ${id}: area_atuacao="${rawAreaAtuacao}" -> needs_manual_review=true (fallback other/outra)`);
          } else {
            await connection.query(
              `UPDATE startups SET categoryId = ?, areaAtuacaoId = ?, needs_manual_review = true WHERE id = ?`,
              [otherCategoryId, outraAreaId, id],
            );
          }
          needs_manual_review++;
        }
      } else {
        // Sem mapeamento - fallback
        if (!unmappedSet.has(rawAreaAtuacao)) {
          unmappedSet.add(rawAreaAtuacao);
          distinct_unmapped.push(rawAreaAtuacao);
        }
        if (DRY_RUN) {
          console.log(`[DRY-RUN] UPDATE startup ${id}: area_atuacao="${rawAreaAtuacao}" -> needs_manual_review=true (fallback other/outra)`);
        } else {
          await connection.query(
            `UPDATE startups SET categoryId = ?, areaAtuacaoId = ?, needs_manual_review = true WHERE id = ?`,
            [otherCategoryId, outraAreaId, id],
          );
        }
        needs_manual_review++;
      }
    }

    // ----------------------------------------------------------
    // PASSO 4: Log final
    // ----------------------------------------------------------
    const total_processed = startupRows.length;

    const result = {
      total_processed,
      backfilled_ok,
      needs_manual_review,
      mapping_size: Object.keys(MAPEAMENTO_MANUAL).length,
      distinct_unmapped,
      idempotent: true,
      dry_run: DRY_RUN,
    };

    console.log('[backfill-categoria-area] ==========================================');
    console.log('[backfill-categoria-area] RESULTADO FINAL:');
    console.log(JSON.stringify(result, null, 2));

    // Validacao pos-execucao
    if (!DRY_RUN) {
      const [remainingNull] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as cnt FROM startups WHERE area_atuacao IS NOT NULL AND categoryId IS NULL',
      );
      console.log(`[backfill-categoria-area] Validacao: startups com area_atuacao IS NOT NULL E categoryId IS NULL = ${remainingNull[0].cnt}`);

      const [reviewCount] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as cnt FROM startups WHERE needs_manual_review = true',
      );
      console.log(`[backfill-categoria-area] Validacao: needs_manual_review = true => ${reviewCount[0].cnt}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('[backfill-categoria-area] ERRO:', err);
  process.exit(1);
});
