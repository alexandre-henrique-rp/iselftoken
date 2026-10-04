import { z } from 'zod';

const JWT_SECRET_PLACEHOLDERS = new Set([
  'your-jwt-secret-here',
  'trocar-por-valor-seguro-min-32-chars',
  'dev-jwt-secret-change-in-production',
]);

const WEBHOOK_HASH_SECRET_PLACEHOLDERS = new Set([
  'default-secret-change-me',
  'dev-webhook-hash-secret-change-in-production',
]);

export const envSchema = z
  .object({
    // Database
    DATABASE_URL: z
      .string()
      .regex(
        /^file:.*\.db$/,
        'DATABASE_URL inválida: use uma URL SQLite file:...db',
      ),
    DATABASE_PROVIDER: z.literal('sqlite').default('sqlite'),

    // AWS S3 / object storage
    AWS_REGION: z
      .string()
      .trim()
      .regex(
        /^[a-z]{2}(?:-gov)?-[a-z]+-\d+$/,
        'AWS_REGION deve ser uma região AWS válida',
      )
      .default('sa-east-1'),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_PREFIX: z.string().trim().default(''),
    S3_PUBLIC_BASE_URL: z.string().trim().default(''),
    S3_PUBLIC_HOST: z.string().trim().default(''),
    S3_ENDPOINT: z.string().trim().default(''),
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).optional(),
    S3_CORS_ORIGINS: z.string().default(''),
    UPLOAD_PRESIGNED_URL_TTL: z.coerce
      .number()
      .int()
      .positive()
      .default(604800),

    // JWT (OBRIGATÓRIO, sem fallback)
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres')
      .refine(
        (value) => !JWT_SECRET_PLACEHOLDERS.has(value.trim().toLowerCase()),
        'JWT_SECRET não pode usar placeholder conhecido',
      ),
    JWT_EXPIRES_IN: z.string().default('30m'),
    // Segredo separado para anonimização HMAC de PII em logs de webhook.
    WEBHOOK_HASH_SECRET: z
      .string()
      .min(32, 'WEBHOOK_HASH_SECRET deve ter no mínimo 32 caracteres')
      .refine(
        (value) =>
          !WEBHOOK_HASH_SECRET_PLACEHOLDERS.has(value.trim().toLowerCase()),
        'WEBHOOK_HASH_SECRET não pode usar placeholder conhecido',
      ),

    // EFI (aceita 'dev' como alias de sandbox — normalizado no EfiSdkClient)
    EFI_MODE: z.enum(['mock', 'dev', 'sandbox', 'prod']).default('mock'),
    EFI_CLIENT_ID: z.string().optional(), // obrigatório se EFI_MODE != mock
    EFI_CLIENT_SECRET: z.string().optional(),
    EFI_CERT_PATH: z.string().optional(),
    EFI_CERT_PASSPHRASE: z.string().optional(),
    // Certificados mTLS (.p12) por ambiente — usados pelo EfiSdkClient.
    EFI_CERT_HOMOLOG_PATH: z.string().optional(),
    EFI_CERT_PROD_PATH: z.string().optional(),
    // URL pública base do webhook (ex: https://api.iselftoken.com/payment/efi/webhook)
    EFI_WEBHOOK_URL: z.string().optional(),
    // Segredo validado como ?hmac= na query do callback EFI.
    EFI_WEBHOOK_HMAC_SECRET: z.string().min(32),

    // Infra (Redis, RabbitMQ, ports)
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    RABBITMQ_HOST: z.string().default('localhost'),
    RABBITMQ_PORT: z.coerce.number().int().positive().default(5672),
    // S35 — defaults alinhados com docker-compose.prod.yml
    // (RABBITMQ_DEFAULT_USER/PASS = admin/admin). Antes era 'changeme'
    // aqui, o que causava ACCESS_REFUSED no boot da API quando o
    // operador ainda não tinha setado RABBITMQ_PASS no `.env.prod`.
    RABBITMQ_USER: z.string().default('admin'),
    RABBITMQ_PASS: z.string().default('admin'),
  })
  .refine(
    (data) =>
      data.EFI_MODE === 'mock' ||
      (data.EFI_CLIENT_ID && data.EFI_CLIENT_SECRET),
    {
      message:
        'EFI_CLIENT_ID e EFI_CLIENT_SECRET obrigatórios quando EFI_MODE != mock',
    },
  );

export type Env = z.infer<typeof envSchema>;
