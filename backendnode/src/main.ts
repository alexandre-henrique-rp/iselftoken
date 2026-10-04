import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import * as cookieParser from 'cookie-parser';
import { existsSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RealtimeService } from './realtime/realtime.service';
import { SocketIoAdapter } from './realtime/socket-io.adapter';
import './instrument';

const logger = new Logger('Bootstrap');

/**
 * HOTFIX: sincroniza generated/prisma -> node_modules/.prisma/client em
 * runtime se a sincronizacao nao tiver sido feita durante o build.
 *
 * Causa: postinstall hook em package.json checa `if (existsSync('generated/prisma'))`
 * antes de copiar, mas o hook roda durante `pnpm install` — ANTES de
 * `prisma generate` no Dockerfile. Resultado: node_modules/.prisma/client
 * fica vazio em producao.
 *
 * Workaround: rodar sync em runtime como fallback idempotente. Custo: ~50ms
 * na primeira inicializacao (depois cached pelo pnpm content-addressable).
 */
async function ensurePrismaClientSynced(): Promise<void> {
  const target = join(
    process.cwd(),
    'node_modules',
    '.prisma',
    'client',
    'default.js',
  );
  if (existsSync(target)) return;

  const source = join(process.cwd(), 'generated', 'prisma');
  if (!existsSync(source)) {
    logger.warn(
      `Prisma client nao encontrado em ${target} e generated/prisma tambem nao existe. ` +
        `Execute "pnpm run prisma:setup" antes de subir.`,
    );
    return;
  }

  try {
    const { rmSync, mkdirSync, cpSync } = await import('fs');
    mkdirSync(join(process.cwd(), 'node_modules', '.prisma'), {
      recursive: true,
    });
    cpSync(source, target.replace('default.js', ''), { recursive: true });
    logger.log('Prisma client sincronizado em runtime (fallback).');
  } catch (err) {
    logger.warn(
      `Falha ao sincronizar Prisma client em runtime: ${err instanceof Error ? err.message : String(err)}. ` +
        `Pode falhar com MODULE_NOT_FOUND.`,
    );
  }
}

async function ensureBuildArtifacts(): Promise<void> {
  const main = join(process.cwd(), 'dist', 'src', 'main.js');
  if (!existsSync(main)) {
    throw new Error(
      `Build artifacts ausentes em ${main}. Rode "pnpm run build" antes de iniciar.`,
    );
  }
}

