import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { STARTUP_BLUEPRINTS, StartupBlueprint } from './seeds/blueprints';
import { seedAreas } from './seeds/seed-areas';
import { seedCategories } from './seeds/seed-categories';
import { getSeedPrismaClient } from './seeds/seed-client-helper';
import { seedCoupons } from './seeds/seed-coupons';
import { seedCurated } from './seeds/seed-curated';
import { seedFundraisingConfig } from './seeds/seed-fundraising-config';
import { seedInstallmentConfig } from './seeds/seed-installment-config';
import {
  seedImageFromStartup,
  seedImageFromUser,
} from './seeds/seed-image-helper';
import { seedOpinions } from './seeds/seed-opinions';
import { seedServices } from './seeds/seed-services';
import { seedSystemConfig } from './seeds/seed-system-config';

const prisma = getSeedPrismaClient();

let brazilCountryId: number | undefined;

async function getBrazilCountryId(): Promise<number> {
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
  return brazilCountryId;
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ==========================================
  // 1. VERIFICAR E CRIAR PLANOS
  // ==========================================
  console.log('💳 Verificando planos...');

  const planosExistentes = await prisma.plan.findMany();
  const slugsExistentes = planosExistentes.map((p) => p.slug);

  const planosParaCriar = [
    {
      nome: 'FUNDADOR',
      slug: 'plano-fundador',
      preco: 100.0,
      periodo: '/ano',
      descricao:
        'Para fundadores que desejam estruturar uma rodada de investimento, apresentar sua startup e conectar-se a potenciais investidores.',
      beneficios: [
        'Abra sua rodada de captação',
        'Capte conforme os limites aplicáveis à sua oferta',
        'Apresente sua startup em uma página pública',
        'Acesse potenciais investidores nacionais e internacionais',
        'Acompanhe a evolução da captação pelo dashboard',
        'Conte com suporte durante o processo',
      ],
      icon: 'Rocket',
      visivel: true,
      recomendado: false,
      periodoMeses: 12,
      textoBotao: 'Quero Captar',
    },
    {
      nome: 'INVESTIDOR',
      slug: 'plano-investidor',
      preco: 50.0,
      periodo: '/ano',
      descricao:
        'Para quem deseja acessar oportunidades de investimento em startups e acompanhar seus investimentos em um único ambiente.',
      beneficios: [
        'Invista em startups de diferentes estágios',
        'Acesse oportunidades nacionais e internacionais',
        'Acompanhe seus investimentos pelo dashboard',
        'Acesse o mercado secundário quando disponível e aplicável',
        'Descubra novas oportunidades na plataforma',
      ],
      icon: 'TrendingUp',
      recomendado: false,
      visivel: true,
      periodoMeses: 12,
      textoBotao: 'Quero investir',
    },
    {
      nome: 'PARCEIRO',
      slug: 'plano-afiliado',
      preco: 85.0,
      periodo: '/ano',
      descricao:
        'Para quem possui uma rede de contatos e deseja conectar potenciais investidores às oportunidades disponíveis na iSelfToken.',
      beneficios: [
        'Indique a plataforma para potenciais investidores',
        'Acompanhe suas indicações pelo dashboard',
        'Receba comissões sobre conversões elegíveis',
        'Acesse materiais de apoio e capacitação',
        'Evolua no programa de parceiros conforme seu desempenho',
      ],
      icon: 'Handshake',
      visivel: true,
      recomendado: false,
      periodoMeses: 12,
      textoBotao: 'Quero ser parceiro',
    },
  ];

  for (const plano of planosParaCriar) {
    if (!slugsExistentes.includes(plano.slug)) {
      const createdPlan = await prisma.plan.create({ data: plano });
      console.log(
        `✅ Plano criado: ${createdPlan.nome} - R$ ${createdPlan.preco} (botão: "${createdPlan.textoBotao ?? '—'}")`,
      );
    } else {
      await prisma.plan.update({
        where: { slug: plano.slug },
        data: {
          nome: plano.nome,
          preco: plano.preco,
          descricao: plano.descricao,
          beneficios: plano.beneficios,
          recomendado: plano.recomendado,
          visivel: plano.visivel,
          icon: plano.icon,
          periodoMeses: plano.periodoMeses,
          textoBotao: plano.textoBotao,
        },
      });
      console.log(
        `🔄 Plano ${plano.nome} atualizado para R$ ${Number(plano.preco).toFixed(2)}`,
      );
    }
  }

  // ==========================================
  // 2. VERIFICAR E CRIAR USUÁRIOS
  // ==========================================
  console.log('👤 Verificando usuários...');

  const USERS_SEED = [
    // ADMIN
    {
      email: 'admin@iselftoken.com',
      nome: 'Alexandre Admin',
      slug: 'admin',
      senha: '@Lexandre230188',
      role: 'ADMIN' as const,
      cpf: '123.456.789-00',
      telefone: '+55 11 98765-4321',
    },
    // FUNDADOR
    {
      email: 'founder@iselftoken.com',
      nome: 'Lucas Founder',
      slug: 'founder',
      senha: 'Founder123!',
      role: 'FOUNDER' as const,
      cpf: '987.654.321-00',
      telefone: '+55 11 91234-5678',
      plano: 'plano-fundador',
      wallet: 50000,
    },
    // INVESTIDOR
    {
      email: 'investidor1@email.com',
      nome: 'Carlos Investidor',
      slug: 'investidor1',
      senha: 'Invest123!',
      role: 'INVESTOR' as const,
      cpf: '111.222.333-44',
      telefone: '+55 11 99988-7766',
      plano: 'plano-investidor',
      wallet: 100000,
    },
    // INVESTIDOR+ (premium)
    {
      email: 'investidor-plus@iselftoken.com',
      nome: 'Maria Investidora Plus',
      slug: 'investidor-plus',
      senha: 'InvestPlus123!',
      role: 'INVESTOR' as const,
      cpf: '222.333.444-55',
      telefone: '+55 11 98877-6655',
      plano: 'plano-investidor',
      wallet: 250000,
    },
    // COMPLIANCE
    {
      email: 'compliance@iselftoken.com',
      nome: 'Mariana Compliance',
      slug: 'compliance',
      senha: 'Compliance123!',
      role: 'COMPLIANCE' as const,
      cpf: '333.444.555-66',
      telefone: '+55 11 97766-5544',
    },
    // FINANCEIRO
    {
      email: 'financeiro@iselftoken.com',
      nome: 'Roberto Financeiro',
      slug: 'financeiro',
      senha: 'Financeiro123!',
      role: 'FINANCEIRO' as const,
      cpf: '444.555.666-77',
      telefone: '+55 11 96655-4433',
    },
    // AFILIADO
    {
      email: 'afiliado@iselftoken.com',
      nome: 'Juliana Afiliada',
      slug: 'afiliado',
      senha: 'Afiliado123!',
      role: 'USER' as const,
      cpf: '555.666.777-88',
      telefone: '+55 11 95544-3322',
      plano: 'plano-afiliado',
      wallet: 30000,
    },
  ];

  // Cache de senhas hasheadas
  const senhaCache = new Map<string, string>();

  let founderUser;
  for (const user of USERS_SEED) {
    // Hash da senha
    if (!senhaCache.has(user.senha)) {
      senhaCache.set(user.senha, await bcrypt.hash(user.senha, 10));
    }
    const hashedPassword = senhaCache.get(user.senha)!;

    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`⏭️  ${user.email} já existe`);
      if (user.role === 'FOUNDER') founderUser = existing;
      continue;
    }

    const created = await prisma.user.create({
      data: {
        email: user.email,
        nome: user.nome,
        senha: hashedPassword,
        role: user.role,
        tipo_documento: 'CPF',
        reg_documento: user.cpf,
        telefone: user.telefone,
        isActive: true,
        termosAceitos: true,
        politicaAceita: true,
        pais: await getBrazilCountryId(),
        bandeira: '🇧🇷',
      },
    });

    console.log(`✅ ${user.email} criado (${user.role})`);

    // ─── Upload simulado: avatar + documentos KYC ───────────────────────────
    // Simula o fluxo real de upload: para cada arquivo encontrado em
    // `prisma/seeds/assets/users/{slug}/{fileName}.{ext}`, faz upload para
    // S3 via PutObjectCommand (seedImageFromUser) e vincula o KYCProfile
    // criado ao User via avatar_id/comprovante_id/documento_id/biofacial_id.
    //
    // Estrutura esperada em cada pasta de usuario:
    //   prisma/seeds/assets/users/{slug}/
    //     avatar.{ext}      -> vincula em User.avatar_id
    //     comprovante.{ext} -> vincula em User.comprovante_id
    //     documento.{ext}   -> vincula em User.documento_id
    //     biofacial.{ext}   -> vincula em User.biofacial_id
    //
    // Modo dev tolerante: se algum asset nao existir, pula silenciosamente.
    if (user.slug) {
      const uploadedFields: Record<string, number> = {};

      const uploadIfExists = async (
        fileName: string,
        field: 'avatar_id' | 'comprovante_id' | 'documento_id' | 'biofacial_id',
        label: string,
      ): Promise<void> => {
        try {
          console.log(
            `   📤 [upload] ${label}: ${user.slug}/${fileName}.{ext}`,
          );
          const uploaded = await seedImageFromUser(user.slug, fileName);
          const ext = uploaded.extension ?? '.jpg';
          console.log(
            `   ✅ [s3] ${label} enviado — key=seed/users/${user.slug}/${fileName}${ext}`,
          );
          const kyc = await prisma.kYCProfile.create({
            data: {
              originalName: `${user.slug}-${fileName}${ext}`,
              size: uploaded.size,
              mineType: uploaded.contentType,
              extension: ext.replace('.', ''),
              url: uploaded.url,
              url_sm: uploaded.url_sm,
              url_md: uploaded.url_md,
              url_web: uploaded.url_web,
              url_lg: uploaded.url_lg,
              status: 'APPROVED',
            },
          });
          console.log(
            `   🔗 [db] KYCProfile #${kyc.id} criado (status=APPROVED) — User.${field}=${kyc.id}`,
          );
          uploadedFields[field] = kyc.id;
        } catch {
          // asset nao encontrado — segue sem erro (modo dev tolerante)
        }
      };

      await uploadIfExists('avatar', 'avatar_id', 'Avatar');
      await uploadIfExists(
        'comprovante',
        'comprovante_id',
        'Comprovante de endereco',
      );
      await uploadIfExists('documento', 'documento_id', 'Documento (CPF/RG)');
      await uploadIfExists('biofacial', 'biofacial_id', 'Biofacial (LGPD)');

      // Vincula os KYCProfile IDs ao User criado.
      if (Object.keys(uploadedFields).length > 0) {
        await prisma.user.update({
          where: { id: created.id },
          data: {
            ...uploadedFields,
            // Consentimento biofacial (LGPD Art. 11 I) quando aplicavel
            ...(uploadedFields.biofacial_id
              ? {
                  biofacialConsentAt: new Date(),
                  biofacialConsentVersion: 'v1.0-2026-08-22',
                }
              : {}),
          },
        });
        console.log(
          `   🎯 [db] User #${created.id} (${user.slug}) vinculado a ${Object.keys(uploadedFields).length} KYCProfile(s)`,
        );
      } else {
        console.log(
          `   ⏭️  Nenhum asset em prisma/seeds/assets/users/${user.slug}/ — User criado sem KYC`,
        );
      }
    }

    // Wallet
    if ('wallet' in user && user.wallet) {
      await prisma.wallet.create({
        data: {
          userId: created.id,
          balance: user.wallet,
          blocked: 0,
          currency: 'BRL',
        },
      });
      console.log(`   💰 Wallet: R$ ${user.wallet.toLocaleString('pt-BR')}`);
    }

    // Assinatura
    if ('plano' in user && user.plano) {
      const plano = await prisma.plan.findUnique({
        where: { slug: user.plano },
      });
      if (plano) {
        await prisma.subscription.create({
          data: {
            userId: created.id,
            planId: plano.id,
            status: 'ACTIVE',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
        console.log(`   📋 Plano: ${user.plano}`);
      }
    }

    if (user.role === 'FOUNDER') founderUser = created;
  }

  // ==========================================
  // 3. CRIAR STARTUPS E CAMPANHAS
  // ==========================================
  console.log('🚀 Verificando startups...');

  // Criar imagens para logos (usa arquivos organizados em prisma/seeds/assets/startups/)
  const logoExistente = await prisma.kYCProfile.findFirst({
    where: { originalName: 'logo-techinnovate.png' },
  });

  let logo1;
  if (!logoExistente) {
    const logo1Img = await seedImageFromStartup('techinnovate', 'logo');
    logo1 = await prisma.kYCProfile.create({
      data: {
        originalName: 'logo-techinnovate.png',
        size: logo1Img.size,
        mineType: logo1Img.contentType,
        extension: 'png',
        url: logo1Img.url,
        url_sm: logo1Img.url_sm,
        url_md: logo1Img.url_md,
        url_web: logo1Img.url_web,
        url_lg: logo1Img.url_lg,
        status: 'APPROVED',
      },
    });
    console.log(
      `✅ Logo TechInnovate criado${logo1Img.uploaded ? ' (upload)' : ''}`,
    );
  } else {
    logo1 = logoExistente;
    console.log('⏭️  Logo TechInnovate já existe');
  }

  const logo2Existente = await prisma.kYCProfile.findFirst({
    where: { originalName: 'logo-greenenergy.png' },
  });

  let logo2;
  if (!logo2Existente) {
    const logo2Img = await seedImageFromStartup('greenenergy', 'logo');
    logo2 = await prisma.kYCProfile.create({
      data: {
        originalName: 'logo-greenenergy.png',
        size: logo2Img.size,
        mineType: logo2Img.contentType,
        extension: 'png',
        url: logo2Img.url,
        url_sm: logo2Img.url_sm,
        url_md: logo2Img.url_md,
        url_web: logo2Img.url_web,
        url_lg: logo2Img.url_lg,
        status: 'APPROVED',
      },
    });
    console.log(
      `✅ Logo GreenEnergy criado${logo2Img.uploaded ? ' (upload)' : ''}`,
    );
  } else {
    logo2 = logo2Existente;
    console.log('⏭️  Logo GreenEnergy já existe');
  }

  const logo3Existente = await prisma.kYCProfile.findFirst({
    where: { originalName: 'logo-fintechpro.png' },
  });

  let logo3;
  if (!logo3Existente) {
    const logo3Img = await seedImageFromStartup('fintechpro', 'logo');
    logo3 = await prisma.kYCProfile.create({
      data: {
        originalName: 'logo-fintechpro.png',
        size: logo3Img.size,
        mineType: logo3Img.contentType,
        extension: 'png',
        url: logo3Img.url,
        url_sm: logo3Img.url_sm,
        url_md: logo3Img.url_md,
        url_web: logo3Img.url_web,
        url_lg: logo3Img.url_lg,
        status: 'APPROVED',
      },
    });
    console.log(
      `✅ Logo FintechPro criado${logo3Img.uploaded ? ' (upload)' : ''}`,
    );
  } else {
    logo3 = logo3Existente;
    console.log('⏭️  Logo FintechPro já existe');
  }

  // A taxonomia precisa existir antes das startups legadas abaixo.
  await seedCategories();
  await seedAreas();
  const techCategory = await prisma.category.findUnique({
    where: { slug: 'ai' },
    select: { id: true },
  });
  const techAreas = techCategory
    ? await prisma.areaAtuacao.findMany({
        where: {
          categoryId: techCategory.id,
          slug: { in: ['ia_generativa', 'automacao_processos_rpa'] },
        },
        select: { id: true },
        orderBy: { ordem: 'asc' },
      })
    : [];
  const techAreaIds = techAreas.map((area) => area.id);

  // ==========================================
  // STARTUP 1: TechInnovate - Campanha ABERTA
  // ==========================================
  const startup1Existente = await prisma.startup.findUnique({
    where: { slug: 'techinnovate' },
  });

  let startup1;
  if (!startup1Existente) {
    startup1 = await prisma.startup.create({
      data: {
        founderId: founderUser.id,
        nome: 'TechInnovate',
        slug: 'techinnovate',
        razao_social: 'TechInnovate Soluções em IA Ltda',
        cnpj: '12.345.678/0001-90',
        site: 'https://techinnovate.com.br',
        telefone: '+55 11 3000-1234',
        email: 'contato@techinnovate.com.br',
        pais: {
          iso3: 'BRA',
          nome: 'Brasil',
          emoji: '🇧🇷',
        },
        redes_sociais: {
          linkedin: 'https://linkedin.com/company/techinnovate',
          instagram: 'https://instagram.com/techinnovate',
        },
        area_atuacao: 'Inteligência Artificial',
        category: 'AI',
        categoryId: techCategory?.id ?? undefined,
        areaAtuacaoId: techAreaIds[0] ?? undefined,
        areas_atuacao: techAreaIds,
        estagio: 'operacao',
        descricao:
          'Startup especializada em soluções de IA para automação de processos empresariais',
        problema:
          'Empresas perdem tempo e dinheiro com processos manuais repetitivos',
        solucao:
          'Plataforma de IA que automatiza processos e reduz custos operacionais em até 40%',
        modelo_receita: 'SaaS - Assinatura mensal por usuário',
        descritivo_basico: 'Automação inteligente para empresas',
        youtube_url: 'https://youtube.com/watch?v=techinnovate-pitch',
        banco: '001',
        agencia: '1234',
        conta: '56789-0',
        tipo_conta: 'corrente',
        pix_key: 'cnpj',
        titular: 'TechInnovate Soluções em IA Ltda',
        data_fundacao: new Date('2020-05-15'),
        logo_id: logo1.id,
        status: 'APPROVED',
        score: 45,
        scoreBreakdown: {
          kyc: { earned: 8, max: 10, count: 1 },
          documents: { earned: 5, max: 15, count: 3 },
          seals: { earned: 8, max: 15, count: 3 },
          traction: { earned: 5, max: 10, count: 1 },
          raised: { earned: 3, max: 10, count: 0 },
          deadline: { earned: 5, max: 5, count: 1 },
          category: { earned: 5, max: 5, count: 1 },
          partnerships: { earned: 2, max: 10, count: 1 },
          activity: { earned: 4, max: 20, count: 10 },
        },
        scoreLastCalculatedAt: new Date(),
        socios: [
          { nome: 'João Founder', cargo: 'CEO', percentual: 60 },
          { nome: 'Maria Silva', cargo: 'CTO', percentual: 40 },
        ],
        teams: [
          { nome: 'Carlos Dev', cargo: 'Desenvolvedor Senior' },
          { nome: 'Ana Designer', cargo: 'UX Designer' },
        ],
        uso_recursos: {
          marketing: 30,
          produto: 50,
          operacoes: 20,
        },
      },
    });
    console.log(`✅ Startup 1 criada: ${startup1.nome} (ID: ${startup1.id})`);
  } else {
    startup1 = startup1Existente;
    console.log(`⏭️  Startup 1 já existe: ${startup1.nome}`);
  }

  // Sincroniza a taxonomia e o estágio também quando a startup já existe.
  startup1 = await prisma.startup.update({
    where: { id: startup1.id },
    data: {
      categoryId: techCategory?.id ?? undefined,
      areaAtuacaoId: techAreaIds[0] ?? undefined,
      areas_atuacao: techAreaIds,
      estagio: 'operacao',
    },
  });

  // S1 retrocomp: garantir score=45 + scoreBreakdown mesmo se startup ja existia
  if (startup1.score !== 45) {
    startup1 = await prisma.startup.update({
      where: { id: startup1.id },
      data: {
        score: 45,
        scoreBreakdown: {
          kyc: { earned: 8, max: 10, count: 1 },
          documents: { earned: 5, max: 15, count: 3 },
          seals: { earned: 8, max: 15, count: 3 },
          traction: { earned: 5, max: 10, count: 1 },
          raised: { earned: 3, max: 10, count: 0 },
          deadline: { earned: 5, max: 5, count: 1 },
          category: { earned: 5, max: 5, count: 1 },
          partnerships: { earned: 2, max: 10, count: 1 },
          activity: { earned: 4, max: 20, count: 10 },
        },
        scoreLastCalculatedAt: new Date(),
      },
    });
    console.log(`♻️  Startup 1 atualizada com score=45 (S1 retrocomp)`);
  }

  // Criar campanha ABERTA para startup 1
  const campanha1Existente = await prisma.campaign.findFirst({
    where: {
      startupId: startup1.id,
      status: 'OPEN',
    },
  });

  let campanha1;
  if (!campanha1Existente) {
    campanha1 = await prisma.campaign.create({
      data: {
        startupId: startup1.id,
        title: 'Rodada Série A - Expansão Nacional',
        targetAmount: 5000000.0,
        minInvestment: 5000.0,
        valuation: 25000000.0,
        tokenPrice: 50.0,
        totalTokens: 100000,
        tokensSold: 45000,
        deadline: new Date('2024-12-31'),
        status: 'OPEN',
        reservationFeePaid: true,
      },
    });
    console.log(`✅ Campanha ABERTA criada: ${campanha1.title}`);
  } else {
    campanha1 = campanha1Existente;
    console.log(`⏭️  Campanha ABERTA já existe para ${startup1.nome}`);
  }

  // Criar tokens vendidos para campanha 1
  const tokensCampanha1 = await prisma.token.count({
    where: { campaignId: campanha1.id },
  });

  if (tokensCampanha1 === 0) {
    // Criar investidor
    const investidor1Existente = await prisma.user.findUnique({
      where: { email: 'investidor1@email.com' },
    });

    let investidor1;
    if (!investidor1Existente) {
      const hashedPassword = await bcrypt.hash('Invest123!', 10);
      investidor1 = await prisma.user.create({
        data: {
          email: 'investidor1@email.com',
          nome: 'Pedro Investidor',
          senha: hashedPassword,
          role: 'USER',
          isActive: true,
        },
      });
    } else {
      investidor1 = investidor1Existente;
    }

    // Criar wallet para investidor
    const walletInvestidor = await prisma.wallet.findUnique({
      where: { userId: investidor1.id },
    });

    if (!walletInvestidor) {
      await prisma.wallet.create({
        data: {
          userId: investidor1.id,
          balance: 100000.0,
          blocked: 0.0,
          currency: 'BRL',
        },
      });
    }

    // Criar investimento e tokens (bulk insert — antes 1 a 1)
    const techTokenBase = Date.now();
    await prisma.token.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({
        hash: `TECH-TOKEN-${techTokenBase}-${i}`,
        userId: investidor1.id,
        startupId: startup1.id,
        campaignId: campanha1.id,
        quantity: 1,
        purchaseVal: 50.0,
        currentVal: 55.0,
      })),
    });
    console.log('✅ 100 tokens criados para campanha ABERTA');

    // Criar investimento
    await prisma.investment.create({
      data: {
        userId: investidor1.id,
        campaignId: campanha1.id,
        amount: 5000.0,
        tokensQty: 100,
        status: 'CONFIRMED',
      },
    });
    console.log('✅ Investimento criado');

    // Criar pagamento
    await prisma.payment.create({
      data: {
        userId: investidor1.id,
        amount: 5000.0,
        method: 'PIX',
        status: 'PAID',
        purpose: 'INVESTMENT',
        paidAt: new Date(),
      },
    });
    console.log('✅ Pagamento criado');
  }

  // ==========================================
  // STARTUP 2: GreenEnergy - Campanha FINALIZADA (FUNDED)
  // ==========================================
  const startup2Existente = await prisma.startup.findUnique({
    where: { slug: 'greenenergy' },
  });

  let startup2;
  if (!startup2Existente) {
    startup2 = await prisma.startup.create({
      data: {
        founderId: founderUser.id,
        nome: 'GreenEnergy',
        slug: 'greenenergy',
        razao_social: 'GreenEnergy Soluções Sustentáveis S.A.',
        cnpj: '98.765.432/0001-10',
        site: 'https://greenenergy.com.br',
        telefone: '+55 11 3000-5678',
        email: 'contato@greenenergy.com.br',
        pais: {
          iso3: 'BRA',
          nome: 'Brasil',
          emoji: '🇧🇷',
        },
        redes_sociais: {
          linkedin: 'https://linkedin.com/company/greenenergy',
          instagram: 'https://instagram.com/greenenergy',
        },
        area_atuacao: 'Energia Limpa',
        category: 'OTHER',
        estagio: 'SERIES_B',
        descricao: 'Soluções de energia solar residencial e comercial',
        problema:
          'Alto custo de energia elétrica e dependência de fontes não renováveis',
        solucao: 'Sistemas fotovoltaicos inteligentes com payback de 3 anos',
        modelo_receita: 'Venda + Instalação + Manutenção',
        descritivo_basico: 'Energia solar acessível para todos',
        youtube_url: 'https://youtube.com/watch?v=greenenergy-pitch',
        banco: '001',
        agencia: '5678',
        conta: '12345-6',
        tipo_conta: 'corrente',
        pix_key: 'cnpj',
        titular: 'GreenEnergy Soluções Sustentáveis S.A.',
        data_fundacao: new Date('2019-08-20'),
        logo_id: logo2.id,
        status: 'APPROVED',
        socios: [
          { nome: 'João Founder', cargo: 'CEO', percentual: 50 },
          { nome: 'Carlos Verde', cargo: 'COO', percentual: 50 },
        ],
        teams: [
          { nome: 'Engenheiro Solar', cargo: 'Engenheiro de Energia' },
          { nome: 'Vendas Pro', cargo: 'Diretor Comercial' },
        ],
        uso_recursos: {
          expansao: 60,
          pesquisa: 30,
          marketing: 10,
        },
      },
    });
    console.log(`✅ Startup 2 criada: ${startup2.nome} (ID: ${startup2.id})`);
  } else {
    startup2 = startup2Existente;
    console.log(`⏭️  Startup 2 já existe: ${startup2.nome}`);
  }

  // Criar campanha FUNDED para startup 2
  const campanha2Existente = await prisma.campaign.findFirst({
    where: {
      startupId: startup2.id,
      status: 'FUNDED',
    },
  });

  let campanha2;
  if (!campanha2Existente) {
    campanha2 = await prisma.campaign.create({
      data: {
        startupId: startup2.id,
        title: 'Rodada Série B - Expansão Nacional',
        targetAmount: 8000000.0,
        minInvestment: 10000.0,
        valuation: 40000000.0,
        tokenPrice: 80.0,
        totalTokens: 100000,
        tokensSold: 100000,
        deadline: new Date('2024-01-31'),
        status: 'FUNDED',
        reservationFeePaid: true,
      },
    });
    console.log(`✅ Campanha FUNDED criada: ${campanha2.title}`);
  } else {
    campanha2 = campanha2Existente;
    console.log(`⏭️  Campanha FUNDED já existe para ${startup2.nome}`);
  }

  // Investimentos CONFIRMED para a campanha FUNDED — distribui os 100.000
  // tokens (R$ 8.000.000 = 100% da meta) entre 3 investidores sintéticos.
  // Garante que `valorCaptado` reflita o estado real do banco (não 0).
  const investmentsCampanha2 = await prisma.investment.count({
    where: { campaignId: campanha2.id, status: 'CONFIRMED' },
  });
  if (investmentsCampanha2 === 0) {
    const greenInvestors = [
      {
        email: 'green.inv1@seed.local',
        nome: 'Green Investor 1',
        tokens: 50000,
      },
      {
        email: 'green.inv2@seed.local',
        nome: 'Green Investor 2',
        tokens: 30000,
      },
      {
        email: 'green.inv3@seed.local',
        nome: 'Green Investor 3',
        tokens: 20000,
      },
    ];
    for (const inv of greenInvestors) {
      let user = await prisma.user.findUnique({ where: { email: inv.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: inv.email,
            nome: inv.nome,
            senha: await bcrypt.hash('Seed123!', 10),
            role: 'USER',
            isActive: true,
          },
        });
        await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            blocked: 0,
            currency: 'BRL',
          },
        });
      }

      const amount = inv.tokens * Number(campanha2.tokenPrice);
      const investment = await prisma.investment.create({
        data: {
          userId: user.id,
          campaignId: campanha2.id,
          amount,
          tokensQty: inv.tokens,
          status: 'CONFIRMED',
        },
      });

      // Pagamento PAID vinculado ao investment (espelha o fluxo real)
      await prisma.payment.create({
        data: {
          userId: user.id,
          investmentId: investment.id,
          campaignId: campanha2.id,
          amount,
          method: 'PIX',
          purpose: 'INVESTMENT',
          status: 'PAID',
          paidAt: new Date(),
          effectsAppliedAt: new Date(),
        },
      });

      // Tokens emitidos para esse investidor (bulk insert — antes era 1 a 1,
      // ~100k INSERTs = minutos de espera)
      await prisma.token.createMany({
        data: Array.from({ length: inv.tokens }, (_, i) => ({
          hash: `GREEN-TOKEN-${investment.id}-${i}`,
          userId: user.id,
          startupId: startup2.id,
          campaignId: campanha2.id,
          quantity: 1,
          purchaseVal: Number(campanha2.tokenPrice),
          currentVal: Number(campanha2.tokenPrice),
        })),
      });
    }
    console.log(
      `✅ 100.000 tokens distribuídos entre 3 investidores (R$ 8.000.000 confirmados)`,
    );
  } else {
    console.log('⏭️  Investimentos da campanha FUNDED já existem');
  }

  // ==========================================
  // STARTUP 3: FintechPro - Campanha REJEITADA (FAILED)
  // ==========================================
  const startup3Existente = await prisma.startup.findUnique({
    where: { slug: 'fintechpro' },
  });

  let startup3;
  if (!startup3Existente) {
    startup3 = await prisma.startup.create({
      data: {
        founderId: founderUser.id,
        nome: 'FintechPro',
        slug: 'fintechpro',
        razao_social: 'FintechPro Tecnologia Financeira Ltda',
        cnpj: '11.222.333/0001-44',
        site: 'https://fintechpro.com.br',
        telefone: '+55 11 3000-9999',
        email: 'contato@fintechpro.com.br',
        pais: {
          iso3: 'BRA',
          nome: 'Brasil',
          emoji: '🇧🇷',
        },
        redes_sociais: {
          linkedin: 'https://linkedin.com/company/fintechpro',
        },
        area_atuacao: 'Fintech',
        category: 'FINTECH',
        estagio: 'SEED',
        descricao: 'Plataforma de investimentos para pequenos investidores',
        problema:
          'Pequenos investidores não têm acesso a produtos sofisticados',
        solucao: 'Tokenização de ativos com acesso a partir de R$ 100',
        modelo_receita: 'Taxa de administração + performance',
        descritivo_basico: 'Democratização dos investimentos',
        banco: '001',
        agencia: '9999',
        conta: '88888-8',
        tipo_conta: 'corrente',
        pix_key: 'cnpj',
        titular: 'FintechPro Tecnologia Financeira Ltda',
        data_fundacao: new Date('2023-01-10'),
        logo_id: logo3.id,
        status: 'APPROVED',
        socios: [
          { nome: 'João Founder', cargo: 'CEO', percentual: 70 },
          { nome: 'Ana Finanças', cargo: 'CFO', percentual: 30 },
        ],
        uso_recursos: {
          tecnologia: 50,
          regulacao: 30,
          marketing: 20,
        },
      },
    });
    console.log(`✅ Startup 3 criada: ${startup3.nome} (ID: ${startup3.id})`);
  } else {
    startup3 = startup3Existente;
    console.log(`⏭️  Startup 3 já existe: ${startup3.nome}`);
  }

  // Criar campanha em DRAFT para startup 3 (reserva ainda nao paga)
  const campanha3Existente = await prisma.campaign.findFirst({
    where: {
      startupId: startup3.id,
      status: 'DRAFT',
    },
  });

  if (!campanha3Existente) {
    const draftDeadline = new Date();
    draftDeadline.setDate(draftDeadline.getDate() + 90);
    await prisma.campaign.create({
      data: {
        startupId: startup3.id,
        title: 'Rodada Seed - Primeiro Capital',
        targetAmount: 1000000.0,
        minInvestment: 1000.0,
        valuation: 5000000.0,
        tokenPrice: 10.0,
        totalTokens: 100000,
        tokensSold: 0,
        deadline: draftDeadline,
        status: 'DRAFT',
        reservationFeePaid: false,
      },
    });
    console.log(`✅ Campanha DRAFT criada para ${startup3.nome}`);
  } else {
    console.log(`⏭️  Campanha FAILED já existe para ${startup3.nome}`);
  }

  // ==========================================
  // 4. RESUMO FINAL
  // ==========================================
  // ==========================================
  // SEALS - Catálogo dos 11 selos visuais
  // ==========================================
  console.log('🏅 Verificando catálogo de Selos...');

  const sealsDefaults: Array<{
    slug: string;
    name: string;
    description: string;
    imagePath: string;
    category:
      | 'STAGE'
      | 'VERIFICATION'
      | 'PARTNERSHIP'
      | 'ACHIEVEMENT'
      | 'CUSTOM';
  }> = [
    {
      slug: 'ideacao',
      name: 'Ideação',
      description: 'Estágio inicial: validação de hipóteses e protótipos',
      imagePath: '/icons/ideacao.png',
      category: 'STAGE',
    },
    {
      slug: 'mvp',
      name: 'MVP',
      description: 'Produto mínimo viável em desenvolvimento ou lançado',
      imagePath: '/icons/mvp.png',
      category: 'STAGE',
    },
    {
      slug: 'tracao',
      name: 'Tração',
      description: 'Métricas iniciais de adoção e crescimento de usuários',
      imagePath: '/icons/tracao.png',
      category: 'STAGE',
    },
    {
      slug: 'operacao',
      name: 'Operação',
      description: 'Operação consolidada com receita recorrente',
      imagePath: '/icons/operacao.png',
      category: 'STAGE',
    },
    {
      slug: 'breakeven',
      name: 'Break-even',
      description: 'Ponto de equilíbrio financeiro atingido',
      imagePath: '/icons/breakeven.png',
      category: 'STAGE',
    },
    {
      slug: 'acelerada',
      name: 'Acelerada',
      description: 'Startup acelerada por programa parceiro reconhecido',
      imagePath: '/icons/acelerada.png',
      category: 'STAGE',
    },
    {
      slug: 'startup_verificada',
      name: 'Startup Verificada',
      description: 'Empresa com KYC completo e aprovado pelo compliance',
      imagePath: '/icons/startup_verificada.png',
      category: 'VERIFICATION',
    },
    {
      slug: 'startup',
      name: 'Startup',
      description: 'Selo padrão de startup cadastrada na plataforma',
      imagePath: '/icons/startup.png',
      category: 'ACHIEVEMENT',
    },
    {
      slug: 'potencial_unicornio',
      name: 'Potencial Unicórnio',
      description: 'Startup com potencial de atingir valuation de US$ 1B',
      imagePath: '/icons/potencial_unicornio.png',
      category: 'ACHIEVEMENT',
    },
    {
      slug: 'aws',
      name: 'AWS Partner',
      description: 'Parceira AWS com créditos e suporte técnico',
      imagePath: '/icons/aws.png',
      category: 'PARTNERSHIP',
    },
    {
      slug: 'founders_hunter',
      name: 'Founders Hunter',
      description: 'Selo do programa Founders Hunter',
      imagePath: '/icons/founders_hunter.png',
      category: 'PARTNERSHIP',
    },
    // Curadoria Premium — Selo "Alta Performance" (ação "Coroar").
    // Aplicado manualmente pelo admin em /admin/startups após a aprovação
    // da Fase 3 (Detalhes de Captação). Categoria ACHIEVEMENT — sem auto-
    // atribuição por trigger de sistema; somente via UI admin.
    {
      slug: 'alta_performance',
      name: 'Alta Performance',
      description:
        'Startup com KPIs operacionais e financeiros acima da média do segmento, validado pela curadoria iSelfToken.',
      imagePath: '/icons/alta_performance.png',
      category: 'ACHIEVEMENT',
    },
    // BUG-FT-007: selo "Lançamento" — exibido quando o founder contratou
    // FAST_DEPLOY (Publicação Rápida) e a campanha abriu OPEN imediatamente.
    // Slug interno `lancamento` bate com o display name; categoria
    // PARTNERSHIP (serviço opcional pago).
    {
      slug: 'lancamento',
      name: 'Lançamento',
      description:
        'Founder contratou o serviço FAST_DEPLOY (Publicação Rápida): captação aberta imediatamente após aprovação do Compliance.',
      imagePath: '/icons/lancamento.png',
      category: 'PARTNERSHIP',
    },
  ];

  for (const s of sealsDefaults) {
    await prisma.seal.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        description: s.description,
        imagePath: s.imagePath,
        category: s.category,
      },
      create: s,
    });
  }
  console.log(`✅ Selos: ${sealsDefaults.length} entries garantida(s)`);

  // A classificação relacional já foi garantida antes das startups legadas.

  console.log('\n⚙️  Seed de configurações financeiras...');
  await seedSystemConfig();

  console.log('\n🧰 Seed do catálogo de serviços...');
  await seedServices();

  // ==========================================
  // STARTUPS RICAS - 20 startups seeded para popular o marketplace
  // ==========================================
  console.log('\n🚀 Seedando 20 startups com founders, campanhas e selos...');
  await seedRichStartups();

  // ==========================================
  // SEEDs SECUNDÁRIOS - executados via npm run seed:<name>
  // ==========================================

  console.log('\n💬 Seed de depoimentos (startup-opinions)...');
  await seedOpinions();

  console.log('\n✨ Seed de curated picks...');
  await seedCurated();

  console.log('\n⚙️  Seed de fundraising config...');
  await seedFundraisingConfig();

  console.log('\n🎟️  Seed de cupons...');
  await seedCoupons();

  console.log('\n💳 Seed de config de parcelamento (cartão)...');
  await seedInstallmentConfig();

  // ==========================================
  // FINANCE CONFIG - Limites do Marketplace
  // ==========================================
  console.log('⚙️  Verificando FinanceConfig (marketplace)...');

  const financeConfigDefaults: Array<{
    key: string;
    value: string;
    description: string;
  }> = [
    {
      key: 'marketplace.featured_limit',
      value: '10',
      description: 'Quantidade de startups na seção Destaque da home pública',
    },
    {
      key: 'marketplace.recent_limit',
      value: '5',
      description:
        'Quantidade de startups na seção Recém-adicionados da home pública',
    },
    {
      key: 'marketplace.opportunities_limit',
      value: '16',
      description:
        'Quantidade máxima de startups na seção Oportunidades (permite overlap com Featured/Recent)',
    },
  ];

  for (const cfg of financeConfigDefaults) {
    await prisma.financeConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log(
    `✅ FinanceConfig: ${financeConfigDefaults.length} chave(s) garantida(s)`,
  );

  // ==========================================
  // 5. LISTA DE USUÁRIOS (email, role, plano, senha)
  // ==========================================
  console.log('\n👥 USUÁRIOS CADASTRADOS:');
  console.log(
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  );
  console.log(
    `${'EMAIL'.padEnd(34)} ${'ROLE'.padEnd(13)} ${'PLANO'.padEnd(20)} ${'SENHA'.padEnd(20)}`,
  );
  console.log('─'.repeat(90));

  for (const u of USERS_SEED) {
    const user = await prisma.user.findUnique({
      where: { email: u.email },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
        },
      },
    });

    const plano = user?.subscriptions?.[0]?.plan?.nome ?? '—';

    console.log(
      `${u.email.padEnd(34)} ${u.role.padEnd(13)} ${plano.padEnd(20)} ${u.senha.padEnd(20)}`,
    );
  }

  console.log('─'.repeat(90));
  console.log(`Total: ${USERS_SEED.length} usuário(s) seed\n`);

  // ==========================================
  // 6. RESUMO FINAL
  // ==========================================
  console.log('🎉 Seed concluído com sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO:');
  console.log(`   - ${await prisma.user.count()} usuário(s) criado(s)`);
  console.log(`   - ${await prisma.plan.count()} plano(s) criado(s)`);
  console.log(
    `   - ${await prisma.subscription.count()} assinatura(s) criada(s)`,
  );
  console.log(`   - ${await prisma.startup.count()} startup(s) criada(s)`);
  console.log(`   - ${await prisma.campaign.count()} campanha(s) criada(s)`);
  console.log(`   - ${await prisma.token.count()} token(s) criado(s)`);
  console.log(`   - ${await prisma.wallet.count()} wallet(s) criada(s)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🚀 STARTUPS CRIADAS:');
  console.log('   1. TechInnovate - Campanha ABERTA (45% vendido)');
  console.log('   2. GreenEnergy - Campanha FUNDED (100% arrecadado)');
  console.log('   3. FintechPro - Campanha FAILED (15% arrecadado)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

const SEED_AREA_BY_STARTUP: Record<string, string> = {
  neuralforge: 'ia_generativa',
  payswift: 'pagamentos_pix',
  medicoreflex: 'monitoramento_paciente',
  edusphere: 'educacao_basica',
  biogenix: 'genomica_edicao',
  cloudpilot: 'produtividade_colaboracao',
  tokenvault: 'crypto_fintech',
  greenfleet: 'geral_outras',
  aurorasaas: 'produtividade_colaboracao',
  brainpath: 'nlp_chatbots',
  clinilink: 'prontuario_eletronico',
  learnflow: 'educacao_corporativa',
  agroseed: 'biomateriais',
  retailops: 'pdv_automacao_loja',
  pixglobal: 'pagamentos_pix',
  datavision: 'visao_computacional',
  safehome: 'geral_outras',
  logixchain: 'geral_outras',
  vibedeck: 'geral_outras',
  nestopay: 'conta_digital_pf',
};

async function resolveSeedClassification(bp: StartupBlueprint) {
  const category = await prisma.category.findUnique({
    where: { slug: bp.category.toLowerCase() },
    select: { id: true },
  });
  if (!category) {
    return { categoryId: null, areaAtuacaoId: null, areaAtuacaoIds: [] };
  }

  const slugs = SEED_AREA_BY_STARTUP[bp.slug] ?? 'geral_outras';
  const areaSlugs = Array.isArray(slugs) ? slugs : [slugs];
  const areas = await prisma.areaAtuacao.findMany({
    where: { slug: { in: areaSlugs }, categoryId: category.id },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(areas.map((area) => [area.slug, area.id]));
  const areaAtuacaoIds = areaSlugs
    .map((slug) => bySlug.get(slug))
    .filter((id): id is number => id !== undefined);

  return {
    categoryId: category.id,
    areaAtuacaoId: areaAtuacaoIds[0] ?? null,
    areaAtuacaoIds,
  };
}

function seedCampaignMetadata(bp: StartupBlueprint) {
  return {
    dataLancamentoRodada: new Date(),
    objetivoCaptacao: `Acelerar a expansão comercial e o desenvolvimento do produto ${bp.name}.`,
    oQueEsperaAlcancar:
      'Ampliar a operação, conquistar novos clientes e consolidar o modelo de receita nos próximos 12 meses.',
    problema: bp.problema,
    solucao: bp.solucao,
    modeloReceita: bp.modelo_receita,
    dedicacao: 'integral',
    sociosCount: 1,
  };
}

async function syncSeedCampaignDetails(
  startupId: number,
  bp: StartupBlueprint,
) {
  const metadata = seedCampaignMetadata(bp);
  const campaigns = await prisma.campaign.findMany({
    where: { startupId },
    select: { id: true },
  });

  for (const campaign of campaigns) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: metadata,
    });

    const allocations = [
      { categoria: 'FUNDADOR' as const, percentual: 20 },
      { categoria: 'DESENVOLVIMENTO' as const, percentual: 40 },
      { categoria: 'COMERCIAL' as const, percentual: 20 },
      { categoria: 'MARKETING' as const, percentual: 10 },
      { categoria: 'RESERVA_CAIXA' as const, percentual: 10 },
    ];

    for (const allocation of allocations) {
      await prisma.campaignResourceAllocation.upsert({
        where: {
          campaignId_categoria: {
            campaignId: campaign.id,
            categoria: allocation.categoria,
          },
        },
        update: { percentual: allocation.percentual },
        create: { campaignId: campaign.id, ...allocation },
      });
    }
  }
}

async function upsertSeedPitchDeck(
  existing: { id: number } | null | undefined,
  slug: string,
) {
  const data = {
    originalName: `pitch-${slug}.pdf`,
    size: 0,
    mineType: 'application/pdf',
    extension: 'pdf',
    url: `https://placeholder.iselftoken.local/pitches/${slug}.pdf`,
    status: 'PENDING' as const,
  };

  if (existing) {
    return prisma.kYCProfile.update({ where: { id: existing.id }, data });
  }

  return prisma.kYCProfile.create({ data });
}

