/**
 * Blueprints das 20 startups da seed enriquecida.
 *
 * Cada blueprint contém os dados necessários para criar:
 * - 1 founder User (role=FOUNDER)
 * - 1 KYCProfile para o logo
 * - 1 KYCProfile para o pitch.pdf
 * - 1 Startup (status=APPROVED)
 * - 1 Campaign (status=OPEN)
 * - Atribuição de selos automáticos (STAGE + startup_verificada + startup) e manuais
 */

export type Estagio =
  | 'ideação'
  | 'mvp'
  | 'tração'
  | 'operação'
  | 'break-even'
  | 'acelerada';

export type CategoryCode =
  | 'FINTECH'
  | 'AI'
  | 'SAAS'
  | 'HEALTHTECH'
  | 'EDTECH'
  | 'BIOTECH'
  | 'OTHER';

export interface StartupBlueprint {
  slug: string;
  name: string;
  cnpj: string;
  category: CategoryCode;
  area_atuacao: string;
  estagio: Estagio;
  score: number;
  descricao: string;
  problema: string;
  solucao: string;
  modelo_receita: string;
  founder: {
    nome: string;
    email: string;
    cpf: string;
  };
  campaign: {
    targetAmount: number;
    minInvestment: number;
    valuation: number;
    tokenPrice: number;
    totalTokens: number;
    tokensSold: number;
  };
  manualSeals: string[];
  /**
   * URL publica de imagem para o logo. A seed baixa e sobe para o AWS S3
   * bucket `image` (com fallback gracioso para URL externa se o S3 estiver
   * offline). Use PNGs/JPGs publicos (picsum.photos, unsplash com CDN).
   */
  imageUrl: string;
  /**
   * Quais "slots" de marketplace esta startup deve aparecer.
   * Mapeamento:
   *   - 'featured'    => score > 0 (ja garantido por `score` > 0)
   *   - 'verified'    => verificationStatus = 'VERIFIED'
   *   - 'accelerated' => isAccelerated = true (campo novo M10)
   *   - 'approval'    => status = 'PENDING_CURATOR_REVIEW' (curador analisando)
   */
  marketplaceTags: MarketplaceTag[];
  /**
   * Estado da startup na seed — simula cenários reais de produção:
   *   - 'DRAFT'   → founder ainda não pagou reserva / falta documento. Status
   *                  fica `PENDING_CURATOR_REVIEW` (curadoria pendente) e SEM
   *                  Campaign. Aparece só no painel do founder.
   *   - 'OPEN'    → captação ativa. Status `APPROVED` + `Campaign` OPEN + docs CVM.
   *   - 'FUNDED'  → captação concluída. `Campaign` FUNDED + Repasse com
   *                  Installments (parte paga, parte pendente) + posts no portal.
   * Default = 'OPEN' (mantém compatibilidade com blueprints legados).
   */
  state?: 'DRAFT' | 'OPEN' | 'FUNDED';
  /** Equipe fundadora adicional (popula JSON `teams`). */
  team?: Array<{ nome: string; cargo: string }>;
}

export type MarketplaceTag =
  | 'featured'
  | 'verified'
  | 'accelerated'
  | 'approval';