async function bootstrap() {
  // Garante que o build está sincronizado antes de instanciar o Nest.
  // Evita stacktraces confusos de MODULE_NOT_FOUND quando o `nest start
  // --watch` apaga o dist durante um rebuild concorrente.
  await ensureBuildArtifacts();
  // HOTFIX MODULE_NOT_FOUND (deploy 2026-09-09): se node_modules/.prisma/client
  // nao foi sincronizado pelo build (postinstall hook rodou antes de
  // `prisma generate`), roda o sync em runtime como fallback. Idempotente.
  await ensurePrismaClientSynced();
  // rawBody=true: guarda o buffer original da request antes do JSON parse.
  // Necessario para validar HMAC SHA-256 dos webhooks do C6 Bank (PRD Hub v2).
  // Sem isso, qualquer whitespace ou reordering feito pelo bodyParser quebra
  // a verificacao da assinatura criptografica.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // servir os PNGs dos selos em /icons/<slug>.png
  app.useStaticAssets(join(process.cwd(), 'icons'), { prefix: '/icons/' });

  // servir assets estáticos da seed (logos/covers/PDFs de startups) em /files/...
  // Usa prefix /files (não /uploads) para não conflitar com UploadsController @Controller('uploads').
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/files/' });

  // NOTA: logos/covers/PDFs vindos do seed são carregados DIRETAMENTE do S3/CDN
  // pelo browser — sem proxy pelo backend. Isso evita custo de bandwidth e
  // hop desnecessário. A configuração de CORS fica no bucket S3 (não no backend).
  // Ver `frontend/.env.example` `S3_PUBLIC_BASE_URL` e `backend/.env.example`
  // `S3_CORS_ORIGINS` para detalhes.

  // configurar cookie parser para ler cookies das requisições
  app.use(cookieParser());

  const trustProxy = process.env.TRUST_PROXY?.trim();
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !trustProxy) {
    throw new Error(
      'TRUST_PROXY deve ser configurado explicitamente em produção',
    );
  }
  if (trustProxy) {
    const trustProxyList = trustProxy
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      !trustProxyList.length ||
      trustProxyList.some((value) => !/^[a-zA-Z0-9:.\/\-]+$/.test(value))
    ) {
      throw new Error(
        'TRUST_PROXY contém valor inválido; use uma allowlist de IPs/CIDRs',
      );
    }
    app.set('trust proxy', trustProxyList);
  } else {
    // Desenvolvimento/teste: apenas loopback é confiável.
    app.set('trust proxy', 'loopback');
  }

  // Sentry: flush de eventos antes de shutdown
  app.enableShutdownHooks();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          // Permite carregar imagens diretamente do S3 / CloudFront / CDN.
          // Sem `https://*.amazonaws.com` no CSP, mesmo URLs válidas são bloqueadas
          // pelo browser. Wildcard cobre tanto o padrão novo (`<bucket>.s3.<region>.amazonaws.com`)
          // quanto URLs via CloudFront (`<id>.cloudfront.net`).
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://cdn.jsdelivr.net',
            'https://*.amazonaws.com',
            'https://*.cloudfront.net',
          ],
          connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          frameSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // configurar CORS liberado (*)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  // configurar o validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // configurar interceptor e exception filter globais para padronizar respostas
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Pluga o adapter socket.io com Redis adapter para multi-instância.
  // Resolve RealtimeService/ConfigService do container (RealtimeModule é @Global).
  const realtimeService = app.get(RealtimeService);
  const configService = app.get(ConfigService);
  app.useWebSocketAdapter(
    new SocketIoAdapter(app, configService, realtimeService),
  );
  logger.log('Socket.IO adapter plugado (namespace /notifications)');

  // configurar o swagger
  const config = new DocumentBuilder()
    .setTitle('API iSelfToken')
    .setDescription(
      `# API de Autenticação e Gestão iSelfToken

## Autenticação via Cookie (Server-Side Session)

Esta API utiliza autenticação baseada em **cookie HTTP-only** com sessão armazenada no **Redis**.

### Como Funciona

1. **Login**: Faça login via \`POST /auth\` com email e senha
2. **Cookie**: O servidor retorna um cookie \`session_id\` (HTTP-only, SameSite: Strict)
3. **Automação**: O navegador envia o cookie automaticamente em todas as requisições
4. **Logout**: Use \`POST /auth/logout\` para invalidar a sessão

### Como Testar no Swagger


**Opção 1 (Recomendado)**: Faça login primeiro
1. Execute \`POST /auth\` com suas credenciais
2. O cookie será setado automaticamente pelo navegador
3. Endpoints protegidos usarão o cookie automaticamente
\`\`\`
┌─────────────────────────────────────────────────────────────┐
│  1. POST /auth                                              │
│     Body: { "email": "user@example.com", "senha": "123" }   │
│     Response: Set-Cookie: session_id=abc123...              │
├─────────────────────────────────────────────────────────────┤
│  2. GET /auth/me (ou qualquer rota protegida)               │
│     Cookie: session_id=abc123... (enviado automaticamente)  │
│     Response: { id, email, nome, role, ... }                │
├─────────────────────────────────────────────────────────────┤
│  3. POST /auth/logout                                       │
│     Cookie: session_id=abc123...                            │
│     Response: Set-Cookie: session_id=; Max-Age=0            │
└─────────────────────────────────────────────────────────────┘
\`\`\`

**Opção 2**: Use o botão "Authorize" (🔒)
1. Clique no botão "Authorize" no topo do Swagger
2. Insira o valor do \`session_id\` (ex: \`550e8400-e29b-41d4-a716-446655440000\`)
3. Clique em "Authorize"
4. Agora os endpoints protegidos enviarão o cookie automaticamente

### Endpoints Públicos (Sem Autenticação)

- \`POST /auth\` - Login

- \`POST /auth/register/user\` - Registro

- \`POST /auth/forgot-password\` - Recuperação de senha

- \`POST /auth/change-password/:id\` - Alterar senha

- \`POST /auth/newcode\` - Novo código de verificação

### Endpoints Protegidos (Requer Cookie session_id)

- \`GET /auth/me\` - Dados do usuário logado
- \`POST /auth/logout\` - Logout

### Características de Segurança

- **HTTP-only**: Cookie não acessível via JavaScript (proteção XSS)
- **SameSite: Strict**: Proteção contra CSRF
- **Secure**: Apenas HTTPS em produção
- **TTL**: 7 dias (sessão expira automaticamente)
`,
    )
    .setVersion('1.0')
    .addCookieAuth('session_id')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Scalar UI (humano) em /docs
  app.use(
    '/docs',
    apiReference({
      content: document,
      theme: {
        hideLogo: false,
        hideDarkModeToggle: false,
      },
    }),
  );

  // OpenAPI JSON (IA/codegen) em /docs-json e /openapi.json
  const serveOpenApi = (_req: unknown, res: { json: (b: unknown) => void }) =>
    res.json(document);
  app.getHttpAdapter().get('/docs-json', serveOpenApi);
  app.getHttpAdapter().get('/openapi.json', serveOpenApi);

  // configurar o listen
  await app.listen(process.env.PORT ?? 3000).then(() => {
    const port = process.env.PORT;
    logger.log(`Server running on port http://localhost:${port}`);
    logger.log(`Swagger UI:    http://localhost:${port}/docs`);
    logger.log(`OpenAPI JSON:  http://localhost:${port}/docs-json`);
  });
}
bootstrap();
