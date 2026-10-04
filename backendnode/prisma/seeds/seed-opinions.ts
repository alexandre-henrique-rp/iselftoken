/**
 * Seed para popular depoimentos e startup-opinions vinculadas a usuários reais e startups com captações concluídas.
 * Executar após o seed principal (seed.ts) ter criado as startups.
 */

import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { getSeedPrismaClient } from './seed-client-helper';
import { seedImageFromUrl, seedImageFromUser } from './seed-image-helper';

interface OpinionAuthorData {
  mensagem: string;
  autor: string;
  email: string;
  cpf: string;
  avatarUrl: string;
  cargos: string[];
  youtube: string | null;
  site: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
}

const STARTUP_OPINIONS: OpinionAuthorData[] = [
  {
    mensagem:
      'A NeuralForge está revolucionando a advocacia com IA. O potencial de crescimento é absurdo e o time é excepcional.',
    autor: 'Carlos Eduardo Silva',
    email: 'carlos.silva.investor@iselftoken.com',
    cpf: '555.111.222-01',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Investidor Anjo', 'Angel Investor'],
    youtube: 'https://youtube.com/@carlosinvestor',
    site: 'https://carlossilva.com.br',
    linkedin: 'https://linkedin.com/in/carloseduardosILVA',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'PaySwift resolve um problema real do agronegócio brasileiro. O modelo de negócio é sólido e o mercado é gigantesco.',
    autor: 'Ana Paula Ribeiro',
    email: 'ana.ribeiro.investor@iselftoken.com',
    cpf: '555.111.222-02',
    avatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
    cargos: ['CEO', 'Investidora'],
    youtube: null,
    site: null,
    linkedin: 'https://linkedin.com/in/anapaularibeiro',
    instagram: 'https://instagram.com/anapaularibeiro',
    facebook: null,
  },
  {
    mensagem:
      'O modelo de receita da GreenHarvest é brilhante. Converte biomassa em energia limpa com Margem de 40%. Investi com confiança.',
    autor: 'Pedro Henrique Santos',
    email: 'pedro.santos.investor@iselftoken.com',
    cpf: '555.111.222-03',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Analista de Investimentos', 'Founder'],
    youtube: 'https://youtube.com/@phsantos',
    site: 'https://phsantos.dev',
    linkedin: 'https://linkedin.com/in/pedrohenriquesantos',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'EdutechHub está democratizando o acesso à educação de qualidade. O impacto social é enorme e o ROI é consistente.',
    autor: 'Juliana Martins Costa',
    email: 'juliana.costa.investor@iselftoken.com',
    cpf: '555.111.222-04',
    avatarUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Diretora de Investimentos', 'Membro do Conselho'],
    youtube: null,
    site: 'https://juliana.com.br',
    linkedin: 'https://linkedin.com/in/julianamartinscosta',
    instagram: 'https://instagram.com/julianamcosta',
    facebook: null,
  },
  {
    mensagem:
      'CryptoFlow tem uma equipe de primeira linha e tecnologia de ponta. O projeto tem potencial de 10x fácil.',
    autor: 'Ricardo Almeida Ferreira',
    email: 'ricardo.ferreira.investor@iselftoken.com',
    cpf: '555.111.222-05',
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Cripto Investidor', 'Trader'],
    youtube: 'https://youtube.com/@ricardoalmeidatrader',
    site: null,
    linkedin: 'https://linkedin.com/in/ricardoalmeidaf',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'MediTech está mudando a forma como diagnósticos são feitos. A redução de custos é de 60% comparando métodos tradicionais.',
    autor: 'Fernanda Lima Sousa',
    email: 'fernanda.sousa.investor@iselftoken.com',
    cpf: '555.111.222-06',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Médica', 'Investidora'],
    youtube: null,
    site: null,
    linkedin: 'https://linkedin.com/in/fernandalimasousa',
    instagram: 'https://instagram.com/drfernandalima',
    facebook: null,
  },
  {
    mensagem:
      'LogiChain resolve um problema trilionário global em gestão de cadeia de suprimentos. O timing não poderia ser melhor.',
    autor: 'Marcos Vinícius Oliveira',
    email: 'marcos.oliveira.investor@iselftoken.com',
    cpf: '555.111.222-07',
    avatarUrl:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Partner', 'Venture Capital'],
    youtube: null,
    site: 'https://mvconsultoria.com',
    linkedin: 'https://linkedin.com/in/marcosviniciusoliveira',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'AgroInteligência está liderando a transformação digital do campo. O mercado agro brasileiro precisa disso urgentemente.',
    autor: 'Patrícia Rodrigues Campos',
    email: 'patricia.campos.investor@iselftoken.com',
    cpf: '555.111.222-08',
    avatarUrl:
      'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Agrônoma', 'Investidora'],
    youtube: 'https://youtube.com/@patriciarcampos',
    site: null,
    linkedin: 'https://linkedin.com/in/patriciarodriguescampos',
    instagram: 'https://instagram.com/patriciaagro',
    facebook: null,
  },
  {
    mensagem:
      'FoodScan elimina desperdício na cadeia alimentar com tecnologia de ponta. Impacto ambiental enorme e rentabilidade validada.',
    autor: 'André Luis Fernandes',
    email: 'andre.fernandes.investor@iselftoken.com',
    cpf: '555.111.222-09',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Serial Entrepreneur', 'Angel'],
    youtube: null,
    site: 'https://andrelemos.com',
    linkedin: 'https://linkedin.com/in/andreluisfernandes',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'FinSecure está resolvendo um problema de segurança que todos os bancos enfrentam. O mercado B2B é enorme e o product-market fit está comprovado.',
    autor: 'Renata Costa Barros',
    email: 'renata.barros.investor@iselftoken.com',
    cpf: '555.111.222-10',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces',
    cargos: ['CISO', 'Advisor'],
    youtube: null,
    site: null,
    linkedin: 'https://linkedin.com/in/renatacostabarros',
    instagram: 'https://instagram.com/renatacbsecurity',
    facebook: null,
  },
];

