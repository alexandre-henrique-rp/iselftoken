import { ApiProperty } from '@nestjs/swagger';

/**
 * País enriquecido para leitura. O banco mantém apenas o ID em `User.pais`;
 * nome, ISO e emoji são derivados do catálogo Country.
 */
export class PaisRef {
  @ApiProperty({
    example: 31,
    nullable: true,
    description: 'ID do catálogo Country',
  })
  id: number | null;

  @ApiProperty({ example: 'BRA', description: 'ISO 3166-1 alpha-3' })
  iso3: string;

  @ApiProperty({ example: 'Brasil', description: 'Nome do país' })
  nome: string;

  @ApiProperty({ example: '🇧🇷', description: 'Emoji da bandeira' })
  emoji: string;
}

/**
 * Wallet resumida — apenas id e updatedAt.
 * Saldo e outras infos devem ser consultados via `/wallet/me` (rota dedicada).
 */
export class WalletRef {
  @ApiProperty({ example: 1, description: 'Identificador da carteira' })
  id: number;

  @ApiProperty({
    example: '2026-07-17T23:04:59.719Z',
    description: 'Última atualização da carteira',
  })
  updatedAt: Date;
}

/**
 * Plano resumido — apenas o suficiente para exibir no menu/plano ativo.
 */
export class PlanRef {
  @ApiProperty({ example: 3, description: 'Identificador do plano' })
  id: number;

  @ApiProperty({ example: 'FUNDADOR', description: 'Nome do plano' })
  nome: string;

  @ApiProperty({ example: 'plano-fundador' })
  slug: string;

  @ApiProperty({ nullable: true, required: false })
  descricao: string | null;

  @ApiProperty({ example: '199.90' })
  preco: string;

  @ApiProperty({ example: 12 })
  periodoMeses: number;

  @ApiProperty({ example: '/ano' })
  periodo: string;
}

/**
 * Subscription resumida — status + validade para o front decidir redirecionamento.
 */
export class PublicSubscription {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 2 })
  userId: number;

  @ApiProperty({ example: 3 })
  planId: number;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Status: PENDING | ACTIVE | EXPIRED | CANCELED',
  })
  status: string;

  @ApiProperty({
    example: '2026-07-17T23:04:59.688Z',
    nullable: true,
    required: false,
  })
  startedAt: Date | null;

  @ApiProperty({
    example: '2032-07-17T23:04:59.688Z',
    nullable: true,
    required: false,
  })
  expiresAt: Date | null;

  @ApiProperty({ example: '2026-07-17T23:04:59.691Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-17T23:04:59.691Z' })
  updatedAt: Date;

  @ApiProperty({ type: () => PlanRef })
  plan: PlanRef;
}

/**
 * Startup resumida — apenas o id para o front contar/listar cards de
 * campanhas. Detalhes (nome, slug, status) devem vir de `/startup/by-id/:id`.
 */
export class PublicStartupRef {
  @ApiProperty({ example: 1 })
  id: number;
}

export class ProfileDocumentRef {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: 'https://storage.example/document.jpg' })
  url: string;

  @ApiProperty({ nullable: true, required: false })
  url_sm: string | null;

  @ApiProperty({ nullable: true, required: false })
  url_md: string | null;

  @ApiProperty({ nullable: true, required: false })
  url_web: string | null;

  @ApiProperty({ nullable: true, required: false })
  url_lg: string | null;

  @ApiProperty({ example: 'APPROVED' })
  status: string;
}

/**
 * Shape público do usuário logado.
 *
 * O payload contém os dados da própria conta necessários para Perfil/KYC,
 * mas não contém senha, consentimentos, pagamentos, investimentos, tokens,
 * logs de auditoria ou qualquer relação administrativa.
 */
export class PublicUserData {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({
    example: 'f91d6f70-a1ab-4017-a6d9-33a98faf7445',
    description: 'UUID público do usuário (use este em URLs, nunca o id)',
  })
  publicId: string;

  @ApiProperty({ example: 'founder@iselftoken.com' })
  email: string;

  @ApiProperty({ example: 'João Founder Silva' })
  nome: string;

  @ApiProperty({
    example: 'USER',
    description: 'Papel do usuário na plataforma',
  })
  role: string;

  @ApiProperty({ nullable: true, required: false })
  telefone: string | null;

  @ApiProperty({ nullable: true, required: false })
  data_nascimento: Date | null;

  @ApiProperty({ nullable: true, required: false })
  genero: string | null;

  @ApiProperty({ nullable: true, required: false })
  endereco: string | null;

  @ApiProperty({ nullable: true, required: false })
  numero: string | null;

  @ApiProperty({ nullable: true, required: false })
  complemento: string | null;

  @ApiProperty({ nullable: true, required: false })
  bairro: string | null;

  @ApiProperty({ nullable: true, required: false })
  cidade: string | null;

  @ApiProperty({ nullable: true, required: false })
  uf: string | null;

  @ApiProperty({ nullable: true, required: false })
  cep: string | null;

  @ApiProperty({ nullable: true, required: false })
  tipo_documento: string | null;

  @ApiProperty({ nullable: true, required: false })
  reg_documento: string | null;

  @ApiProperty({
    type: () => ProfileDocumentRef,
    nullable: true,
    required: false,
  })
  avatar: ProfileDocumentRef | null;

  @ApiProperty({
    type: () => ProfileDocumentRef,
    nullable: true,
    required: false,
  })
  comprovante: ProfileDocumentRef | null;

  @ApiProperty({
    type: () => ProfileDocumentRef,
    nullable: true,
    required: false,
  })
  documento: ProfileDocumentRef | null;

  @ApiProperty({
    type: () => ProfileDocumentRef,
    nullable: true,
    required: false,
  })
  biofacial: ProfileDocumentRef | null;

  @ApiProperty({
    type: () => PaisRef,
    nullable: true,
    required: false,
    description: 'País de residência enriquecido a partir do ID persistido',
  })
  pais: PaisRef | null;

  @ApiProperty({
    example: '🇧🇷',
    nullable: true,
    required: false,
    description: 'Bandeira canônica do país',
  })
  bandeira: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-07-17T23:04:59.670Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-17T23:04:59.670Z' })
  updatedAt: Date;

  @ApiProperty({
    type: () => WalletRef,
    nullable: true,
    required: false,
    description: 'Carteira do usuário (apenas referência)',
  })
  wallet: WalletRef | null;

  @ApiProperty({
    type: () => [PublicSubscription],
    description: 'Assinaturas do usuário',
  })
  subscriptions: PublicSubscription[];

  @ApiProperty({
    type: () => [PublicStartupRef],
    description: 'Startups das quais o usuário é fundador',
  })
  startups: PublicStartupRef[];
}

/**
 * Wrapper de resposta de `GET /users/me`.
 */
export class User {
  @ApiProperty({ example: false, description: 'Indica se houve erro' })
  error: boolean;

  @ApiProperty({
    example: 'Dados do usuário retornados com sucesso',
    description: 'Mensagem de retorno',
  })
  message: string;

  @ApiProperty({ example: 200, description: 'Código HTTP da resposta' })
  codigo: number;

  @ApiProperty({
    type: () => PublicUserData,
    description:
      'Payload público do usuário logado (id, publicId, email, nome, role, ' +
      'pais, isActive, createdAt, updatedAt, wallet, subscriptions, startups)',
  })
  data: PublicUserData;
}
