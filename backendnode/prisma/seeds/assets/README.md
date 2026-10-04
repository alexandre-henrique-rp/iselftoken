# Seed Assets

Esta pasta contém **todos os arquivos** (imagens, PDFs, etc.) que o seed
faz upload para o S3 e vincula às entidades do banco durante a execução
de `npm run seed` (e variantes `seed:assets`, `seed:opinions`, etc.).

```
prisma/seeds/assets/
├── startups/        ← logos, banners e documentos das startups seed
│   ├── agroseed/
│   │   ├── logo.jpg
│   │   ├── cover.jpg
│   │   └── pitch.pdf
│   └── ...
└── users/            ← avatars e documentos KYC dos usuários seed
    ├── admin/
    │   └── avatar.jpg      (a ser adicionado)
    ├── founder/
    │   └── avatar.jpg
    └── ...
```

## Estrutura `startups/<slug>/`

Cada startup tem uma pasta nomeada pelo seu **slug**. Os arquivos são
lidos por `seedImageFromStartup(slug, fileName)` em
`prisma/seeds/seed-image-helper.ts`.

| Arquivo | Campo vinculado | Obrigatório? |
|---------|----------------|---------------|
| `logo.jpg` | `Startup.logoId` | **sim** (seed falha sem) |
| `cover.jpg` | `Startup.coverId` | opcional |
| `pitch.pdf` | `StartupDocument` (tipo PITCH_DECK) | opcional |

Formatos suportados: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg` para
imagens; `.pdf` para documentos.

## Estrutura `users/<slug>/`

Cada usuário seed tem uma pasta nomeada pelo **slug** definido em
`prisma/seed.ts` → `USERS_SEED`. Os arquivos são lidos por
`seedImageFromUser(slug, fileName)` em
`prisma/seeds/seed-image-helper.ts`.

| Arquivo | Campo vinculado | Obrigatório? |
|---------|----------------|---------------|
| `avatar.jpg` | `User.avatar_id` | opcional |
| `comprovante.jpg` | `User.comprovante_id` | opcional |
| `documento.jpg` | `User.documento_id` (CPF/RG) | opcional |
| `biofacial.jpg` | `User.biofacial_id` (LGPD Art. 11 I) | opcional |

Slugs atualmente mapeados (`prisma/seed.ts:107`):

| Email | Slug |
|-------|------|
| `admin@iselftoken.com` | `admin` |
| `founder@iselftoken.com` | `founder` |
| `investidor1@email.com` | `investidor1` |
| `investidor-plus@iselftoken.com` | `investidor-plus` |
| `compliance@iselftoken.com` | `compliance` |
| `financeiro@iselftoken.com` | `financeiro` |
| `afiliado@iselftoken.com` | `afiliado` |

Autores de depoimentos em `prisma/seeds/seed-opinions.ts` também usam
a pasta `users/<slug>/avatar.{ext}` — o slug é gerado a partir do email
(`avatar-user-<prefixo-antes-de-@>`).

## Fluxo de upload simulado

Para cada asset encontrado, o seed executa 3 passos (logs visíveis
durante `npm run seed`):

```
📤 [upload] avatar: admin/avatar.{ext}
✅ [s3] avatar enviado — key=seed/users/admin/avatar.jpg
🔗 [db] KYCProfile #42 criado (status=APPROVED) — User.avatar_id=42
```

1. **Upload S3** (`PutObjectCommand` em `seed-image-helper.ts`)
2. **Persistência** (`KYCProfile` ou `StartupDocument` no Prisma)
3. **Vinculação** (`User.avatar_id` ou `Startup.logoId`)

## Modo dev tolerante

Se um asset **não existir** localmente, o seed emite `⏭️` e segue sem
erro. Para autores de depoimentos, há fallback para download via URL
externa (`seedImageFromUrl`). Em produção (`NODE_ENV=production`), a
ausência de asset é tratada como erro fatal.

## Adicionando novos arquivos

1. Coloque o arquivo na pasta apropriada com a extensão suportada
2. Execute `npm run seed` — o seed detecta e faz upload automaticamente
3. Verifique no console a sequência `[upload] → [s3] → [db]`
