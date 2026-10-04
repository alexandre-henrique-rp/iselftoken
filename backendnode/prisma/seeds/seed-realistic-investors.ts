/**
 * seed-realistic-investors.ts
 *
 * Cenários realistas para as startups do founder@iselftoken.com:
 * - +3 investidores com tokens comprados (via createMany — rápido)
 * - +1 afiliado com afiliação PENDING_FOUNDER
 * - TechInnovate: múltiplos investidores + afiliado aprovado + afiliado pendente
 * - GreenEnergy: tokens distribuídos + repasse aguardando compliance
 * - Payment TOKEN_RESERVATION (R$ 1,00/token) para cada campanha
 *
 * Regra de negócio:
 * - Qtd tokens = targetAmount / tokenPrice
 * - Taxa de reserva = totalTokens × R$ 1,00 (fixo)
 */
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import 'dotenv/config';
import { getSeedPrismaClient } from './seed-client-helper';
import { seedImageFromUrl } from './seed-image-helper';

export async function seedRealisticInvestors() {
  const prisma = getSeedPrismaClient();

  try {
    console.log('\n👥 Criando investidores e afiliados realistas...');

    const password = await bcrypt.hash('Invest123!', 10);

    // ═══════════════════════════════════════════════
    // NOVOS INVESTIDORES (3)
    // ═══════════════════════════════════════════════
    const investorData = [
      {
        email: 'investidor2@email.com',
        nome: 'Maria Investidora',
        cpf: '222.333.444-55',
        avatarUrl:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces',
      },
      {
        email: 'investidor3@email.com',
        nome: 'Carlos Santos',
        cpf: '333.444.555-66',
        avatarUrl:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces',
      },
      {
        email: 'investidor4@email.com',
        nome: 'Ana Paula Reis',
        cpf: '444.555.666-77',
        avatarUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
      },
    ];

    const investors: Array<{ id: number; email: string }> = [];

    for (const inv of investorData) {
      let user = await prisma.user.findUnique({ where: { email: inv.email } });
      if (!user) {
        const avatarImg = await seedImageFromUrl(
          `avatar-${inv.email.split('@')[0]}`,
          inv.avatarUrl,
        );
        const avatar = await prisma.kYCProfile.create({
          data: {
            originalName: `avatar-${inv.email.split('@')[0]}.png`,
            size: avatarImg.size || 2048,
            mineType: 'image/png',
            extension: 'png',
            url: avatarImg.url,
            url_sm: avatarImg.url_sm || avatarImg.url,
            url_md: avatarImg.url_md || avatarImg.url,
            url_web: avatarImg.url_web || avatarImg.url,
            url_lg: avatarImg.url_lg || avatarImg.url,
            status: 'APPROVED',
          },
        });
        user = await prisma.user.create({
          data: {
            email: inv.email,
            nome: inv.nome,
            senha: password,
            role: 'USER',
            tipo_documento: 'CPF',
            reg_documento: inv.cpf,
            isActive: true,
            termosAceitos: true,
            politicaAceita: true,
            pais: 31,
            bandeira: '🇧🇷',
            avatar_id: avatar.id,
          },
        });
        const plano = await prisma.plan.findUnique({
          where: { slug: 'plano-investidor' },
        });
        if (plano) {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              planId: plano.id,
              status: 'ACTIVE',
              startedAt: new Date(),
              expiresAt: new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000),
            },
          });
        }
        await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: 50000,
            blocked: 0,
            currency: 'BRL',
          },
        });
        console.log(`  ✓ Investidor criado: ${user.email}`);
      }
      investors.push({ id: user.id, email: user.email });
    }

    // ═══════════════════════════════════════════════
    // NOVO AFILIADO 2
    // ═══════════════════════════════════════════════
    let afiliado2 = await prisma.user.findUnique({
      where: { email: 'afiliado2@iselftoken.com' },
    });
    if (!afiliado2) {
      const avatarImg = await seedImageFromUrl(
        'avatar-afiliado2',
        'https://ui-avatars.com/api/?name=Fernanda+Afiliada&background=ca8a04&color=fff&size=400',
      );
      const avatar = await prisma.kYCProfile.create({
        data: {
          originalName: 'avatar-afiliado2.png',
          size: avatarImg.size || 2048,
          mineType: 'image/png',
          extension: 'png',
          url: avatarImg.url,
          url_sm: avatarImg.url_sm || avatarImg.url,
          url_md: avatarImg.url_md || avatarImg.url,
          url_web: avatarImg.url_web || avatarImg.url,
          url_lg: avatarImg.url_lg || avatarImg.url,
          status: 'APPROVED',
        },
      });
      afiliado2 = await prisma.user.create({
        data: {
          email: 'afiliado2@iselftoken.com',
          nome: 'Fernanda Afiliada',
          senha: await bcrypt.hash('Afiliado123!', 10),
          role: 'USER',
          tipo_documento: 'CPF',
          reg_documento: '777.888.999-00',
          isActive: true,
          termosAceitos: true,
          politicaAceita: true,
          pais: 31,
          bandeira: '🇧🇷',
          avatar_id: avatar.id,
        },
      });
      const planoInv = await prisma.plan.findUnique({
        where: { slug: 'plano-investidor' },
      });
      const planoAfi = await prisma.plan.findUnique({
        where: { slug: 'plano-afiliado' },
      });
      if (planoInv)
        await prisma.subscription.create({
          data: {
            userId: afiliado2.id,
            planId: planoInv.id,
            status: 'ACTIVE',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000),
          },
        });
      if (planoAfi)
        await prisma.subscription.create({
          data: {
            userId: afiliado2.id,
            planId: planoAfi.id,
            status: 'ACTIVE',
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000),
          },
        });
      await prisma.wallet.create({
        data: {
          userId: afiliado2.id,
          balance: 30000,
          blocked: 0,
          currency: 'BRL',
        },
      });
      console.log(`  ✓ Afiliado2 criado: ${afiliado2.email}`);
    }

    // ═══════════════════════════════════════════════
    // TECHINNOVATE: Tokens + Afiliados
    // ═══════════════════════════════════════════════
    const techinnovate = await prisma.startup.findUnique({
      where: { slug: 'techinnovate' },
    });
    if (techinnovate) {
      const campaign = await prisma.campaign.findFirst({
        where: { startupId: techinnovate.id, status: 'OPEN' },
      });
      if (campaign) {
        const tokenPrice = Number(campaign.tokenPrice);

        // Payment TOKEN_RESERVATION (R$ 1/token) para o founder
        const existingReservation = await prisma.payment.findFirst({
          where: {
            userId: techinnovate.founderId,
            purpose: 'TOKEN_RESERVATION',
            campaignId: campaign.id,
          },
        });
        if (!existingReservation) {
          await prisma.payment.create({
            data: {
              userId: techinnovate.founderId,
              amount: campaign.totalTokens * 1.0, // R$ 1,00 por token
              method: 'PIX',
              status: 'PAID',
              purpose: 'TOKEN_RESERVATION',
              campaignId: campaign.id,
              paidAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            },
          });
          console.log(
            `  ✓ TOKEN_RESERVATION TechInnovate: R$ ${campaign.totalTokens} (${campaign.totalTokens} tokens × R$1)`,
          );
        }

        // Tokens para os 3 novos investidores (batch via createMany)
        for (const inv of investors) {
          const existingTokens = await prisma.token.count({
            where: { userId: inv.id, startupId: techinnovate.id },
          });
          if (existingTokens === 0) {
            const qty = 200 + Math.floor(Math.random() * 300); // 200-500 tokens
            const tokens = Array.from({ length: qty }, (_, i) => ({
              hash: `TECH-${inv.email.split('@')[0].toUpperCase()}-${crypto.randomUUID().slice(0, 8)}-${i}`,
              userId: inv.id,
              startupId: techinnovate.id,
              campaignId: campaign.id,
              quantity: 1,
              purchaseVal: tokenPrice,
              currentVal:
                Math.round(tokenPrice * (1 + Math.random() * 0.15) * 100) / 100,
            }));
            await prisma.token.createMany({ data: tokens });
            await prisma.investment.create({
              data: {
                userId: inv.id,
                campaignId: campaign.id,
                amount: qty * tokenPrice,
                tokensQty: qty,
                status: 'CONFIRMED',
              },
            });
            await prisma.payment.create({
              data: {
                userId: inv.id,
                amount: qty * tokenPrice,
                method: 'PIX',
                status: 'PAID',
                purpose: 'INVESTMENT',
                paidAt: new Date(
                  Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000,
                ),
              },
            });
            console.log(`    → ${inv.email}: ${qty} tokens em TechInnovate`);
          }
        }

        // Programa de afiliados + afiliação
        const afiliado1 = await prisma.user.findUnique({
          where: { email: 'afiliado@iselftoken.com' },
        });
        if (afiliado1) {
          let program = await prisma.affiliateProgram.findUnique({
            where: { startupId: techinnovate.id },
          });
          if (!program) {
            program = await prisma.affiliateProgram.create({
              data: {
                startupId: techinnovate.id,
                status: 'APPROVED',
                affiliateCommissionPct: 5.0,
                platformCommissionPct: 2.0,
                maxAffiliates: 10,
                requestedBy: techinnovate.founderId,
                decidedAt: new Date(),
                decidedBy: 1,
              },
            });
          }

          // Afiliado1: ACTIVE com referral
          const existingAff1 = await prisma.affiliation.findFirst({
            where: { programId: program.id, userId: afiliado1.id },
          });
          if (!existingAff1) {
            const aff = await prisma.affiliation.create({
              data: {
                programId: program.id,
                userId: afiliado1.id,
                status: 'ACTIVE',
                code: `TECH-AFI-${afiliado1.id}`,
                tokensAllocated: 500,
                appliedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                founderDecidedAt: new Date(
                  Date.now() - 25 * 24 * 60 * 60 * 1000,
                ),
                founderDecidedBy: techinnovate.founderId,
                adminDecidedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
                adminDecidedBy: 1,
              },
            });
            if (investors[0]) {
              await prisma.affiliateReferral
                .create({
                  data: {
                    affiliationId: aff.id,
                    investorId: investors[0].id,
                    source: 'LINK',
                  },
                })
                .catch(() => {});
            }
            console.log(`    → Afiliado1 APROVADO em TechInnovate`);
          }

          // Afiliado2: PENDING_FOUNDER (solicitando)
          const existingAff2 = await prisma.affiliation.findFirst({
            where: { programId: program.id, userId: afiliado2.id },
          });
          if (!existingAff2) {
            await prisma.affiliation.create({
              data: {
                programId: program.id,
                userId: afiliado2.id,
                status: 'PENDING_FOUNDER',
                code: `TECH-AFI-${afiliado2.id}`,
                appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              },
            });
            console.log(
              `    → Afiliado2 SOLICITANDO afiliação em TechInnovate`,
            );
          }
        }
      }
    }

    // ═══════════════════════════════════════════════
    // GREENENERGY: 100% vendidos + Repasse
    // ═══════════════════════════════════════════════
    const greenenergy = await prisma.startup.findUnique({
      where: { slug: 'greenenergy' },
    });
    if (greenenergy) {
      const campaign = await prisma.campaign.findFirst({
        where: { startupId: greenenergy.id, status: 'FUNDED' },
      });
      if (campaign) {
        const tokenPrice = Number(campaign.tokenPrice);
        const totalTokens = campaign.totalTokens;

        // Payment TOKEN_RESERVATION para o founder
        const existingReservation = await prisma.payment.findFirst({
          where: {
            userId: greenenergy.founderId,
            purpose: 'TOKEN_RESERVATION',
            campaignId: campaign.id,
          },
        });
        if (!existingReservation) {
          await prisma.payment.create({
            data: {
              userId: greenenergy.founderId,
              amount: totalTokens * 1.0, // R$ 1,00 por token
              method: 'PIX',
              status: 'PAID',
              purpose: 'TOKEN_RESERVATION',
              campaignId: campaign.id,
              paidAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          });
          console.log(
            `  ✓ TOKEN_RESERVATION GreenEnergy: R$ ${totalTokens} (${totalTokens} tokens × R$1)`,
          );
        }

        // Buscar todos os investidores para distribuir tokens
        const allInvestorEmails = [
          'investidor1@email.com',
          'afiliado@iselftoken.com',
          ...investorData.map((i) => i.email),
        ];
        const allInvestors = await prisma.user.findMany({
          where: { email: { in: allInvestorEmails } },
          select: { id: true, email: true },
        });

        const tokensPerInvestor = Math.floor(totalTokens / allInvestors.length);

        for (const inv of allInvestors) {
          const existingTokens = await prisma.token.count({
            where: { userId: inv.id, startupId: greenenergy.id },
          });
          if (existingTokens === 0) {
            // createMany em batches de 5000 para não estourar memória
            const qty = tokensPerInvestor;
            const batchSize = 5000;
            for (let offset = 0; offset < qty; offset += batchSize) {
              const count = Math.min(batchSize, qty - offset);
              const batch = Array.from({ length: count }, (_, i) => ({
                hash: `GREEN-${inv.email.split('@')[0].toUpperCase()}-${crypto.randomUUID().slice(0, 8)}-${offset + i}`,
                userId: inv.id,
                startupId: greenenergy.id,
                campaignId: campaign.id,
                quantity: 1,
                purchaseVal: tokenPrice,
                currentVal: Math.round(tokenPrice * 1.25 * 100) / 100, // +25% valorização
              }));
              await prisma.token.createMany({ data: batch });
            }
            await prisma.investment.create({
              data: {
                userId: inv.id,
                campaignId: campaign.id,
                amount: qty * tokenPrice,
                tokensQty: qty,
                status: 'CONFIRMED',
              },
            });
            await prisma.payment.create({
              data: {
                userId: inv.id,
                amount: qty * tokenPrice,
                method: 'PIX',
                status: 'PAID',
                purpose: 'INVESTMENT',
                paidAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
              },
            });
            console.log(`    → ${inv.email}: ${qty} tokens em GreenEnergy`);
          }
        }

        // Repasse aguardando deliberação compliance
        const existingRepasse = await prisma.repasse.findUnique({
          where: { campaignId: campaign.id },
        });
        if (!existingRepasse) {
          await prisma.repasse.create({
            data: {
              campaignId: campaign.id,
              numeroParcelas: 12,
              valorTotalCaptacao: Number(campaign.targetAmount),
              status: 'CONFIGURED',
            },
          });
          console.log(
            `    → Repasse GreenEnergy criado (aguardando deliberação compliance)`,
          );
        }
      }
    }

    console.log('\n✅ Investidores e afiliados realistas criados!');
    console.log(
      '   investidor2@email.com / investidor3@email.com / investidor4@email.com (senha: Invest123!)',
    );
    console.log('   afiliado2@iselftoken.com (senha: Afiliado123!)');
    console.log('   Taxa de reserva: R$ 1,00/token (TOKEN_RESERVATION)');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedRealisticInvestors().catch((e) => {
    console.error('❌ Erro ao executar seed-realistic-investors:', e);
    process.exit(1);
  });
}