export const STARTUP_BLUEPRINTS: StartupBlueprint[] = [
  {
    slug: 'neuralforge',
    name: 'NeuralForge',
    cnpj: '12.345.678/0001-01',
    category: 'AI',
    area_atuacao: 'AI',
    estagio: 'tração',
    score: 92,
    descricao:
      'IA generativa especializada em automação de contratos jurídicos complexos.',
    problema:
      'Escritórios de advocacia gastam 60% do tempo em tarefas repetitivas de revisão.',
    solucao:
      'Plataforma de IA que revisa, sugere cláusulas e identifica riscos em contratos em segundos.',
    modelo_receita: 'SaaS B2B com tier por volume de contratos analisados/mês.',
    founder: {
      nome: 'Mariana Costa',
      email: 'mariana@neuralforge.io',
      cpf: '111.111.111-01',
    },
    campaign: {
      targetAmount: 4_500_000,
      minInvestment: 1_000,
      valuation: 22_000_000,
      tokenPrice: 200,
      totalTokens: 90_000,
      tokensSold: 63_000,
    },
    manualSeals: ['aws', 'potencial_unicornio'],
    imageUrl: `https://picsum.photos/seed/neuralforge/800/800`,
    marketplaceTags: ['featured', 'verified'],
  },
  {
    slug: 'payswift',
    name: 'PaySwift',
    cnpj: '12.345.678/0001-02',
    category: 'FINTECH',
    area_atuacao: 'Fintech',
    estagio: 'operação',
    score: 88,
    descricao:
      'Solução de liquidação instantânea para o agronegócio via blockchain.',
    problema:
      'Pagamentos no agro têm prazo de 30-45 dias, prejudicando capital de giro.',
    solucao:
      'Liquidação D+0 com tokenização de recebíveis e custódia institucional.',
    modelo_receita:
      'Taxa de 0,8% por transação + assinatura mensal por produtor cadastrado.',
    founder: {
      nome: 'Rafael Mendes',
      email: 'rafael@payswift.com.br',
      cpf: '111.111.111-02',
    },
    campaign: {
      targetAmount: 6_000_000,
      minInvestment: 1_000,
      valuation: 30_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 80_000,
    },
    manualSeals: ['aws', 'potencial_unicornio'],
    imageUrl: `https://picsum.photos/seed/payswift/800/800`,
    marketplaceTags: ['featured', 'accelerated'],
  },
  {
    slug: 'medicoreflex',
    name: 'MedCoreFlex',
    cnpj: '12.345.678/0001-03',
    category: 'HEALTHTECH',
    area_atuacao: 'Healthtech',
    estagio: 'break-even',
    score: 85,
    descricao: 'Telemedicina de alta precisão com integração de IoT vestível.',
    problema:
      'Telemedicina perde nuance clínica sem dados em tempo real do paciente.',
    solucao:
      'Plataforma que conecta wearables (FitBit, Apple Watch, Oura) ao prontuário.',
    modelo_receita:
      'Licenciamento por clínica + revenue share com fabricantes de wearables.',
    founder: {
      nome: 'Dra. Camila Souza',
      email: 'camila@medcoreflex.health',
      cpf: '111.111.111-03',
    },
    campaign: {
      targetAmount: 5_000_000,
      minInvestment: 500,
      valuation: 28_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 75_000,
    },
    manualSeals: ['founders_hunter', 'potencial_unicornio'],
    imageUrl: `https://picsum.photos/seed/medicoreflex/800/800`,
    marketplaceTags: ['verified', 'accelerated'],
    state: 'FUNDED',
  },
  {
    slug: 'edusphere',
    name: 'EduSphere',
    cnpj: '12.345.678/0001-04',
    category: 'EDTECH',
    area_atuacao: 'EdTech',
    estagio: 'tração',
    score: 82,
    descricao:
      'Gamificação do ensino fundamental com trilhas adaptativas de IA.',
    problema:
      'Educação fundamental é monolítica; alunos com ritmos diferentes ficam pra trás.',
    solucao:
      'Trilhas que se adaptam ao ritmo de cada aluno via algoritmos de spaced repetition.',
    modelo_receita: 'B2G (secretarias estaduais) + B2C freemium para famílias.',
    founder: {
      nome: 'Pedro Almeida',
      email: 'pedro@edusphere.com.br',
      cpf: '111.111.111-04',
    },
    campaign: {
      targetAmount: 3_500_000,
      minInvestment: 500,
      valuation: 18_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 60_000,
    },
    manualSeals: ['founders_hunter'],
    imageUrl: `https://picsum.photos/seed/edusphere/800/800`,
    marketplaceTags: ['featured', 'approval'],
    state: 'FUNDED',
  },
  {
    slug: 'biogenix',
    name: 'BioGenix',
    cnpj: '12.345.678/0001-05',
    category: 'BIOTECH',
    area_atuacao: 'Biotech',
    estagio: 'operação',
    score: 78,
    descricao:
      'Edição genética para sementes ultra-resistentes em climas tropicais.',
    problema:
      'Mudanças climáticas reduzem produtividade agrícola em até 25% no Cerrado.',
    solucao:
      'Variedades CRISPR-edited resistentes a seca e pragas, validadas com Embrapa.',
    modelo_receita:
      'Royalties por hectare plantado + venda direta de sementes.',
    founder: {
      nome: 'Dr. Lucas Ferreira',
      email: 'lucas@biogenix.bio',
      cpf: '111.111.111-05',
    },
    campaign: {
      targetAmount: 8_000_000,
      minInvestment: 2_000,
      valuation: 40_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 55_000,
    },
    manualSeals: ['aws'],
    imageUrl: `https://picsum.photos/seed/biogenix/800/800`,
    marketplaceTags: ['accelerated'],
  },
  {
    slug: 'cloudpilot',
    name: 'CloudPilot',
    cnpj: '12.345.678/0001-06',
    category: 'SAAS',
    area_atuacao: 'SaaS',
    estagio: 'tração',
    score: 72,
    descricao: 'Gestão centralizada de frotas logísticas para médias empresas.',
    problema: 'Empresas usam 4-6 ferramentas paralelas para gerenciar frota.',
    solucao:
      'Hub único integrando rastreamento, manutenção, combustível e jornada de motorista.',
    modelo_receita: 'SaaS por veículo/mês.',
    founder: {
      nome: 'Juliana Rocha',
      email: 'juliana@cloudpilot.app',
      cpf: '111.111.111-06',
    },
    campaign: {
      targetAmount: 2_500_000,
      minInvestment: 500,
      valuation: 12_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 50_000,
    },
    manualSeals: ['aws'],
    imageUrl: `https://picsum.photos/seed/cloudpilot/800/800`,
    marketplaceTags: ['featured', 'verified', 'accelerated'],
  },
  {
    slug: 'tokenvault',
    name: 'TokenVault',
    cnpj: '12.345.678/0001-07',
    category: 'FINTECH',
    area_atuacao: 'Fintech',
    estagio: 'mvp',
    score: 65,
    descricao:
      'Custódia institucional de ativos digitais para tesourarias corporativas.',
    problema:
      'Tesourarias corporativas não têm soluções regulatórias para custodiar cripto.',
    solucao: 'Custódia com seguro, multi-sig e compliance CVM/BCB.',
    modelo_receita: 'Taxa de custódia % AUC + fee por transação.',
    founder: {
      nome: 'André Lima',
      email: 'andre@tokenvault.fin',
      cpf: '111.111.111-07',
    },
    campaign: {
      targetAmount: 4_000_000,
      minInvestment: 1_000,
      valuation: 20_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 35_000,
    },
    manualSeals: ['founders_hunter'],
    imageUrl: `https://picsum.photos/seed/tokenvault/800/800`,
    marketplaceTags: ['verified'],
  },
  {
    slug: 'greenfleet',
    name: 'GreenFleet',
    cnpj: '12.345.678/0001-08',
    category: 'OTHER',
    area_atuacao: 'Mobilidade',
    estagio: 'tração',
    score: 58,
    descricao:
      'Locação corporativa de veículos elétricos com gestão de carga otimizada.',
    problema:
      'Empresas querem eletrificar frota, mas a infra de carga inviabiliza.',
    solucao:
      'Locação chave-na-mão incluindo wallboxes, software de carga e energia renovável.',
    modelo_receita: 'Mensalidade por veículo (all-inclusive).',
    founder: {
      nome: 'Bruno Tavares',
      email: 'bruno@greenfleet.eco',
      cpf: '111.111.111-08',
    },
    campaign: {
      targetAmount: 5_500_000,
      minInvestment: 1_000,
      valuation: 22_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 40_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/greenfleet/800/800`,
    marketplaceTags: ['accelerated', 'approval'],
  },
  {
    slug: 'aurorasaas',
    name: 'AuroraSaaS',
    cnpj: '12.345.678/0001-09',
    category: 'SAAS',
    area_atuacao: 'SaaS',
    estagio: 'mvp',
    score: 52,
    descricao:
      'Plataforma de colaboração remota com foco em times de engenharia.',
    problema:
      'Slack + Notion + Linear + GitHub não conversam; engenheiros trocam de contexto demais.',
    solucao:
      'Hub unificado com integrações nativas e foco em workflow de devs.',
    modelo_receita: 'Per-seat com tier free.',
    founder: {
      nome: 'Carla Vieira',
      email: 'carla@aurorasaas.tech',
      cpf: '111.111.111-09',
    },
    campaign: {
      targetAmount: 2_000_000,
      minInvestment: 500,
      valuation: 10_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 30_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/aurorasaas/800/800`,
    marketplaceTags: ['featured'],
    state: 'DRAFT',
  },
  {
    slug: 'brainpath',
    name: 'BrainPath',
    cnpj: '12.345.678/0001-10',
    category: 'AI',
    area_atuacao: 'AI',
    estagio: 'mvp',
    score: 48,
    descricao: 'IA conversacional para suporte ao cliente em e-commerce.',
    problema:
      'Chatbots genéricos não resolvem 70% das dúvidas; clientes desistem.',
    solucao:
      'Modelo fine-tunado por loja com base em histórico de conversas e produtos.',
    modelo_receita: 'Per conversa resolvida (success-based) + setup fee.',
    founder: {
      nome: 'Felipe Castro',
      email: 'felipe@brainpath.ai',
      cpf: '111.111.111-10',
    },
    campaign: {
      targetAmount: 1_800_000,
      minInvestment: 500,
      valuation: 9_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 28_000,
    },
    manualSeals: ['aws'],
    imageUrl: `https://picsum.photos/seed/brainpath/800/800`,
    marketplaceTags: ['verified', 'approval'],
  },
  {
    slug: 'clinilink',
    name: 'CliniLink',
    cnpj: '12.345.678/0001-11',
    category: 'HEALTHTECH',
    area_atuacao: 'Healthtech',
    estagio: 'tração',
    score: 42,
    descricao:
      'Integração de prontuários médicos via blockchain permissionada.',
    problema:
      'Prontuários ficam presos a cada operadora; paciente precisa repetir exames.',
    solucao:
      'Rede permissionada onde paciente é dono dos dados e libera acesso.',
    modelo_receita: 'B2B clínicas + B2B operadoras de saúde.',
    founder: {
      nome: 'Beatriz Oliveira',
      email: 'bia@clinilink.med',
      cpf: '111.111.111-11',
    },
    campaign: {
      targetAmount: 3_000_000,
      minInvestment: 500,
      valuation: 14_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 22_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/clinilink/800/800`,
    marketplaceTags: ['featured', 'accelerated'],
  },
  {
    slug: 'learnflow',
    name: 'LearnFlow',
    cnpj: '12.345.678/0001-12',
    category: 'EDTECH',
    area_atuacao: 'EdTech',
    estagio: 'mvp',
    score: 38,
    descricao: 'Treinamento corporativo imersivo com realidade virtual.',
    problema:
      'Treinamentos presenciais são caros; e-learning tem 10% de retenção.',
    solucao:
      'Headsets VR + biblioteca de treinos imersivos por setor (saúde, indústria, varejo).',
    modelo_receita: 'B2B per-headset/mês + biblioteca por assinatura.',
    founder: {
      nome: 'Tatiana Reis',
      email: 'tatiana@learnflow.vr',
      cpf: '111.111.111-12',
    },
    campaign: {
      targetAmount: 2_200_000,
      minInvestment: 1_000,
      valuation: 11_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 18_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/learnflow/800/800`,
    marketplaceTags: ['verified'],
  },
  {
    slug: 'agroseed',
    name: 'AgroSeed',
    cnpj: '12.345.678/0001-13',
    category: 'BIOTECH',
    area_atuacao: 'Biotech',
    estagio: 'ideação',
    score: 32,
    descricao:
      'Desenvolvimento de biomateriais sintéticos para a indústria têxtil.',
    problema:
      'Algodão consome 4% da água doce mundial; alternativas sintéticas são derivadas de petróleo.',
    solucao:
      'Fibras produzidas por bactérias geneticamente modificadas, biodegradáveis.',
    modelo_receita:
      'Licenciamento da tecnologia + venda direta de fibras a marcas premium.',
    founder: {
      nome: 'Dr. Gustavo Pinto',
      email: 'gustavo@agroseed.bio',
      cpf: '111.111.111-13',
    },
    campaign: {
      targetAmount: 6_000_000,
      minInvestment: 2_000,
      valuation: 25_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 12_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/agroseed/800/800`,
    marketplaceTags: ['accelerated', 'approval'],
    state: 'FUNDED',
  },
  {
    slug: 'retailops',
    name: 'RetailOps',
    cnpj: '12.345.678/0001-14',
    category: 'SAAS',
    area_atuacao: 'SaaS',
    estagio: 'operação',
    score: 28,
    descricao:
      'Sistema unificado de gestão de operações para varejo físico médio.',
    problema: 'Lojistas usam ERP de 2005 + planilhas; insights chegam tarde.',
    solucao:
      'Dashboard tempo real com automações de reposição e precificação dinâmica.',
    modelo_receita: 'SaaS por loja/mês.',
    founder: {
      nome: 'Patrícia Gomes',
      email: 'patricia@retailops.io',
      cpf: '111.111.111-14',
    },
    campaign: {
      targetAmount: 1_500_000,
      minInvestment: 500,
      valuation: 7_500_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 8_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/retailops/800/800`,
    marketplaceTags: ['featured'],
  },
  {
    slug: 'pixglobal',
    name: 'PixGlobal',
    cnpj: '12.345.678/0001-15',
    category: 'FINTECH',
    area_atuacao: 'Fintech',
    estagio: 'mvp',
    score: 22,
    descricao: 'Remessas internacionais Pix-to-Pix com liquidação D+0.',
    problema: 'Remessa Brasil-EUA custa 4-7% e demora 3-5 dias úteis.',
    solucao: 'Roteamento via stablecoin com liquidação Pix nas duas pontas.',
    modelo_receita: 'Spread de 0,5%-1% por remessa.',
    founder: {
      nome: 'Henrique Sales',
      email: 'henrique@pixglobal.fx',
      cpf: '111.111.111-15',
    },
    campaign: {
      targetAmount: 2_500_000,
      minInvestment: 500,
      valuation: 10_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 6_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/pixglobal/800/800`,
    marketplaceTags: ['verified', 'accelerated'],
    state: 'DRAFT',
  },
  {
    slug: 'datavision',
    name: 'DataVision',
    cnpj: '12.345.678/0001-16',
    category: 'AI',
    area_atuacao: 'AI',
    estagio: 'mvp',
    score: 18,
    descricao: 'Visão computacional para inspeção de qualidade industrial.',
    problema: 'Inspeção visual humana tem 5-10% de falha em linha de produção.',
    solucao:
      'Câmeras + modelos custom treinados para detectar defeitos com 99% precisão.',
    modelo_receita: 'Licença por câmera + assinatura SaaS de modelos.',
    founder: {
      nome: 'Laura Santos',
      email: 'laura@datavision.cv',
      cpf: '111.111.111-16',
    },
    campaign: {
      targetAmount: 1_800_000,
      minInvestment: 500,
      valuation: 9_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 4_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/datavision/800/800`,
    marketplaceTags: ['featured', 'approval'],
    state: 'FUNDED',
  },
  {
    slug: 'safehome',
    name: 'SafeHome',
    cnpj: '12.345.678/0001-17',
    category: 'OTHER',
    area_atuacao: 'IoT',
    estagio: 'ideação',
    score: 12,
    descricao:
      'Segurança residencial inteligente com IA federada (privacidade-first).',
    problema:
      'Câmeras de segurança expõem dados sensíveis a serviços de nuvem.',
    solucao:
      'Detecção on-device com modelo federado; vídeo nunca sai da residência.',
    modelo_receita: 'Hardware (câmera/hub) + assinatura de monitoramento.',
    founder: {
      nome: 'Marcos Pereira',
      email: 'marcos@safehome.iot',
      cpf: '111.111.111-17',
    },
    campaign: {
      targetAmount: 1_200_000,
      minInvestment: 500,
      valuation: 6_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 2_000,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/safehome/800/800`,
    marketplaceTags: ['verified'],
    state: 'DRAFT',
  },
  {
    slug: 'logixchain',
    name: 'LogixChain',
    cnpj: '12.345.678/0001-18',
    category: 'OTHER',
    area_atuacao: 'Logística',
    estagio: 'acelerada',
    score: 8,
    descricao:
      'Cadeia de suprimentos rastreável via blockchain para alimentos premium.',
    problema:
      'Consumidor premium não tem como verificar origem real de alimentos especiais.',
    solucao:
      'Token por lote + selo QR no produto final ligando ao histórico completo.',
    modelo_receita: 'Per-lote registrado + integração ERP.',
    founder: {
      nome: 'Renata Cardoso',
      email: 'renata@logixchain.bio',
      cpf: '111.111.111-18',
    },
    campaign: {
      targetAmount: 800_000,
      minInvestment: 500,
      valuation: 4_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 1_500,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/logixchain/800/800`,
    marketplaceTags: ['accelerated'],
  },
  {
    slug: 'vibedeck',
    name: 'VibeDeck',
    cnpj: '12.345.678/0001-19',
    category: 'OTHER',
    area_atuacao: 'Entretenimento',
    estagio: 'operação',
    score: 4,
    descricao:
      'Marketplace P2P de ingressos com revenda regulada e prevenção de cambismo.',
    problema:
      'Cambistas distorcem mercado de ingressos e organizadores não recebem nada da revenda.',
    solucao:
      'Tokens NFT por ingresso, com cap de revenda e split automático com organizador.',
    modelo_receita: 'Taxa de 5% por revenda.',
    founder: {
      nome: 'Diego Martins',
      email: 'diego@vibedeck.live',
      cpf: '111.111.111-19',
    },
    campaign: {
      targetAmount: 600_000,
      minInvestment: 200,
      valuation: 3_000_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 800,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/vibedeck/800/800`,
    marketplaceTags: ['featured', 'accelerated'],
    state: 'DRAFT',
  },
  {
    slug: 'nestopay',
    name: 'NestoPay',
    cnpj: '12.345.678/0001-20',
    category: 'FINTECH',
    area_atuacao: 'Fintech',
    estagio: 'ideação',
    score: 0,
    descricao: 'Conta digital para imigrantes recentes no Brasil.',
    problema:
      'Imigrantes sem CPF ativo demoram 3-6 meses para abrir conta bancária.',
    solucao:
      'Onboarding com passaporte + comprovante de residência; conta + cartão pré-pago.',
    modelo_receita:
      'Mensalidade simbólica + spread em câmbio + parcerias B2B com empresas que contratam expats.',
    founder: {
      nome: 'Sofia Nakamura',
      email: 'sofia@nestopay.global',
      cpf: '111.111.111-20',
    },
    campaign: {
      targetAmount: 500_000,
      minInvestment: 100,
      valuation: 2_500_000,
      tokenPrice: 200,
      totalTokens: 100_000,
      tokensSold: 200,
    },
    manualSeals: [],
    imageUrl: `https://picsum.photos/seed/nestopay/800/800`,
    marketplaceTags: [],
  },
];