// =============================================================================
// STARTUPS RICAS - helpers
// =============================================================================

async function seedRichStartups() {
  const sealCache = new Map<string, number>();
  for (const seal of await prisma.seal.findMany()) {
    sealCache.set(seal.slug, seal.id);
  }

  let created = 0;
  let skipped = 0;
  const password = await bcrypt.hash('Founder123!', 10);

  for (const bp of STARTUP_BLUEPRINTS) {
    const result = await seedOneStartup(bp, password, sealCache);
    if (result === 'created') created++;
    else skipped++;
  }
  console.log(
    `✅ Startups ricas: ${created} criada(s), ${skipped} já existente(s).`,
  );
}

async function seedOneStartup(
  bp: StartupBlueprint,
  password: string,
  sealCache: Map<string, number>,
): Promise<'created' | 'skipped'> {
  const state = bp.state ?? 'OPEN';
  const startupApproved =
    state !== 'DRAFT' && !bp.marketplaceTags.includes('approval');
  const expectedStartupStatus = startupApproved
    ? 'APPROVED'
    : 'PENDING_CURATOR_REVIEW';
  // Para DRAFT, founder NÃO pagou reserva de token e o status fica pendente
  // de curadoria (apenas no painel do founder). Para OPEN/FUNDED, o founder
  // pagou reserva e o status vira APPROVED.
  const reservationFeePaid = state !== 'DRAFT';
  // 1. Founder User (upsert por email)
  const founder = await prisma.user.upsert({
    where: { email: bp.founder.email },
    update: {},
    create: {
      email: bp.founder.email,
      nome: bp.founder.nome,
      senha: password,
      role: 'FOUNDER',
      tipo_documento: 'CPF',
      reg_documento: bp.founder.cpf,
      isActive: true,
      termosAceitos: true,
      politicaAceita: true,
      pais: await getBrazilCountryId(),
      bandeira: '🇧🇷',
    },
  });

  const existing = await prisma.startup.findUnique({
    where: { slug: bp.slug },
    include: { logo: true, cover: true, pitch_deck: true },
  });

  // A pessoa/founder já existe neste ponto. Agora buscamos os assets da pasta
  // prisma/seeds/assets/startups/{slug}/, enviamos para o storage configurado
  // e só então vinculamos os KYCProfiles à startup.
  const logoImg = await seedImageFromStartup(bp.slug, 'logo');
  const logo = await upsertSeedImageProfile(
    existing?.logo,
    `logo-${bp.slug}`,
    logoImg,
  );

  // Cover: tenta da pasta organizada, senão usa fallback
  let coverImg;
  try {
    coverImg = await seedImageFromStartup(bp.slug, 'cover');
  } catch {
    // Cover não existe na pasta, cria placeholder
    coverImg = {
      ok: true,
      uploaded: false,
      url: `https://via.placeholder.com/1200x400/1a1a2e/ffffff?text=${encodeURIComponent(bp.slug)}`,
      url_sm: `https://via.placeholder.com/1200x400/1a1a2e/ffffff?text=${encodeURIComponent(bp.slug)}`,
      url_md: `https://via.placeholder.com/1200x400/1a1a2e/ffffff?text=${encodeURIComponent(bp.slug)}`,
      url_web: `https://via.placeholder.com/1200x400/1a1a2e/ffffff?text=${encodeURIComponent(bp.slug)}`,
      url_lg: `https://via.placeholder.com/1200x400/1a1a2e/ffffff?text=${encodeURIComponent(bp.slug)}`,
      size: 0,
      contentType: 'image/jpeg',
    };
  }
  const cover = await upsertSeedImageProfile(
    existing?.cover,
    `cover-${bp.slug}`,
    coverImg,
  );
  const pitchDeck = await upsertSeedPitchDeck(existing?.pitch_deck, bp.slug);
  const classification = await resolveSeedClassification(bp);

  if (existing) {
    await prisma.startup.update({
      where: { id: existing.id },
      data: {
        logo_id: logo.id,
        cover_id: cover.id,
        pitch_deck_id: pitchDeck.id,
        status: expectedStartupStatus,
        categoryId: classification.categoryId,
        areaAtuacaoId: classification.areaAtuacaoId,
        areas_atuacao: classification.areaAtuacaoIds,
        needs_manual_review:
          classification.categoryId === null ||
          classification.areaAtuacaoId === null,
      },
    });
    const existingCampaign = await prisma.campaign.findFirst({
      where: { startupId: existing.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (existingCampaign) {
      await seedFounderPaymentsForCampaign(
        prisma,
        founder.id,
        existing.id,
        existingCampaign.id,
        bp.campaign.targetAmount,
        state,
      );
    }
    await syncSeedPhaseApprovals(prisma, existing.id, state, startupApproved);
    await syncSeedCampaignDetails(existing.id, bp);
    console.log(`⏭️  Startup ${bp.slug} já existe; informações sincronizadas`);
    return 'skipped';
  }

  // 3. KYCProfile do PDF do pitch (referência local — usado pelo frontend)
  // O registro é vinculado ao campo pitch_deck_id da startup logo abaixo.

  // 4. Startup
  const startup = await prisma.startup.create({
    data: {
      founderId: founder.id,
      nome: bp.name,
      slug: bp.slug,
      razao_social: `${bp.name} Tecnologia Ltda`,
      cnpj: bp.cnpj,
      site: `https://${bp.slug}.com.br`,
      telefone: '+55 11 3000-0000',
      email: `contato@${bp.slug}.com`,
      banco: '001',
      agencia: '0001',
      conta: `${10000 + ((bp.slug.length * 1234) % 89999)}-0`,
      tipo_conta: 'corrente',
      // === ESTADO DA STARTUP (seed realista) ===
      // - DRAFT: founder ainda não pagou reserva nem enviou para curadoria.
      //   Status fica como `PENDING_CURATOR_REVIEW` mas SEM Campaign.
      // - OPEN/FUNDED: APPROVED + Campaign criada.
      status: expectedStartupStatus,
      verificationStatus: bp.marketplaceTags.includes('verified')
        ? 'VERIFIED'
        : 'NOT_REQUESTED',
      score: bp.score,
      isAccelerated: bp.marketplaceTags.includes('accelerated'),
      // Equipe (time fundador + sócios capital)
      socios: [{ nome: bp.founder.nome, cargo: 'CEO', percentual: 100 }],
      teams:
        bp.team && bp.team.length > 0
          ? bp.team
          : [{ nome: bp.founder.nome, cargo: 'CEO/Founder' }],
      uso_recursos: { produto: 50, marketing: 30, operacoes: 20 },
      pix_key: 'cnpj',
      titular: `${bp.name} Tecnologia Ltda`,
      pais: { iso3: 'BRA', nome: 'Brasil', emoji: '🇧🇷' },
      redes_sociais: {
        linkedin: `https://linkedin.com/company/${bp.slug}`,
        instagram: `https://instagram.com/${bp.slug}`,
        twitter: `https://x.com/${bp.slug}`,
      },
      area_atuacao: bp.area_atuacao,
      category: bp.category,
      estagio: bp.estagio,
      descricao: bp.descricao,
      problema: bp.problema,
      solucao: bp.solucao,
      modelo_receita: bp.modelo_receita,
      descritivo_basico: bp.descricao,
      data_fundacao: new Date('2023-01-01'),
      logo_id: logo.id,
      cover_id: cover.id,
      pitch_deck_id: pitchDeck.id,
      categoryId: classification.categoryId,
      areaAtuacaoId: classification.areaAtuacaoId,
      areas_atuacao: classification.areaAtuacaoIds,
      needs_manual_review:
        classification.categoryId === null ||
        classification.areaAtuacaoId === null,
      // Marketplace tags (definidas no blueprint):
      //   'featured'    => score > 0 (ja garantido por bp.score)
      //   'verified'    => verificationStatus = 'VERIFIED'
      //   'accelerated' => isAccelerated = true
      //   'approval'    => status = 'PENDING_CURATOR_REVIEW' (curador analisando)
      // O endpoint /api/startup/marketplace/* depende destes valores.
      // (status, verificationStatus, score, isAccelerated, socios, teams e
      // uso_recursos já foram definidos acima conforme `state` — ver bloco
      // "ESTADO DA STARTUP".)
    },
  });
  // Log das marketplace tags aplicadas
  if (bp.marketplaceTags.length > 0) {
    console.log(`  → marketplace tags: ${bp.marketplaceTags.join(', ')}`);
  }

  // 5. Campaign (somente OPEN e FUNDED têm captação ativa; DRAFT não tem)
  let createdCampaign: { id: number } | null = null;
  if (state !== 'DRAFT') {
    const deadline = new Date();
    if (state === 'FUNDED') {
      // FUNDED: rodada já fechou — deadline no passado
      deadline.setDate(deadline.getDate() - 30);
    } else {
      // OPEN: rodada ativa — deadline daqui a 90 dias
      deadline.setDate(deadline.getDate() + 90);
    }
    createdCampaign = await prisma.campaign.create({
      data: {
        startupId: startup.id,
        title: `${bp.name} - Rodada Inicial`,
        targetAmount: bp.campaign.targetAmount,
        minInvestment: bp.campaign.minInvestment,
        valuation: bp.campaign.valuation,
        tokenPrice: bp.campaign.tokenPrice,
        totalTokens: bp.campaign.totalTokens,
        tokensSold: bp.campaign.tokensSold,
        deadline,
        status: state === 'FUNDED' ? 'FUNDED' : 'OPEN',
        totalRaised:
          state === 'FUNDED'
            ? bp.campaign.tokenPrice * bp.campaign.tokensSold
            : undefined,
        transferStarted: state === 'FUNDED',
        // Para OPEN/FUNDED o founder pagou a reserva. Para DRAFT nem cria campaign.
        reservationFeePaid,
        ...seedCampaignMetadata(bp),
      },
    });
    await syncSeedCampaignDetails(startup.id, bp);
  }

  // 5b. Documentos CVM obrigatórios (apenas OPEN/FUNDED — DRAFT nem subiu docs)
  if (state !== 'DRAFT') {
    await seedStartupDocuments(startup.id, bp, state);
  }

  // 5c. Repasse + Installments (somente FUNDED)
  if (state === 'FUNDED' && createdCampaign) {
    await seedRepasseAndInstallments(
      createdCampaign.id,
      bp.campaign.targetAmount,
      bp.campaign.minInvestment,
    );
  }

  // 5d. Posts no portal de transparência (OPEN mostra atualizações recentes;
  //     FUNDED tem histórico completo de marcos + prestação de contas)
  if (state !== 'DRAFT') {
    await seedTransparencyPosts(startup.id, founder.id, bp, state);
  }

  // 5e. Tokens vendidos + Payments PAID (somente FUNDED) — simula uso real
  if (state === 'FUNDED' && createdCampaign) {
    await seedRealInvestorsAndTokens(
      createdCampaign.id,
      bp.campaign.tokensSold,
      bp.campaign.tokenPrice,
      bp.campaign.minInvestment,
    );
  }

  // 5f. Cobranças do founder para a startup (TOKEN_RESERVATION, COMPLIANCE_FEE,
  // VERIFICATION_SEAL). Popula a pagina /founder/financeiro com as 3 categorias
  // de servico. TOKEN_RESERVATION para TODAS as campanhas (DRAFT/OPEN/FUNDED);
  // COMPLIANCE_FEE + VERIFICATION_SEAL ("fast approve") para campanhas em
  // fase de captacao (DRAFT/OPEN). Idempotente — usa upsert por txid unico.
  if (createdCampaign) {
    await seedFounderPaymentsForCampaign(
      prisma,
      founder.id,
      startup.id,
      createdCampaign.id,
      bp.campaign.targetAmount,
      state,
    );
  }
  await syncSeedPhaseApprovals(prisma, startup.id, state, startupApproved);

  // 6. Selos: STAGE auto + startup_verificada (APPROVED) + startup (default) + manuais
  const sealsToAttribute: Array<{ slug: string; metadata: object }> = [
    { slug: 'startup', metadata: { source: 'auto', trigger: 'seed_default' } },
    {
      slug: 'startup_verificada',
      metadata: { source: 'auto', trigger: 'status_approved' },
    },
    {
      slug: stageToSealSlug(bp.estagio),
      metadata: { source: 'auto', trigger: 'estagio_seed' },
    },
    ...bp.manualSeals.map((s) => ({
      slug: s,
      metadata: { source: 'manual', trigger: 'seed' },
    })),
  ];

  for (const { slug, metadata } of sealsToAttribute) {
    const sealId = sealCache.get(slug);
    if (!sealId) continue;
    await prisma.startupSeal
      .create({
        data: {
          startupId: startup.id,
          sealId,
          issuedBy: null,
          metadata,
        },
      })
      .catch(() => undefined); // ignora @@unique se rodar 2x
  }

  return 'created';
}

async function upsertSeedImageProfile(
  existing: { id: number } | null | undefined,
  originalName: string,
  image: {
    size: number;
    contentType: string;
    url: string;
    url_sm: string;
    url_md: string;
    url_web: string;
    url_lg: string;
  },
) {
  const extension = image.contentType.split('/')[1]?.split(';')[0] || 'jpg';
  const data = {
    originalName: `${originalName}.${extension}`,
    size: image.size,
    mineType: image.contentType,
    extension,
    url: image.url,
    url_sm: image.url_sm,
    url_md: image.url_md,
    url_web: image.url_web,
    url_lg: image.url_lg,
    status: 'APPROVED' as const,
  };

  if (existing) {
    return prisma.kYCProfile.update({ where: { id: existing.id }, data });
  }

  return prisma.kYCProfile.create({ data });
}

function stageToSealSlug(estagio: string): string {
  const map: Record<string, string> = {
    ideação: 'ideacao',
    ideacao: 'ideacao',
    mvp: 'mvp',
    tração: 'tracao',
    tracao: 'tracao',
    operação: 'operacao',
    operacao: 'operacao',
    'break-even': 'breakeven',
    breakeven: 'breakeven',
    acelerada: 'acelerada',
  };
  return map[estagio.toLowerCase()] ?? 'startup';
}

// ============================================================================
// HELPERS PARA SEED REALISTA (T126+ — produção)
// ============================================================================

/** Categorias válidas no enum StartupDocumentCategory do schema. */
type CvmCategory =
  | 'MIE'
  | 'CONTRATO_SOCIAL'
  | 'CNPJ'
  | 'BALANCO_ATUAL'
  | 'DECLARACAO_VERACIDADE'
  | 'ATA_ELEICAO'
  | 'BALANCO_ANTERIOR'
  | 'PROCURACAO'
  | 'CV_SOCIOS'
  | 'PITCH_DECK'
  | 'PROJECOES'
  | 'MODELO_CONTRATO_OFERTA'
  | 'COMPROVANTE_ENDERECO'
  | 'DECLARACAO_RECEITA'
  | 'TERMO_PLATAFORMA'
  | 'OUTRO';

/** Tipos válidos no enum TransparencyPostType. */
type PostType =
  | 'FINANCIAL_REPORT'
  | 'PRODUCT_MILESTONE'
  | 'CORPORATE_CHANGE'
  | 'GENERAL';

/**
 * Perfis de investidores reais para popular tokens.
 * Distribuição de tokens para cada campanha FUNDED é feita em rodadas
 * baseadas em percentuais (alguns "tubarões" + vários pequenos).
 */
const INVESTOR_PROFILES: Array<{
  nome: string;
  email: string;
  cpf: string;
}> = [
  {
    nome: 'Carlos Mendes',
    email: 'carlos.mendes@invest.iselftoken.com',
    cpf: '222.222.222-01',
  },
  {
    nome: 'Ana Pereira',
    email: 'ana.pereira@invest.iselftoken.com',
    cpf: '222.222.222-02',
  },
  {
    nome: 'Roberto Lima',
    email: 'roberto.lima@invest.iselftoken.com',
    cpf: '222.222.222-03',
  },
  {
    nome: 'Fernanda Castro',
    email: 'fernanda.castro@invest.iselftoken.com',
    cpf: '222.222.222-04',
  },
  {
    nome: 'Marcio Tavares',
    email: 'marcio.tavares@invest.iselftoken.com',
    cpf: '222.222.222-05',
  },
  {
    nome: 'Patricia Rocha',
    email: 'patricia.rocha@invest.iselftoken.com',
    cpf: '222.222.222-06',
  },
  {
    nome: 'Eduardo Siqueira',
    email: 'eduardo.siqueira@invest.iselftoken.com',
    cpf: '222.222.222-07',
  },
  {
    nome: 'Beatriz Almeida',
    email: 'beatriz.almeida@invest.iselftoken.com',
    cpf: '222.222.222-08',
  },
  {
    nome: 'Lucas Ferreira',
    email: 'lucas.ferreira@invest.iselftoken.com',
    cpf: '222.222.222-09',
  },
  {
    nome: 'Renata Borges',
    email: 'renata.borges@invest.iselftoken.com',
    cpf: '222.222.222-10',
  },
];

/** Distribuição % de tokens por investidor (soma = 100). 2 tubarões + 8 pequenos. */
const TOKEN_ALLOCATION_PCT = [25, 18, 12, 10, 8, 7, 6, 5, 5, 4];

/**
 * Cria os documentos CVM obrigatórios + termo de adesão para uma startup
 * aprovada. Para state='OPEN': documentos enviados. Para state='FUNDED':
 * todos aprovados.
 */
async function seedStartupDocuments(
  startupId: number,
  bp: StartupBlueprint,
  state: 'OPEN' | 'FUNDED',
): Promise<void> {
  const docs: Array<{
    categoria: CvmCategory;
    nome: string;
    mimetype: string;
    sizeBytes: number;
  }> = [
    {
      categoria: 'MIE',
      nome: `MIE - ${bp.name} - Modelo de Investimento.pdf`,
      mimetype: 'application/pdf',
      sizeBytes: 420_000 + bp.slug.length * 1024,
    },
    {
      categoria: 'PITCH_DECK',
      nome: `Pitch Deck - ${bp.name}.pdf`,
      mimetype: 'application/pdf',
      sizeBytes: 1_800_000,
    },
    {
      categoria: 'BALANCO_ATUAL',
      nome: `Balanço Atual - ${bp.name}.pdf`,
      mimetype: 'application/pdf',
      sizeBytes: 950_000,
    },
    {
      categoria: 'CONTRATO_SOCIAL',
      nome: `Contrato Social - ${bp.name}.pdf`,
      mimetype: 'application/pdf',
      sizeBytes: 720_000,
    },
    {
      categoria: 'MODELO_CONTRATO_OFERTA',
      nome: `Modelo Contrato de Oferta - ${bp.name}.pdf`,
      mimetype: 'application/pdf',
      sizeBytes: 610_000,
    },
  ];

  const complianceUser = await prisma.user.findFirst({
    where: { role: 'COMPLIANCE' },
    select: { id: true },
  });
  const uploaderId = complianceUser?.id ?? 1;

  for (const d of docs) {
    await prisma.startupDocument.upsert({
      where: { s3Key: `seed/${startupId}/${d.nome}` },
      update: {},
      create: {
        startupId,
        categoria: d.categoria,
        nome: d.nome,
        s3Key: `seed/${startupId}/${d.nome}`,
        mimetype: d.mimetype,
        sizeBytes: d.sizeBytes,
        uploadedById: uploaderId,
      },
    });
  }
}

/**
 * Cria 1 Repasse + 12 Installments para campanhas FUNDED. As primeiras
 * 6 parcelas estão pagas (pagamentos históricos) e as últimas 6 estão
 * pendentes (próximos pagamentos).
 */
async function seedRepasseAndInstallments(
  campaignId: number,
  targetAmount: number,
  minInvestment: number,
): Promise<void> {
  const repasse = await prisma.repasse.upsert({
    where: { campaignId },
    update: {},
    create: {
      campaignId,
      numeroParcelas: 12,
      complianceApprovedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      valorParcela: targetAmount / 12,
      valorUltimaParcela: targetAmount / 12,
      intervaloDias: 30,
      valorTotalCaptacao: targetAmount,
      financeiroConfiguredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25),
      status: 'IN_PROGRESS',
    },
  });

  const now = Date.now();
  for (let i = 1; i <= 12; i++) {
    const dueDate = new Date(now - 1000 * 60 * 60 * 24 * 30 * (12 - i));
    const isPaid = i <= 6;
    await prisma.installment.upsert({
      where: { repasseId_numero: { repasseId: repasse.id, numero: i } },
      update: {},
      create: {
        repasseId: repasse.id,
        numero: i,
        valor: targetAmount / 12,
        scheduledDate: dueDate,
        paidAt: isPaid
          ? new Date(dueDate.getTime() + 1000 * 60 * 60 * 24 * 2)
          : null,
        status: isPaid ? 'COMPLETED' : 'PENDING',
      },
    });
  }
}

/**
 * Cria posts no portal de transparência:
 * - OPEN: 2-3 posts recentes (lançamento, marcos)
 * - FUNDED: histórico completo (lançamento + marcos mensais + prestação de contas)
 */
async function seedTransparencyPosts(
  startupId: number,
  founderId: number,
  bp: StartupBlueprint,
  state: 'OPEN' | 'FUNDED',
): Promise<void> {
  const now = Date.now();

  if (state === 'FUNDED') {
    // Histórico completo de 6 meses
    const posts: Array<{
      type: PostType;
      title: string;
      content: string;
      daysAgo: number;
    }> = [
      {
        type: 'GENERAL',
        title: `${bp.name} inicia sua rodada de captação`,
        content: `**${bp.name}** está oficialmente em captação na iSelfToken. Estamos buscando **${bp.campaign.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}** com valuation de **${bp.campaign.valuation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}**.\n\nO aporte será usado para escalar a operação, contratar time comercial e acelerar o roadmap técnico. Agradecemos a confiança de todos os investidores.`,
        daysAgo: 180,
      },
      {
        type: 'PRODUCT_MILESTONE',
        title: 'Meta de captação atingida com sucesso!',
        content: `É com grande satisfação que anunciamos: **atingimos 100% da meta de captação** de ${bp.campaign.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.\n\nTotal de ${bp.campaign.tokensSold.toLocaleString('pt-BR')} tokens subscritos por **${Math.round(bp.campaign.tokensSold / 50)} investidores**. Próximos passos: iniciar repasse e compliance.`,
        daysAgo: 120,
      },
      {
        type: 'FINANCIAL_REPORT',
        title: 'Prestação de contas — Parcela 6/12 paga',
        content: `Repasse em dia: **6 de 12 parcelas** já foram pagas ao founder. Total recebido até agora: **${((bp.campaign.targetAmount / 12) * 6).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}**.\n\nPróxima parcela prevista para daqui 30 dias. Detalhamento das despesas no PDF anexo.`,
        daysAgo: 30,
      },
    ];

    for (const p of posts) {
      const publishedAt = new Date(now - 1000 * 60 * 60 * 24 * p.daysAgo);
      await prisma.transparencyPost.create({
        data: {
          startupId,
          authorId: founderId,
          type: p.type,
          title: p.title,
          content: p.content,
          periodMonth: publishedAt.getMonth() + 1,
          periodYear: publishedAt.getFullYear(),
          publishedAt,
        },
      });
    }
  } else {
    // OPEN: 2 posts recentes
    const posts: Array<{
      type: PostType;
      title: string;
      content: string;
      daysAgo: number;
    }> = [
      {
        type: 'GENERAL',
        title: `${bp.name} lança rodada de captação na iSelfToken`,
        content: `Estamos captando **${bp.campaign.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}** para acelerar nosso crescimento. Junte-se a nós nessa jornada!`,
        daysAgo: 7,
      },
      {
        type: 'PRODUCT_MILESTONE',
        title: 'Já captamos 70% da meta!',
        content: `Agradecemos a confiança dos investidores. **70% da meta** já foi atingida. As últimas vagas estão abertas.`,
        daysAgo: 2,
      },
    ];

    for (const p of posts) {
      const publishedAt = new Date(now - 1000 * 60 * 60 * 24 * p.daysAgo);
      await prisma.transparencyPost.create({
        data: {
          startupId,
          authorId: founderId,
          type: p.type,
          title: p.title,
          content: p.content,
          periodMonth: publishedAt.getMonth() + 1,
          periodYear: publishedAt.getFullYear(),
          publishedAt,
        },
      });
    }
  }
}

/**
 * Cria 10 investidores reais (Users role=USER) com wallet + subscription e
 * distribui tokens de uma campanha FUNDED entre eles, gerando a cadeia:
 * User (investor) → Payment (PAID, effectsAppliedAt) → Investment (CONFIRMED)
 * → Token (com hash único).
 *
 * Atualiza também a Wallet do investidor (bloqueia o valor aportado) e o
 * `Campaign.tokensSold` é mantido pelo próprio bp.campaign.tokensSold.
 */
async function seedRealInvestorsAndTokens(
  campaignId: number,
  totalTokensSold: number,
  tokenPrice: number,
  minInvestment: number,
): Promise<void> {
  const password = await bcrypt.hash('Invest123!', 10);

  // 1. Cria 10 investidores com wallet e subscription
  const investors: Array<{ id: number; nome: string; email: string }> = [];
  for (const profile of INVESTOR_PROFILES) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {},
      create: {
        email: profile.email,
        nome: profile.nome,
        senha: password,
        role: 'USER',
        tipo_documento: 'CPF',
        reg_documento: profile.cpf,
        isActive: true,
        termosAceitos: true,
        politicaAceita: true,
        pais: await getBrazilCountryId(),
        bandeira: '🇧🇷',
      },
    });

    // Wallet 1:1 com User
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: 0,
        blocked: 0,
        currency: 'BRL',
      },
    });

    // Subscription ativa (plano-investidor) — sem unique em userId, então
    // verifica manualmente antes de criar
    const plan = await prisma.plan.findUnique({
      where: { slug: 'plano-investidor' },
    });
    if (plan) {
      const existingSub = await prisma.subscription.findFirst({
        where: { userId: user.id, planId: plan.id },
      });
      if (!existingSub) {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            status: 'ACTIVE',
            startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 275),
          },
        });
      }
    }

    investors.push({ id: user.id, nome: profile.nome, email: profile.email });
  }

  // 2. Distribui tokens entre os investidores baseado em TOKEN_ALLOCATION_PCT
  const now = Date.now();
  const fundClosedAt = now - 1000 * 60 * 60 * 24 * 30; // rodada fechou há 30 dias
  const allocationTotal = TOKEN_ALLOCATION_PCT.reduce((a, b) => a + b, 0);

  let allocated = 0;
  for (let i = 0; i < investors.length && allocated < totalTokensSold; i++) {
    const pct = TOKEN_ALLOCATION_PCT[i] / allocationTotal;
    const tokensForThis = Math.min(
      Math.floor(totalTokensSold * pct),
      totalTokensSold - allocated,
    );
    if (tokensForThis <= 0) break;

    // Garante múltiplo do minInvestment: ajusta tokens para o mínimo permitido
    const tokensClamped = Math.max(
      tokensForThis,
      Math.ceil(minInvestment / tokenPrice),
    );
    const finalTokens = Math.min(tokensClamped, totalTokensSold - allocated);
    const amount = finalTokens * tokenPrice;

    const investor = investors[i];

    // Stagger temporal: aportes de investidores diferentes em momentos distintos
    const investmentDate = new Date(
      fundClosedAt - 1000 * 60 * 60 * 24 * (30 - i * 2),
    );

    // 3. Cria Payment (PAID + effectsAppliedAt + txid)
    const payment = await prisma.payment.create({
      data: {
        userId: investor.id,
        purpose: 'INVESTMENT',
        amount,
        method: 'PIX',
        status: 'PAID',
        paidAt: investmentDate,
        effectsAppliedAt: new Date(investmentDate.getTime() + 1000 * 60 * 5),
        txid: `EFI${Math.random().toString(36).slice(2, 14).toUpperCase()}${'X'.repeat(0)}`.slice(
          0,
          26,
        ),
        endToEndId:
          `E${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(
            0,
            32,
          ),
      },
    });

    // 4. Cria Investment (CONFIRMED) — 1:1 com Payment via investmentId
    const investment = await prisma.investment.create({
      data: {
        userId: investor.id,
        campaignId,
        amount,
        tokensQty: finalTokens,
        // 1:1 com Payment via relação "payment" (Payment.investmentId tem @unique)
        payment: { connect: { id: payment.id } },
        status: 'CONFIRMED',
        createdAt: investmentDate,
      },
    });

    // 5. Cria Token (vinculado ao Investment + user + startup + campaign)
    const startupIdOfCampaign = (await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { startupId: true },
    }))!.startupId;
    await prisma.token.create({
      data: {
        hash: `0x${Buffer.from(`${campaignId}-${investor.id}-${i}`).toString('hex').padEnd(64, '0').slice(0, 64)}`,
        userId: investor.id,
        startupId: startupIdOfCampaign,
        campaignId,
        investmentId: investment.id,
        quantity: finalTokens,
        purchaseVal: amount / 100, // amount vem em centavos
        currentVal: amount / 100,
        dtAquisicao: investmentDate,
      },
    });

    // 6. Atualiza wallet (blocked += amount em centavos)
    await prisma.wallet.update({
      where: { userId: investor.id },
      data: { blocked: { increment: amount } },
    });

    // 7. TokenHistory (registro de aquisição) — campos: tokenId, userId,
    // type, amount (em reais), description
    const token = await prisma.token.findFirst({
      where: { investmentId: investment.id },
    });
    if (token) {
      await prisma.tokenHistory.create({
        data: {
          tokenId: token.id,
          userId: investor.id,
          type: 'BUY_MARKET',
          amount: amount / 100,
          description: `Compra de ${finalTokens.toLocaleString('pt-BR')} tokens da campanha #${campaignId} por R$ ${(amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          createdAt: investmentDate,
        },
      });
    }

    allocated += finalTokens;
  }
}

