import { getSeedPrismaClient, resolveProvider } from './seed-client-helper';
import 'dotenv/config';

/**
 * Seed inicial de 69 areas de atuação conforme ADR-007 §3.3.
 */

const AREAS_BY_CATEGORY: Record<string, Array<{ slug: string; nome: string; ordem: number }>> = {
  fintech: [
    { slug: 'conta_digital_pf',          nome: 'Conta Digital PF',              ordem: 1  },
    { slug: 'conta_digital_pj',          nome: 'Conta Digital PJ',              ordem: 2  },
    { slug: 'pagamentos_pix',             nome: 'Pagamentos PIX',                 ordem: 3  },
    { slug: 'adquirencia',                nome: 'Adquirência',                   ordem: 4  },
    { slug: 'emprestimos_p2p',            nome: 'Empréstimos P2P',              ordem: 5  },
    { slug: 'investimentos',              nome: 'Investimentos',                  ordem: 6  },
    { slug: 'banking_as_service',         nome: 'Banking as a Service',         ordem: 7  },
    { slug: 'seguros',                   nome: 'Seguros',                       ordem: 8  },
    { slug: 'crypto_fintech',            nome: 'Crypto & Fintech',             ordem: 9  },
    { slug: 'gestao_financeira_pessoal', nome: 'Gestão Financeira Pessoal',     ordem: 10 },
  ],
  edtech: [
    { slug: 'educacao_basica',           nome: 'Educação Básica',               ordem: 1  },
    { slug: 'educacao_superior',         nome: 'Educação Superior',             ordem: 2  },
    { slug: 'cursos_online',             nome: 'Cursos Online',                 ordem: 3  },
    { slug: 'idiomas',                   nome: 'Idiomas',                       ordem: 4  },
    { slug: 'educacao_corporativa',      nome: 'Educação Corporativa',         ordem: 5  },
    { slug: 'edtech_infantil',           nome: 'Edtech Infantil',               ordem: 6  },
    { slug: 'gamificacao_ensino',        nome: 'Gamificação no Ensino',         ordem: 7  },
    { slug: 'gestao_escolar',            nome: 'Gestão Escolar',               ordem: 8  },
  ],
  healthtech: [
    { slug: 'telemedicina',              nome: 'Telemedicina',                 ordem: 1  },
    { slug: 'gestao_hospitalar',         nome: 'Gestão Hospitalar',            ordem: 2  },
    { slug: 'dispositivos_medicos',      nome: 'Dispositivos Médicos / IoT',    ordem: 3  },
    { slug: 'prontuario_eletronico',     nome: 'Prontuário Eletrônico',        ordem: 4  },
    { slug: 'saude_mental',              nome: 'Saúde Mental',                  ordem: 5  },
    { slug: 'farmacia_digital',          nome: 'Farmácia Digital',              ordem: 6  },
    { slug: 'diagnostico_ia',            nome: 'Diagnóstico por IA',           ordem: 7  },
    { slug: 'biotecnologia_medica',      nome: 'Biotecnologia Médica',          ordem: 8  },
  ],
  ai: [
    { slug: 'ia_generativa',             nome: 'IA Generativa',                 ordem: 1  },
    { slug: 'visao_computacional',       nome: 'Visão Computacional',           ordem: 2  },
    { slug: 'processamento_linguagem',   nome: 'Processamento de Linguagem (NLP)', ordem: 3 },
    { slug: 'analise_preditiva',         nome: 'Análise Preditiva',             ordem: 4  },
    { slug: 'automacao_processos_rpa',   nome: 'Automação de Processos (RPA)',  ordem: 5  },
    { slug: 'agentes_autonomos',         nome: 'Agentes Autônomos',             ordem: 6  },
  ],
  saas: [
    { slug: 'crm_vendas',                nome: 'CRM & Vendas',                  ordem: 1  },
    { slug: 'erp_gestao',                nome: 'ERP & Gestão Empresarial',      ordem: 2  },
    { slug: 'marketing_digital',         nome: 'Marketing Digital & MarTech',  ordem: 3  },
    { slug: 'recursos_humanos_hrtech',   nome: 'Recursos Humanos / HRTech',     ordem: 4  },
    { slug: 'atendimento_helpdesk',      nome: 'Atendimento & Helpdesk',        ordem: 5  },
    { slug: 'seguranca_informacao',      nome: 'Segurança da Informação / Cyber', ordem: 6 },
    { slug: 'business_intelligence_bi',  nome: 'Business Intelligence (BI)',    ordem: 7  },
    { slug: 'produtividade_colaboracao', nome: 'Produtividade & Colaboração',   ordem: 8  },
  ],
  biotech: [
    { slug: 'genomica_edicao',           nome: 'Genômica & Edição Genética',    ordem: 1  },
    { slug: 'biofarmacos',               nome: 'Biofármacos & Vacinas',         ordem: 2  },
    { slug: 'biomateriais',              nome: 'Biomateriais & Biofibras',      ordem: 3  },
  ],
  agrotech: [
    { slug: 'agricultura_precisao',      nome: 'Agricultura de Precisão',       ordem: 1  },
    { slug: 'monitoramento_safra',       nome: 'Monitoramento de Safra (Drones/Satélite)', ordem: 2 },
    { slug: 'gestao_fazenda',            nome: 'Gestão de Fazendas (Farm Mgmt)', ordem: 3 },
    { slug: 'credito_agricola',          nome: 'Crédito & Finanças Agrícolas',  ordem: 4  },
    { slug: 'biopesticidas',             nome: 'Biopesticidas & Bioinsumos',    ordem: 5  },
  ],
  proptech: [
    { slug: 'marketplace_imoveis',       nome: 'Marketplace de Imóveis',        ordem: 1  },
    { slug: 'gestao_aluguel',            nome: 'Gestão de Aluguel & Condomínios', ordem: 2 },
    { slug: 'tokenizacao_imobiliaria',   nome: 'Tokenização Imobiliária',       ordem: 3  },
    { slug: 'construcao_contech',        nome: 'Construtech / ConTech',         ordem: 4  },
    { slug: 'crowdfunding_imobiliario',  nome: 'Crowdfunding Imobiliário',      ordem: 5  },
  ],
  logistics: [
    { slug: 'gestao_frotas',             nome: 'Gestão de Frotas & Rastreamento', ordem: 1 },
    { slug: 'last_mile_delivery',        nome: 'Entrega Last-Mile',             ordem: 2  },
    { slug: 'frete_digital',             nome: 'Marketplace de Fretes',         ordem: 3  },
    { slug: 'armazenagem_wms',           nome: 'Armazenagem & WMS',             ordem: 4  },
    { slug: 'cadeia_suprimentos_scm',    nome: 'Cadeia de Suprimentos (SCM)',    ordem: 5  },
  ],
  cleantech: [
    { slug: 'energia_solar',             nome: 'Energia Solar & Renovável',     ordem: 1  },
    { slug: 'credito_carbono',           nome: 'Crédito de Carbono & ESG',      ordem: 2  },
    { slug: 'gestao_residuos',           nome: 'Gestão de Resíduos & Reciclagem', ordem: 3 },
    { slug: 'eficiencia_energetica',     nome: 'Eficiência Energética',         ordem: 4  },
  ],
  retail_tech: [
    { slug: 'e_commerce_enablers',       nome: 'E-commerce Enablers',           ordem: 1  },
    { slug: 'pdv_automacao_loja',        nome: 'PDV & Automação de Loja',       ordem: 2  },
    { slug: 'social_commerce',           nome: 'Social Commerce',               ordem: 3  },
    { slug: 'logistica_reversa_varejo',  nome: 'Logística Reversa no Varejo',   ordem: 4  },
  ],
  other: [
    { slug: 'geral_outras',              nome: 'Geral / Outras Atuações',       ordem: 1  },
  ],
};