const DEPOIMENTOS: OpinionAuthorData[] = [
  {
    mensagem:
      'Platform me proporcionou conhecer startups incríveis antes de todo mundo. O retorno tem sido excepcional.',
    autor: 'Thiago Martins Souza',
    email: 'thiago.souza.user@iselftoken.com',
    cpf: '666.111.222-01',
    avatarUrl:
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Investidor Profissional', 'Portfolio Manager'],
    youtube: null,
    site: 'https://thiagomartins.com',
    linkedin: 'https://linkedin.com/in/thiagomartinssouza',
    instagram: 'https://instagram.com/tmartinsinvest',
    facebook: null,
  },
  {
    mensagem:
      'Comecei com pouco mas a plataforma me deu acesso a investimentos que antes só eram possíveis para grandes fundos.',
    autor: 'Luciana Ferreira Lima',
    email: 'luciana.lima.user@iselftoken.com',
    cpf: '666.111.222-02',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Advogada', 'Investidora'],
    youtube: null,
    site: null,
    linkedin: 'https://linkedin.com/in/lucianaferreiralima',
    instagram: 'https://instagram.com/lucianaflinvest',
    facebook: null,
  },
  {
    mensagem:
      'O dashboard de investimentos é super intuitivo. Consigo acompanhar todas as minhas posições em tempo real.',
    autor: 'Felipe Rodrigues Nunes',
    email: 'felipe.nunes.user@iselftoken.com',
    cpf: '666.111.222-03',
    avatarUrl:
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Developer', 'Early Investor'],
    youtube: null,
    site: 'https://felipern.dev',
    linkedin: 'https://linkedin.com/in/feliperodriguesnunes',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'O processo de KYC foi mais rápido do que esperava. Tudo online e seguro. Impressionante.',
    autor: 'Camila Beatriz Costa',
    email: 'camila.costa.user@iselftoken.com',
    cpf: '666.111.222-04',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Designer', 'Investidora'],
    youtube: null,
    site: null,
    linkedin: 'https://linkedin.com/in/camilabeatrizcosta',
    instagram: 'https://instagram.com/camilabcosta',
    facebook: null,
  },
  {
    mensagem:
      'Já recebi dois dividendos de startups que investi. O modelo de exit está funcionando!',
    autor: 'Daniel Ferreira Santos',
    email: 'daniel.santos.user@iselftoken.com',
    cpf: '666.111.222-05',
    avatarUrl:
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Contador', 'Investidor'],
    youtube: 'https://youtube.com/@danielsantosinvest',
    site: null,
    linkedin: 'https://linkedin.com/in/danielferreira',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'A transparência da plataforma é impressionante. Consigo ver exatamente onde meu dinheiro está sendo aplicado.',
    autor: 'Renata Silva Oliveira',
    email: 'renata.oliveira.user@iselftoken.com',
    cpf: '666.111.222-06',
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Economista', 'Investidora'],
    youtube: null,
    site: 'https://renataso.com.br',
    linkedin: 'https://linkedin.com/in/renatasilvai',
    instagram: 'https://instagram.com/renatainvest',
    facebook: null,
  },
  {
    mensagem:
      'A equipe por trás da plataforma é incrível. Sempre disponíveis para tirar dúvidas e dar suporte.',
    autor: 'Paulo Roberto Alves',
    email: 'paulo.alves.user@iselftoken.com',
    cpf: '666.111.222-07',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Empresário', 'Investidor'],
    youtube: null,
    site: null,
    linkedin: 'https://linkedin.com/in/paulorbertoalves',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'Me senti seguro para fazer meu primeiro investimento em startups. O processo é super didático.',
    autor: 'Gabriel Henrique Reis',
    email: 'gabriel.reis.user@iselftoken.com',
    cpf: '666.111.222-08',
    avatarUrl:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Estudante', 'Investidor Iniciante'],
    youtube: 'https://youtube.com/@gabrielreis',
    site: 'https://gabrielreis.com',
    linkedin: 'https://linkedin.com/in/gabrielhenriquereis',
    instagram: 'https://instagram.com/gabrielhrinvest',
    facebook: null,
  },
  {
    mensagem:
      'O marketplace tem opções para todos os perfis de risco. Já diversifiquei meu portfolio com 5 startups.',
    autor: 'Marcos Antonio Pereira',
    email: 'marcos.pereira.user@iselftoken.com',
    cpf: '666.111.222-09',
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Engenheiro', 'Investidor'],
    youtube: null,
    site: null,
    linkedin: 'https://linkedin.com/in/marcosantonpereira',
    instagram: null,
    facebook: null,
  },
  {
    mensagem:
      'Os relatórios de investimentos são detalhados e atualizados. Melhor plataforma de equity crowdfunding que já usei.',
    autor: 'Isabela Rodrigues Santos',
    email: 'isabela.santos.user@iselftoken.com',
    cpf: '666.111.222-10',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces',
    cargos: ['Analista Financeira', 'Investidora'],
    youtube: null,
    site: 'https://isabelars.com.br',
    linkedin: 'https://linkedin.com/in/isabelarodss',
    instagram: 'https://instagram.com/isabelainvest',
    facebook: null,
  },
];

