import { Prisma } from '@prisma/client';

const payloadRelations = {
  include: {
    avatar: true,
    comprovante: true,
    documento: true,
    biofacial: true,
    wallet: true,
    payments: true,
    subscriptions: true,
    startups: true,
    investments: true,
    tokens: true,
    tokenHistory: true,
    auditLogs: true,
    paisCountry: {
      select: {
        id: true,
        name: true,
        iso3: true,
        emoji: true,
      },
    },
  },
} as const;

export type UserWithRelations = Prisma.UserGetPayload<{
  include: (typeof payloadRelations)['include'];
}>;

export type PayloadData = Omit<UserWithRelations, 'senha'>;

export class PayloadEntity {
  id: PayloadData['id'];
  publicId: PayloadData['publicId'];
  email: PayloadData['email'];
  nome: PayloadData['nome'];
  role: PayloadData['role'];
  telefone: PayloadData['telefone'];
  data_nascimento: PayloadData['data_nascimento'];
  genero: PayloadData['genero'];
  endereco: PayloadData['endereco'];
  numero: PayloadData['numero'];
  complemento: PayloadData['complemento'];
  bairro: PayloadData['bairro'];
  cidade: PayloadData['cidade'];
  uf: PayloadData['uf'];
  cep: PayloadData['cep'];
  pais: PayloadData['pais'];
  bandeira: PayloadData['bandeira'];
  paisCountry: PayloadData['paisCountry'];
  tipo_documento: PayloadData['tipo_documento'];
  reg_documento: PayloadData['reg_documento'];
  isActive: PayloadData['isActive'];
  createdAt: PayloadData['createdAt'];
  updatedAt: PayloadData['updatedAt'];
  avatar: PayloadData['avatar'];
  comprovante: PayloadData['comprovante'];
  documento: PayloadData['documento'];
  biofacial: PayloadData['biofacial'];
  wallet: PayloadData['wallet'];
  payments: PayloadData['payments'];
  subscriptions: PayloadData['subscriptions'];
  startups: PayloadData['startups'];
  investments: PayloadData['investments'];
  tokens: PayloadData['tokens'];
  tokenHistory: PayloadData['tokenHistory'];
  auditLogs: PayloadData['auditLogs'];

  constructor(partial: PayloadData) {
    Object.assign(this, partial);
  }

  static fromPrisma(user: UserWithRelations): PayloadEntity {
    // removes senha before instantiating entity
    const { senha, ...rest } = user;
    void senha;
    return new PayloadEntity(rest);
  }
}