async function main() {
  const prisma = getSeedPrismaClient();
  const provider = resolveProvider();
  const totalAreas = Object.values(AREAS_BY_CATEGORY).reduce((acc, areas) => acc + areas.length, 0);
  console.log(`🌱 Seed de ${totalAreas} áreas em ${Object.keys(AREAS_BY_CATEGORY).length} categorias...`);

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let areasCreated = 0;
  let areasUpdated = 0;

  for (const [categorySlug, areas] of Object.entries(AREAS_BY_CATEGORY)) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });

    if (!category) {
      console.warn(`⚠️ Categoria "${categorySlug}" não encontrada — pulando suas ${areas.length} área(s)`);
      continue;
    }

    const categoryId = category.id;

    for (const area of areas) {
      if (provider === 'sqlite') {
        await prisma.areaAtuacao.upsert({
          where: { slug: area.slug },
          update: { nome: area.nome, categoryId, ordem: area.ordem },
          create: { slug: area.slug, nome: area.nome, categoryId, ordem: area.ordem },
        });
        areasCreated++;
      } else {
        const result = await prisma.$executeRaw`
          INSERT INTO areas_atuacao (slug, nome, categoryId, ordem, createdAt, updatedAt)
          VALUES (${area.slug}, ${area.nome}, ${categoryId}, ${area.ordem}, ${now}, ${now})
          ON DUPLICATE KEY UPDATE
            nome = VALUES(nome),
            categoryId = VALUES(categoryId),
            ordem = VALUES(ordem),
            updatedAt = VALUES(updatedAt)
        `;
        if (result === 1) areasCreated++;
        else if (result === 2) areasUpdated++;
      }
    }
    console.log(`  Seed ${areas.length} área(s) na categoria "${categorySlug}"`);
  }

  console.log(`✅ Áreas seed: ${areasCreated} criada(s), ${areasUpdated} atualizada(s), ${totalAreas} total`);
  await prisma.$disconnect();
}

export async function seedAreas() {
  await main();
}

if (require.main === module) {
  main().catch((e) => {
    console.error('❌ Erro ao executar seed-areas:', e);
    process.exit(1);
  });
}