/**
 * Mantém a auditoria das fases coerente com o estado semeado.
 * Startups aprovadas já passaram pelas fases 1 e 2; uma captação OPEN
 * também precisa ter a taxa de compliance paga e a fase 3 aprovada.
 */
async function syncSeedPhaseApprovals(
  prisma: Awaited<ReturnType<typeof getSeedPrismaClient>>,
  startupId: number,
  state: 'DRAFT' | 'OPEN' | 'FUNDED',
  startupApproved: boolean,
): Promise<void> {
  if (!startupApproved) return;

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@iselftoken.com' },
    select: { id: true, nome: true, email: true },
  });
  if (!admin) return;

  const phases = state === 'OPEN' ? [1, 2, 3] : [1, 2];
  for (const phase of phases) {
    const latest = await prisma.startupReviewDecision.findFirst({
      where: { startupId, phase },
      orderBy: { createdAt: 'desc' },
      select: { decision: true },
    });
    if (latest?.decision === 'APPROVED') continue;

    await prisma.startupReviewDecision.create({
      data: {
        startupId,
        phase,
        decision: 'APPROVED',
        adminUserId: admin.id,
        adminName: admin.nome,
        adminEmail: admin.email,
        ip: 'seed',
      },
    });
  }
}

/**
 * Seed das cobranças que o founder paga PARA a plataforma em nome da startup.
 * Popula a pagina /founder/financeiro com as 3 categorias de servico.
 *
 * Categorias semeadas:
 *   - TOKEN_RESERVATION  → TODAS as campanhas (DRAFT/OPEN/FUNDED). 2% da meta.
 *   - COMPLIANCE_FEE     → campanhas em fase de captacao (DRAFT/OPEN).
 *   - VERIFICATION_SEAL  → campanhas em fase de captacao (DRAFT/OPEN), 1x.
 *
 * Idempotente: cada Payment tem `txid` deterministico (`SEED-<state>-<slug>-<purpose>`),
 * entao rodar o seed 2x nao gera duplicados.
 *
 * @param founderId         userId do founder (dono da startup)
 * @param startupId         startup.id (chave de agrupamento no /financeiro)
 * @param campaignId        campaign.id (vinculo Payment.campaignId)
 * @param targetAmount      meta da campanha em REAIS (number) — base do calculo
 *                          da reserva (2%)
 * @param state             "DRAFT" | "OPEN" | "FUNDED" — controla quais servicos
 *                          a semear (DRAFT/OPEN = captacao ativa; FUNDED = concluida)
 */
