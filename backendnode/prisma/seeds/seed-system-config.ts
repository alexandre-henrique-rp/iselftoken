import { getSeedPrismaClient } from './seed-client-helper';
import 'dotenv/config';

interface SystemConfigSeed {
  key: string;
  value: number;
  description: string;
}

const SYSTEM_CONFIG_DEFAULTS: SystemConfigSeed[] = [
  {
    key: 'TOKEN_BASE_VALUE',
    value: 200,
    description: 'Valor base padrão de cada token em BRL',
  },
  {
    key: 'TOKEN_TRANSACTION_FEE',
    value: 10,
    description: 'Taxa de transação aplicada sobre o valor base do token em BRL',
  },
  {
    key: 'TOKEN_MINT_FEE',
    value: 1,
    description: 'Custo de geração de cada token em BRL',
  },
  {
    key: 'PLATFORM_ADMIN_FEE_PCT',
    value: 0.2,
    description: 'Percentual da meta destinado à taxa administrativa',
  },
  {
    key: 'COMPLIANCE_FEE',
    value: 1500,
    description: 'Taxa de compliance padrão em BRL',
  },
  {
    key: 'FAST_DEPLOY_FEE',
    value: 1000,
    description:
      'Preço do serviço "Publicação Rápida" (FAST_DEPLOY) — publicação imediata na aprovação da Fase 3 em vez do delay padrão de 24h (R$)',
  },
  {
    key: 'CAMPAIGN_TARGET_MIN',
    value: 10000,
    description: 'Meta minima de captacao por campanha em BRL',
  },
  {
    key: 'CAMPAIGN_TARGET_MAX',
    value: 5000000,
    description: 'Meta maxima de captacao por campanha em BRL (limite CVM 88)',
  },
  {
    key: 'CAMPAIGN_TOKEN_PRICE_MIN',
    value: 1.0,
    description: 'Preco minimo por token em BRL',
  },
  {
    key: 'CAMPAIGN_TOKEN_PRICE_MAX',
    value: 10000.0,
    description: 'Preco maximo por token em BRL',
  },
  {
    key: 'CAMPAIGN_EQUITY_MIN',
    value: 5.0,
    description: 'Porcentagem minima de equity oferecida',
  },
  {
    key: 'CAMPAIGN_EQUITY_MAX',
    value: 49.0,
    description: 'Porcentagem maxima de equity oferecida',
  },
  {
    key: 'INVESTMENT_SINGLE_MIN',
    value: 500.0,
    description: 'Aporte minimo individual por investimento em BRL',
  },
  {
    key: 'INVESTMENT_SINGLE_MAX',
    value: 250000.0,
    description: 'Aporte maximo individual por investimento em BRL',
  },
  {
    key: 'RESERVA_TAXA_POR_TOKEN',
    value: 1.0,
    description: 'Taxa fixa de reserva de token em BRL (R$ 1,00 por token)',
  },
  {
    key: 'CAMPAIGN_MIN_TOKENS',
    value: 100,
    description: 'Mínimo de tokens por campanha (anti-token-unitário)',
  },
  {
    key: 'CAMPAIGN_MAX_TOKENS',
    value: 1000000,
    description: 'Máximo de tokens por campanha (anti-diluição)',
  },
];

export async function seedSystemConfig() {
  const prisma = getSeedPrismaClient();

  try {
    let inserted = 0;
    let updated = 0;
    for (const item of SYSTEM_CONFIG_DEFAULTS) {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: item.key },
      });
      if (existing) {
        await prisma.systemConfig.update({
          where: { key: item.key },
          data: { value: item.value, description: item.description },
        });
        updated++;
      } else {
        await prisma.systemConfig.create({
          data: {
            key: item.key,
            value: item.value,
            description: item.description,
          },
        });
        inserted++;
      }
    }
    console.log(
      `✅ SystemConfig: ${inserted} inserida(s), ${updated} atualizada(s), ${SYSTEM_CONFIG_DEFAULTS.length} total`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Permite executar diretamente: `ts-node prisma/seeds/seed-system-config.ts`
if (require.main === module) {
  seedSystemConfig().catch((error) => {
    console.error('❌ Falha ao popular SystemConfig:', error);
    process.exit(1);
  });
}