let brazilCountryId: number | undefined;

async function getBrazilCountryId(prisma: any): Promise<number> {
  if (brazilCountryId !== undefined) {
    return brazilCountryId;
  }

  const brazil = await prisma.country.upsert({
    where: { iso3: 'BRA' },
    update: {
      name: 'Brasil',
      iso2: 'BR',
      emoji: '🇧🇷',
    },
    create: {
      name: 'Brasil',
      iso3: 'BRA',
      iso2: 'BR',
      emoji: '🇧🇷',
    },
    select: { id: true },
  });

  brazilCountryId = brazil.id;
  return brazil.id;
}

async function getOrCreateAuthorUser(
  prisma: any,
  item: OpinionAuthorData,
  passwordHash: string,
) {
  let user = await prisma.user.findUnique({
    where: { email: item.email },
    select: { id: true, avatar_id: true },
  });

  if (!user) {
    let avatarId: number | undefined;
    if (item.avatarUrl) {
      const slug = `avatar-user-${item.email.split('@')[0]}`;

      // Tenta primeiro asset local em prisma/seeds/assets/users/{slug}/avatar.{ext}.
      // Fallback para download via URL externa (modo dev tolerante).
      let avatarImg;
      try {
        console.log(`   📤 [upload] avatar-user: ${slug}/avatar.{ext}`);
        avatarImg = await seedImageFromUser(slug, 'avatar');
        console.log(
          `   ✅ [s3] avatar enviado — key=seed/users/${slug}/avatar${avatarImg.extension}`,
        );
      } catch {
        console.log(
          `   ⚠️  [fallback] avatar local nao encontrado, baixando de URL externa`,
        );
        avatarImg = await seedImageFromUrl(slug, item.avatarUrl);
      }

      const kyc = await prisma.kYCProfile.create({
        data: {
          originalName: `${slug}.png`,
          size: avatarImg.size || 2048,
          mineType: avatarImg.contentType || 'image/png',
          extension: 'png',
          url: avatarImg.url,
          url_sm: avatarImg.url_sm || avatarImg.url,
          url_md: avatarImg.url_md || avatarImg.url,
          url_web: avatarImg.url_web || avatarImg.url,
          url_lg: avatarImg.url_lg || avatarImg.url,
          status: 'APPROVED',
        },
      });
      console.log(`   🔗 [db] KYCProfile #${kyc.id} criado (status=APPROVED)`);
      avatarId = kyc.id;
    }

    user = await prisma.user.create({
      data: {
        email: item.email,
        nome: item.autor,
        senha: passwordHash,
        role: 'USER',
        tipo_documento: 'CPF',
        reg_documento: item.cpf,
        isActive: true,
        termosAceitos: true,
        politicaAceita: true,
        pais: await getBrazilCountryId(prisma),
        bandeira: '🇧🇷',
        avatar_id: avatarId,
      },
    });
    console.log(`  👤 Usuário real criado: ${item.autor} (${item.email})`);
  }

  return user;
}

