import { getSeedPrismaClient } from './seed-client-helper';
import 'dotenv/config';

const FUNDRAISING_DEFAULTS = [
  { key: 'fundraising.tokenPrice',          value: '200',    description: 'Preco base do token (R$)' },
  { key: 'fundraising.tokenSalePrice',      value: '240',    description: 'Preco de venda do token (R$)' },
  { key: 'fundraising.fastTrackReview',     value: '600',    description: 'Taxa de fast-track review (R$)' },
  { key: 'fundraising.platformFee',          value: '0.05',   description: 'Taxa da plataforma (5%)' },
  { key: 'fundraising.authFeePerToken',     value: '1',      description: 'Custo de geracao por token (R$/token)' },
  { key: 'fundraising.minCampaign',         value: '300000', description: 'Valor minimo de campanha (R$)' },
  { key: 'fundraising.maxCampaign',         value: '12000000', description: 'Valor maximo de campanha (R$)' },
  { key: 'fundraising.equityMin',           value: '5',      description: 'Equity minimo (%)' },
  { key: 'fundraising.equityMax',           value: '20',     description: 'Equity maximo (%)' },
  // B02/B03 - Taxas de compliance
  { key: 'fundraising.complianceFee',       value: '1500',   description: 'Taxa de compliance padrao (R$)' },
  { key: 'fundraising.fastTrackFee',         value: '2500',   description: 'Taxa Fast Track = compliance + prioridade (R$)' },
];

export async function seedFundraisingConfig() {
  const prisma = getSeedPrismaClient();

  try {
    for (const item of FUNDRAISING_DEFAULTS) {
      await prisma.financeConfig.upsert({
        where: { key: item.key },
        update: { value: item.value, description: item.description },
        create: { key: item.key, value: item.value, description: item.description },
      });
    }
    console.log(`✅ FundraisingConfig: ${FUNDRAISING_DEFAULTS.length} chave(s) garantida(s)`);
  } finally {
    await prisma.$disconnect();
  }
}