async function seedFounderPaymentsForCampaign(
  prisma: Awaited<ReturnType<typeof getSeedPrismaClient>>,
  founderId: number,
  startupId: number,
  campaignId: number,
  targetAmount: number,
  state: 'DRAFT' | 'OPEN' | 'FUNDED',
): Promise<void> {
  // 1. TOKEN_RESERVATION — 2% do targetAmount, em REAIS (Prisma Decimal
  //    armazena o numero como decimal simples, sem multiplicacao por 100).
  //    Sempre pago em qualquer fase (DRAFT paga a reserva para emitir tokens,
  //    OPEN/FUNDED ja pagaram antes de abrir a captação).
  const reservaAmount = Math.round(targetAmount * 0.02);
  // txid deixou de ser @unique (S18.6 — 2 Payments podem compartilhar 1 txid),
  // então upsert por txid não funciona. Usamos findFirst + update/create.
  const reservaTxid = `SEED-${state}-S${startupId}-TOKEN_RESERVATION`;
  const existingReserva = await prisma.payment.findFirst({
    where: { txid: reservaTxid },
    select: { id: true },
  });
  if (existingReserva) {
    await prisma.payment.update({
      where: { id: existingReserva.id },
      data: { status: 'PAID', effectsAppliedAt: new Date() },
    });
  } else {
    await prisma.payment.create({
      data: {
        userId: founderId,
        campaignId,
        purpose: 'TOKEN_RESERVATION',
        amount: reservaAmount,
        method: 'PIX',
        status: 'PAID',
        paidAt: new Date(),
        effectsAppliedAt: new Date(),
        txid: reservaTxid,
        endToEndId: `E-SEED-${state}-S${startupId}-RESERVA`,
        serviceDetails: {
          product: 'TOKEN_RESERVATION',
          seededFrom: 'prisma/seed.ts',
        },
      },
    });
  }

  // 2. COMPLIANCE_FEE — só para campanhas em captação (DRAFT/OPEN).
  //    Taxa padrao da plataforma: R$ 500,00 (em centavos = 50000).
  //    A CVM 88/2022 gatilha o repasse de fundos so apos o pagamento.
  if (state === 'DRAFT' || state === 'OPEN') {
    const complTxid = `SEED-${state}-S${startupId}-COMPLIANCE_FEE`;
    const existingCompl = await prisma.payment.findFirst({
      where: { txid: complTxid },
      select: { id: true },
    });
    if (existingCompl) {
      await prisma.payment.update({
        where: { id: existingCompl.id },
        data: { status: 'PAID', effectsAppliedAt: new Date() },
      });
    } else {
      await prisma.payment.create({
        data: {
          userId: founderId,
          campaignId,
          purpose: 'COMPLIANCE_FEE',
          amount: 500, // R$ 500,00 (decimal em REAIS — Prisma Decimal)
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
          effectsAppliedAt: new Date(),
          txid: complTxid,
          endToEndId: `E-SEED-${state}-S${startupId}-COMPL`,
          serviceDetails: {
            product: 'COMPLIANCE_FEE',
            seededFrom: 'prisma/seed.ts',
          },
        },
      });
    }
  }

  // 3. VERIFICATION_SEAL — "fast approve" / selo de Startup Verificada.
  //    Apenas em campanhas em captação (DRAFT/OPEN) — apos a captação
  //    concluida, o selo ja vem automatico via trigger status_approved.
  if (state === 'DRAFT' || state === 'OPEN') {
    const seloTxid = `SEED-${state}-S${startupId}-VERIFICATION_SEAL`;
    const existingSelo = await prisma.payment.findFirst({
      where: { txid: seloTxid },
      select: { id: true },
    });
    if (existingSelo) {
      await prisma.payment.update({
        where: { id: existingSelo.id },
        data: { status: 'PAID', effectsAppliedAt: new Date() },
      });
    } else {
      await prisma.payment.create({
        data: {
          userId: founderId,
          campaignId,
          purpose: 'VERIFICATION_SEAL',
          amount: 890, // R$ 890,00 (decimal em REAIS — Prisma Decimal)
          method: 'PIX',
          status: 'PAID',
          paidAt: new Date(),
          effectsAppliedAt: new Date(),
          txid: seloTxid,
          endToEndId: `E-SEED-${state}-S${startupId}-SELO`,
          serviceDetails: {
            product: 'VERIFICATION_SEAL',
            seededFrom: 'prisma/seed.ts',
          },
        },
      });
    }
  }
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'erro desconhecido';
    console.error(`❌ Erro ao executar seed: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