async function main() {
  const prisma = getSeedPrismaClient();
  try {
    console.log(
      '🌱 Seed de Opiniões e Depoimentos (Usuários reais + Captações concluídas)...\n',
    );

    const passwordHash = await bcrypt.hash('User123!', 10);

    // 1. Filtrar startups com captações CONCLUÍDAS (status FUNDED ou CLOSED)
    let completedStartups = await prisma.startup.findMany({
      where: {
        status: 'APPROVED',
        campaigns: {
          some: {
            status: { in: ['FUNDED', 'CLOSED'] },
          },
        },
      },
      select: { id: true, nome: true },
    });

    if (completedStartups.length === 0) {
      console.log(
        '⚠️ Nenhuma startup com captação concluída (FUNDED/CLOSED) encontrada. Usando startups APPROVED como fallback.',
      );
      completedStartups = await prisma.startup.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, nome: true },
        take: 10,
      });
    }

    if (completedStartups.length === 0) {
      console.log(
        '⚠️ Nenhuma startup APPROVED encontrada. Execute seed.ts primeiro.',
      );
      return;
    }

    console.log(
      `📊 Encontradas ${completedStartups.length} startups com captação concluída para vincular opiniões.\n`,
    );

    console.log('📝 Criando Usuários Reais & StartupOpinions...');
    let opinionsCreated = 0;

    for (let i = 0; i < STARTUP_OPINIONS.length; i++) {
      const opinion = STARTUP_OPINIONS[i];
      const startup = completedStartups[i % completedStartups.length];

      // Garante a existência do Usuário no banco e salva a imagem do avatar no storage
      await getOrCreateAuthorUser(prisma, opinion, passwordHash);

      try {
        await prisma.startupOpinion.create({
          data: {
            startupId: startup.id,
            mensagem: opinion.mensagem,
            autor: opinion.autor,
            cargos: opinion.cargos,
            youtube: opinion.youtube ?? undefined,
            site: opinion.site ?? undefined,
            linkedin: opinion.linkedin ?? undefined,
            instagram: opinion.instagram ?? undefined,
            facebook: opinion.facebook ?? undefined,
            isActive: true,
          },
        });
        opinionsCreated++;
        console.log(
          `  ✅ Opinião ${i + 1}: "${opinion.autor}" sobre ${startup.nome}`,
        );
      } catch (error: any) {
        console.log(`  ❌ Erro ao criar opinião ${i + 1}: ${error.message}`);
      }
    }

    console.log(`\n✅ Criadas ${opinionsCreated} StartupOpinions\n`);

    console.log('💬 Criando Usuários Reais & Depoimentos ("O Que Dizem")...');
    let depoimentosCreated = 0;

    for (let i = 0; i < DEPOIMENTOS.length; i++) {
      const depo = DEPOIMENTOS[i];

      // Garante a existência do Usuário no banco e salva a imagem do avatar no storage
      await getOrCreateAuthorUser(prisma, depo, passwordHash);

      try {
        await prisma.depoimento.create({
          data: {
            mensagem: depo.mensagem,
            autor: depo.autor,
            cargos: depo.cargos,
            youtube: depo.youtube ?? undefined,
            site: depo.site ?? undefined,
            linkedin: depo.linkedin ?? undefined,
            instagram: depo.instagram ?? undefined,
            facebook: depo.facebook ?? undefined,
            isActive: true,
          },
        });
        depoimentosCreated++;
        console.log(`  ✅ Depoimento ${i + 1}: "${depo.autor}"`);
      } catch (error: any) {
        console.log(`  ❌ Erro ao criar depoimento ${i + 1}: ${error.message}`);
      }
    }

    console.log(`\n✅ Criados ${depoimentosCreated} Depoimentos\n`);

    console.log('═══════════════════════════════════════');
    console.log('📊 RESUMO DO SEED DE OPINIÕES');
    console.log('═══════════════════════════════════════');
    console.log(`   StartupOpinions: ${opinionsCreated}`);
    console.log(`   Depoimentos: ${depoimentosCreated}`);
    console.log(`   Total: ${opinionsCreated + depoimentosCreated}`);
    console.log('═══════════════════════════════════════\n');
  } finally {
    await prisma.$disconnect();
  }
}

export async function seedOpinions() {
  await main();
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'erro desconhecido';
    console.error(`❌ Erro ao executar seed: ${message}`);
    process.exit(1);
  });
}
