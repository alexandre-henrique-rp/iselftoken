# PRD 4 — Customização do Banner da Home

**Data:** 15/08/2026  
**Última revisão:** 2026-08-15 (versão inicial)  
**Autor:** Agente IA  
**Status:** Rascunho  
**Prioridade:** Alta  
**Módulo:** Frontend + Backend — Admin / Compliance / Marketplace

---

## Histórico de Revisões

| Data | Mudança |
|------|---------|
| 2026-08-15 | Versão inicial: substituí `MarketplaceBanner` hardcoded da rota `/home` por painel de customização Admin/Compliance. CRUD completo com botões posicionáveis livremente sobre a imagem do banner. Imagens gerenciadas via módulo `uploads/*` existente. |
| 2026-08-15 | (revisão) Escopo confirmado: cobre **EXCLUSIVAMENTE** o banner de `/home`. Landing pública `/` (com hero próprio) **NÃO** está incluida — fica fora deste PRD. Removido `BNR-02` do §10. |
| 2026-08-15 | (revisão) Distinção crítica: este PRD cobre o banner **institucional da PLATAFORMA** (visível em `/home` para todos os usuários logados). **NÃO** tem relação alguma com banners/cover/capa dos perfis individuais das startups (esses são `Startup.cover_id` + `Startup.logo_id` no schema, gerenciados em outro fluxo). Adicionado nota de isolamento no §1 e §3. |

---

## 1. Contexto

Hoje o `MarketplaceBanner` (renderizado **exclusivamente na rota `/home`** via `frontend/app/routes/private/marketing.tsx:135`) tem 3 slides **hardcoded** em `frontend/app/routes/api/marketplace-banner.ts` com URLs do Unsplash. Não há persistência, não há painel administrativo, qualquer mudança exige editar código e fazer deploy.

**Atenção #1 (escopo de ROTA):** Este PRD cobre **APENAS o banner da home `/home`**. A landing pública `/` tem hero/banner próprio e **NÃO** está no escopo (ver §10).

**Atenção #2 (escopo de ENTIDADE — confirmação 2026-08-15):** Este banner é **exclusivo do gerenciamento da PLATAFORMA** (visível para todos os usuários logados ao entrar em `/home`). **NÃO** tem NADA a ver com:
- Banners/cover/capa dos perfis individuais das startups (`Startup.cover_id` + `Startup.logo_id` no schema, gerenciados em outro fluxo)
- Avatares dos usuários
- Capas dos cards de empresa no marketplace (cards de `FeaturedStartups`, etc)
- Qualquer coisa vinculada a `Startup.*`

Tudo aqui é **shell da plataforma iSelfToken**, não personalização de startups. Se você está procurando customizar a vitrine de uma startup específica, este não é o PRD certo — abra uma discussão de feature separada.

**Necessidade:** Permitir que perfis `ADMIN` e `COMPLIANCE` gerenciem banners diretamente pela plataforma, com:
- Upload de imagens institucionais (1 imagem por slide)
- CRUD completo (criar, editar, deletar, reordenar, ativar/desativar)
- **Botões personalizados posicionáveis** sobre a imagem (drag-and-drop, percentual X/Y relativo à imagem)
- Preview ao vivo durante edição
- Distribuição imediata sem deploy

---

## 2. Estado Atual vs Proposto

### 2.1 Estado atual (hardcoded)

```
frontend/app/routes/api/marketplace-banner.ts (3 slides estáticos)
   ↓ JSON exportado
frontend/app/routes/private/marketing.tsx (loader getBannerSlides)
   ↓
frontend/app/components/marketplace/marketplace-banner.tsx (consome prop slides)
```

**Limitação:** zero controle operacional. Trocar imagem ou texto exige patch + PR + CI/CD.

### 2.2 Estado proposto (persistente + UI)

```
┌─────────────────────────────────────────────────────────────┐
│ Admin/Compliance acessa `/admin/banners`                    │
│   ↓                                                          │
│ Lista de Banners (cards com preview + ativar/desativar)    │
│   ↓                                                          │
│ Criar/Editar (Editor Visual)                                │
│  ├── Upload imagem (módulo uploads/*)                       │
│  ├── Texto: badge, title, highlight, description             │
│  ├── Editor de Botões (drag-and-drop sobre preview)          │
│  │   ├── até 3 botões por banner                              │
│  │   ├── cada: label, URL (interno/externo), variant, position│
│  ├── Ordem (priority 0..N, exibidos em ordem crescente)      │
│  └── Ativo/Inativo (toggle)                                  │
│   ↓                                                          │
│ Backend persiste em `Banner` + `BannerButton`                │
│   ↓                                                          │
│ BFF `marketplace-banner.ts` consulta backend (cache 5min)   │
│   ↓                                                          │
│ `MarketplaceBanner` renderiza com botões posicionados        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Acesso e Autorização

### 3.1 Roles autorizadas

> **Importante:** Estas roles são da **PLATAFORMA** (admin do iSelfToken) — não confundir com roles de FOUNDER ou INVESTOR que editam suas próprias startups. Aqui só ADMIN e COMPLIANCE gerenciam o banner institucional.

| Role | Ler (público) | Editar/CRUD |
|------|--------------|-------------|
| `USER` (sem role especial) | ✅ | ❌ (403) |
| `FOUNDER` | ✅ | ❌ |
| `INVESTOR` | ✅ | ❌ |
| `FINANCEIRO` | ✅ | ❌ (não-edita banner — fora do escopo financeiro) |
| `COMPLIANCE` | ✅ | ✅ |
| `ADMIN` | ✅ | ✅ |

**Padrão de roles já estabelecido** em `backendnode/src/auth/admin.guard.ts:18`:
```ts
const ADMIN_ROLES = ['ADMIN', 'FINANCEIRO', 'COMPLIANCE'];
```

Este PRD introduz `ComplianceOrAdminGuard` que aceita **apenas** ADMIN + COMPLIANCE (FINANCEIRO fica fora intencionalmente). Cria novo guard (não reaproveita `AdminGuard`).

### 3.2 Rotas frontend

| Path | Role gating | Função |
|------|-------------|--------|
| `/admin/banners` | ComplianceOrAdminGuard | Lista de banners |
| `/admin/banners/new` | ComplianceOrAdminGuard | Criar novo banner |
| `/admin/banners/:id/edit` | ComplianceOrAdminGuard | Editar banner existente |
| `/admin/banners/:id/preview` | ComplianceOrAdminGuard | Preview em tela cheia |

**Sidebar:** adicionar item "Banners" no menu Admin E Compliance (atualmente não existe):
- `frontend/app/components/layout/sidebar.tsx` — adicionar rota condicional (mostrar apenas se `user.role === 'ADMIN' || 'COMPLIANCE'`)
- Ícone sugerido: `ImageIcon` ou `SlidersHorizontal`

### 3.3 BFFs

| Rota | Função |
|------|--------|
| `GET /api/admin/banners` | Lista com preview (autenticado, role-checked) |
| `POST /api/admin/banners` | Criar banner (multipart, com imagem) |
| `GET /api/admin/banners/:id` | Detalhe |
| `PATCH /api/admin/banners/:id` | Editar (suporta `?fields=` para upload parcial) |
| `DELETE /api/admin/banners/:id` | Soft delete |
| `POST /api/admin/banners/reorder` | Body: `[{ id, priority }]` — atualiza ordem |
| `POST /api/admin/banners/:id/toggle` | Body: `{ active: boolean }` — ativar/desativar |
| `GET /api/marketplace-banner` | **Público** — lista ativa com cache 5min (substitui o hardcoded) |

---

## 4. Modelo de Dados

### 4.1 Novos models Prisma

```prisma
model Banner {
  id          String   @id @default(uuid())
  slug        String   @unique              // ex: "websummit-2026", "neurallink-serie-a"

  // === Conteúdo textual ===
  badge        String?  @db.VarChar(40)     // ex: "Evento Próximo"
  title        String   @db.VarChar(80)     // ex: "Web Summit 2026:"
  highlight    String?  @db.VarChar(80)     // ex: "Liste sua startup agora"
  description  String   @db.Text            // corpo do slide

  // === Imagem ===
  /// Imagem de fundo do banner (1200x600 recomendado)
  imageId      Int?     // FK Upload
  image        Upload?  @relation("BannerImage", fields: [imageId], references: [id])

  // === Layout/Visual ===
  /// Posição (em %) do conteúdo textual sobre a imagem (0-100, default: esquerda)
  textAlignment String  @default("left")    // 'left' | 'center' | 'right'
  /// Cor de fundo caso `image` for nulo (hex)
  fallbackColor String? @db.VarChar(7)     // "#1a1a1a"

  // === Controle operacional ===
  active       Boolean  @default(true)
  priority     Int      @default(0)        // ordem de exibição (ASC)
  startsAt     DateTime?                    // schedule de início (opcional)
  endsAt       DateTime?                    // schedule de fim (opcional)

  // === Auditoria (obrigatório) ===
  createdByUserId Int   // quem criou
  createdBy       User  @relation("BannerCreator", fields: [createdByUserId], references: [id])
  updatedByUserId Int?  // última edição
  updatedBy       User? @relation("BannerUpdater", fields: [updatedByUserId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?                    // soft delete

  buttons      BannerButton[]

  @@index([active, priority])
  @@index([startsAt, endsAt])
  @@index([deletedAt])
}

model BannerButton {
  id        String   @id @default(uuid())
  bannerId  String
  banner    Banner   @relation(fields: [bannerId], references: [id], onDelete: Cascade)

  // === Conteúdo ===
  label     String   @db.VarChar(40)      // texto exibido
  /// Tipo de link: 'internal' (rota do app) ou 'external' (URL absoluta)
  linkType  String   @default("internal")  // 'internal' | 'external'
  /// Alvo: rota interna (ex: /home) OU URL externa (ex: https://...)
  href      String   @db.VarChar(500)

  /// Janela de abertura: 'self' (mesma aba) OU 'blank' (nova aba — default para external)
  target    String   @default("self")      // 'self' | 'blank'

  /// Visual: 'primary' (sólido) | 'secondary' (outline) | 'ghost' (transparente)
  variant   String   @default("primary")   // 'primary' | 'secondary' | 'ghost'

  // === Posicionamento (em % relativo à imagem) ===
  /// Coordenada X (0-100, esquerda para direita). Default: 50 (centro horizontal)
  positionX Float    @default(50)
  /// Coordenada Y (0-100, cima para baixo). Default: 70 (parte inferior)
  positionY Float    @default(70)

  // === Ordem (1..3, mas pode ter mais) ===
  /// Ordem de empilhamento Z-index (botões com maior zIndex ficam na frente se overlap)
  zIndex    Int      @default(1)

  active    Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([bannerId, active])
}
```

**Migration:** `add_banner_customization` adiciona:
- 2 models (Banner, BannerButton)
- 2 relations inverse no `User` (BannerCreator, BannerUpdater)
- 1 relation inverse no `Upload` (BannerImage)

### 4.2 Schema reverso em `User`

```prisma
model User {
  // ... campos existentes ...
  bannersCreated Banner[]      @relation("BannerCreator")
  bannersUpdated Banner[]      @relation("BannerUpdater")
  // ...
}

model Upload {
  // ... campos existentes ...
  bannerImage  Banner? @relation("BannerImage")
  // ...
}
```

---

## 5. API Endpoints (Backend)

### 5.1 Endpoints CRUD (`ComplianceOrAdminGuard` em todos exceto o público)

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| `GET` | `/admin/banners` | `?active=true&page=1&limit=20&q=...` | `{ banners: Banner[], total, page, limit }` | Lista completa (incluindo inativos) |
| `GET` | `/admin/banners/:id` | — | `Banner & { buttons }` | Detalhe com botões aninhados |
| `POST` | `/admin/banners` | `multipart`: `image` + JSON `{ slug, badge, title, highlight, description, textAlignment, fallbackColor, priority, buttons: [...] }` | `201 Banner` | Cria + 1ª imagem via UploadService |
| `PATCH` | `/admin/banners/:id` | `multipart` (com `image` opcional) OU JSON | `200 Banner` | Edita. Se nova imagem enviada, soft-deleta a anterior |
| `DELETE` | `/admin/banners/:id` | — | `204` | Soft delete (`deletedAt = now()`) |
| `POST` | `/admin/banners/reorder` | `{ items: [{ id, priority }] }` | `200 { updated: number }` | Atualiza em **transação** Prisma |
| `POST` | `/admin/banners/:id/toggle` | `{ active: boolean }` | `200 Banner` | Ativa/desativa |
| `POST` | `/admin/banners/:id/buttons` | `{ label, href, linkType, target, variant, positionX, positionY, zIndex }` | `201 BannerButton` | Adiciona botão a banner existente |
| `PATCH` | `/admin/banners/:id/buttons/:buttonId` | parcial do mesmo body | `200 BannerButton` | Edita botão |
| `DELETE` | `/admin/banners/:id/buttons/:buttonId` | — | `204` | Remove botão |

### 5.2 Endpoint público

| Method | Path | Auth | Response | Notes |
|--------|------|------|----------|-------|
| `GET` | `/marketplace/banners` | pública | `{ data: BannerWithButtons[] }` | Apenas `active=true && deletedAt=null` E dentro de `startsAt..endsAt`. Cache Redis 5min |

**Substitui** o BFF hardcoded `frontend/app/routes/api/marketplace-banner.ts` por este endpoint.

### 5.3 Validação Zod (DTO)

```typescript
class CreateBannerDto {
  @IsString() @IsNotEmpty() @MaxLength(60) @Matches(/^[a-z0-9-]+$/) slug: string;
  @IsOptional() @IsString() @MaxLength(40) badge?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) title: string;
  @IsOptional() @IsString() @MaxLength(80) highlight?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) description: string;
  @IsOptional() @IsEnum(['left','center','right']) textAlignment?: string;
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) fallbackColor?: string;
  @IsInt() @Min(0) @Max(99) priority: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => BannerButtonDto) buttons: BannerButtonDto[];
}

class BannerButtonDto {
  @IsString() @MaxLength(40) label: string;
  @IsEnum(['internal','external']) linkType: 'internal' | 'external';
  @IsString() @MaxLength(500) href: string;
  @IsOptional() @IsEnum(['self','blank']) target?: 'self' | 'blank';
  @IsOptional() @IsEnum(['primary','secondary','ghost']) variant?: ...;
  @IsNumber() @Min(0) @Max(100) positionX: number;
  @IsNumber() @Min(0) @Max(100) positionY: number;
  @IsOptional() @IsInt() @Min(1) @Max(999) zIndex?: number;
}
```

**Validação cross-field:** `startsAt <= endsAt` (se ambos fornecidos); `linkType='internal'` exige `href` começando com `/`; `linkType='external'` exige `href` começando com `http`.

---

## 6. UI de Customização

### 6.1 Lista de Banners (`/admin/banners`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ADMIN · BANNERS DA HOME                              [+ Novo Banner]    │
├─────────────────────────────────────────────────────────────────────────┤
│  (Filtros: [Todos ▾] [Ativos] [Inativos] Busca: [_______________] )    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ [Imagem] Web Summit 2026                                          │  │
│  │          Badge: "Evento Próximo"                                  │  │
│  │          Title: "Web Summit 2026: Liste sua startup agora"        │  │
│  │          Priority: 1  ●  Ativo  · 3 botões  · Criado 10/08       │  │
│  │                                              [Editar] [Excluir]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ [Imagem] EcoFlow Systems                                          │  │
│  │          Badge: "Destaque"                                        │  │
│  │          Priority: 2  ●  Ativo  · 2 botões                       │  │
│  │                                              [Editar] [Excluir]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Editor de Banner (`/admin/banners/new` ou `:id/edit`)

#### 6.2.1 Estrutura geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EDITOR DE BANNER                                       [Salvar] [Cancelar]│
├──────────────────────────────────────┬──────────────────────────────────┤
│                                      │                                  │
│  [Imagem atual — 1200x600 preview]   │  CONFIGURAÇÃO                    │
│  [Upload nova imagem]                 │   Slug* [websummit-2026___]      │
│  [Texto sobreposto por cima]          │   Badge  [Evento Próximo_____]   │
│  ● Badge: "Evento Próximo"           │   Title* [Web Summit 2026:____] │
│    Title: "Web Summit 2026:"          │   Highlight [Liste sua...]       │
│    Description...                    │   Description* [...]             │
│  [BOTÃO 1 - primary]    [BOTÃO 2 -   │   Alinhamento ( ) Esquerda       │
│   secondary]            ghost]        │                   ( ) Centro    │
│                                      │                   (●) Direita    │
│  [Selecionar/Deletar/Reordenar        │   Cor de fallback [#1a1a1a___]   │
│   botões]                            │                                  │
│                                      │  AGENDAMENTO (opcional)          │
│  Arrastar para mover.                 │   Início [15/08/2026 14:00]      │
│  Duplo-clique para editar.            │   Fim    [20/08/2026 23:59]      │
│                                      │                                  │
│  Preview responsivo:                 │  CONTROLE                         │
│  [Desktop 1200px]  [Mobile 380px]    │   (●) Ativo                       │
│                                      │   ( ) Inativo                     │
│                                      │   Priority [_____]                │
│                                      │                                  │
│                                      │  AUDITORIA (read-only)            │
│                                      │   Criado por Admin X em 10/08    │
│                                      │   Última edição: 12/08 por Y      │
└──────────────────────────────────────┴──────────────────────────────────┘
```

#### 6.2.2 Editor Visual de Botões (drag-and-drop)

```
┌── Preview Canvas (Image 1200x600) ──────────────────────┐
│                                                       │
│   ┌─────────────────────┐                             │
│   │ Badge: Evento...    │                             │
│   │ Title: Web Summit...│                             │
│   │ Description...      │                             │
│   └─────────────────────┘                             │
│                                                       │
│              ┌──────────────┐                         │
│              │ Investir Agora│ ◀── arrastável (X=70%,Y=70%)│
│              └──────────────┘                         │
│                                                       │
│         ┌──────────────┐                             │
│         │ Ver Detalhes  │ ◀── arrastável (X=40%,Y=70%)│
│         └──────────────┘                             │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Comportamento:**
- Cada botão é um componente `<button>` preview renderizado sobre a imagem no canvas
- **Drag-and-drop:** mouse down + arrastar → atualiza `positionX`, `positionY` em tempo real (debounce 100ms para salvar)
- **Duplo-clique:** abre prompt inline para editar label/href/variant
- **Click no botão ✕:** remove o botão (com confirmação)
- **Adicionar novo:** botão flutuante "+ Adicionar botão (X/3)" — máximo 3 botões por banner (UX guideline)
- **Coords em %:** posição é salva como número 0..100 (não pixel) → responsivo automaticamente em mobile/desktop
- **Z-index:** setinhas para subir/descer entre botões sobrepostos

#### 6.2.3 Detalhes do modal de edição de botão

```
┌─────────────────────────────────────────────┐
│  EDITAR BOTÃO                          [X]  │
├─────────────────────────────────────────────┤
│  Label*  [Investir Agora__________]         │
│                                              │
│  Tipo de link:                               │
│  (●) Interno: [/startups/123_____________]  │
│  ( ) Externo: [https://_______________]      │
│                                              │
│  Janela:                                     │
│  ( ) Mesma aba                               │
│  (●) Nova aba                                │
│                                              │
│  Visual:                                     │
│  [Primário] [Secundário] [Transparente]      │
│                                              │
│  Posição:                                    │
│  X [70]%   Y [70]%                           │
│                                              │
│  Z-index:                                    │
│  [▲] [▼]   (atual: 1)                       │
│                                              │
│                              [Cancelar] [Salvar]│
└─────────────────────────────────────────────┘
```

### 6.3 Preview em Tela Cheia (`/admin/banners/:id/preview`)

Útil para QA antes de publicar. Renderiza banner em viewport 1200x600 + viewport mobile 380x600, lado a lado. Mostra também resultado final com botões posicionados.

---

## 7. Comportamento de Exibição (Home `/home`)

### 7.1 Mudança no `marketing.tsx`

```diff
- import { getBannerSlides } ...                                       // REMOVER
- const bannerSlides = await getBannerSlides(request);                 // REMOVER
+ import { fetchMarketplaceBanners } from "~/lib/marketplace-banners"; // NOVO

+ const bannerSlides = await fetchMarketplaceBanners({ request });     // NOVO
+ // → GET /api/marketplace/banners (BFF público)
```

### 7.2 Mudança no `marketplace-banner.tsx`

O componente existente (`frontend/app/components/marketplace/marketplace-banner.tsx`) deve ser ESTENDIDO para renderizar botões posicionados sobre a imagem. Substituir o slider atual por uma versão que suporta ambos os modos:

```diff
- interface BannerSlide { badge; title; highlight; description; image;
-                          primaryLabel; secondaryLabel; }
+ interface BannerSlide extends BaseBannerSlide {
+   buttons?: BannerButton[];  // opcional, retro-compatível
+ }
+
+ function BannerSlide({ slide, isAuthoringPreview }: {
+   slide: BannerSlide;
+   isAuthoringPreview?: boolean;
+ }) {
+   return (
+     <div className="relative aspect-[2/1] ...">
+       <img src={slide.image} alt={slide.title} className="..." />
+       {/* Texto sobreposto com textAlignment */}
+       <div className={`absolute inset-0 flex items-${slide.textAlignment ?? 'left'}`}>
+         <div className="p-8 max-w-md">{...slide.badge, slide.title, ...}</div>
+       </div>
+       {/* Botões posicionados */}
+       {slide.buttons?.map(btn => (
+         <button
+           key={btn.id}
+           style={{ left: `${btn.positionX}%`, top: `${btn.positionY}%`, zIndex: btn.zIndex }}
+           className={`absolute -translate-x-1/2 -translate-y-1/2
+                       px-4 py-2 rounded-lg font-bold
+                       ${VARIANT_CLASSES[btn.variant]}`}
+           ...
+         >
+           {btn.label}
+         </button>
+       ))}
+       {isAuthoringPreview && <BannerButtonEditorLayer {...} />}
+     </div>
+   );
+ }
```

**Retro-compatibilidade:** slides antigos (sem `buttons`) renderizam apenas o slider padrão. Novos slides (com `buttons`) renderizam slider + botões sobrepostos.

### 7.3 Agendamento (schedule)

- `startsAt` e `endsAt` são opcionais
- Antes do `startsAt`: banner NÃO aparece mesmo se `active=true`
- Após `endsAt`: banner NÃO aparece
- Backend filtra: `WHERE active=true AND deletedAt IS NULL AND (startsAt IS NULL OR startsAt <= NOW()) AND (endsAt IS NULL OR endsAt >= NOW())`

---

## 8. Validações

### 8.1 Backend (Zod)
- Slug único (`@unique` no DB) — retorna 409 se duplicado
- Imagem obrigatória no POST (multipart, valida MIME `image/png`, `image/jpeg`, `image/webp`)
- Tamanho máximo de imagem: 5 MB (config `MAX_BANNER_IMAGE_SIZE`)
- Posição X,Y: 0..100 (validado no DTO)
- `startsAt <= endsAt` se ambos
- Slug só aceita `[a-z0-9-]+`

### 8.2 Frontend
- Image preview mostra antes de salvar (FileReader.readAsDataURL)
- Drag-and-drop em mobile é touch-based (`pointermove` + threshold > 5px para considerar drag)
- Confirmar antes de deletar: "Excluir este banner? Esta ação não pode ser desfeita." (botão Destacar vermelho)
- Confirmar antes de reorder: apenas se houver > 1 banner
- Erro 409 (slug duplicado): destacar campo e mostrar mensagem inline

### 8.3 LGPD (zero PII)
- Banner é institucional — NENHUM campo captura nome/email/cpf/telefone de pessoa
- `image` é conteúdo, não PII
- `href` pode ser URL externa — sanitizar para evitar javascript: URLs (regex `^(/|https://)`)
- **AuditLog:** `BANNER_CREATED | BANNER_UPDATED | BANNER_DELETED | BANNER_REORDERED | BANNER_TOGGLED | BANNER_BUTTON_CREATED | BANNER_BUTTON_UPDATED | BANNER_BUTTON_DELETED` — todos com `userId` (FK opaca) + `entity: 'Banner' | 'BannerButton'` + `entityId` + `ip`
- Sem screenshots de teste que vazem dados
- Checklist: `docs/legal/banner-LGPD-checklist.md` (NOVO)

---

## 9. Critérios de Aceite

- [ ] **AC-01:** `/admin/banners` lista todos os banners com filtros e busca
- [ ] **AC-02:** Apenas usuários com role ADMIN ou COMPLIANCE acessam `/admin/banners/**` (FINANCEIRO recebe 403)
- [ ] **AC-03:** POST cria banner com imagem (upload via módulo uploads/*) + 0..3 botões
- [ ] **AC-04:** PATCH atualiza banner (slug imutável; imagem opcional)
- [ ] **AC-05:** DELETE soft delete (banner some da listagem pública mas histórico preservado para audit)
- [ ] **AC-06:** Drag-and-drop dos botões atualiza `positionX/Y` em tempo real, salva ao soltar
- [ ] **AC-07:** 9 posições pré-definidas exibidas como grid 3x3 visual (somente guia; valores livres aceitos)
- [ ] **AC-08:** Preview em `/admin/banners/:id/preview` mostra banner em viewport Desktop (1200px) + Mobile (380px) lado a lado
- [ ] **AC-09:** Reordenar banners (`POST /admin/banners/reorder`) atualiza `priority` em uma única transação
- [ ] **AC-10:** Ativar/inativar (`POST /admin/banners/:id/toggle`) oculta banner da home imediatamente (após cache invalidar)
- [ ] **AC-11:** Cache Redis 5min para `/marketplace/banners` (público) — invalidação explícita em POST/PATCH/DELETE
- [ ] **AC-12:** Banner com `startsAt` futuro NÃO aparece até a data; banner com `endsAt` passado desaparece
- [ ] **AC-13:** `marketing.tsx` carrega banners via BFF dinâmico (substitui hardcoded)
- [ ] **AC-14:** Botões com `linkType='external' + target='blank'` abrem nova aba com `rel='noopener noreferrer'`
- [ ] **AC-15:** Auditoria: 9 actions em AuditLog para Compliance/Admin; LGPD checklist criado (zero PII)
- [ ] **AC-16:** Sidebar mostra item "Banners" apenas para roles ADMIN e COMPLIANCE (esconde de FINANCEIRO/USER/FOUNDER/INVESTOR)
- [ ] **AC-17:** Slug único validado no backend; mensagem de erro 409 exibida inline
- [ ] **AC-18:** Imagem obrigatória no POST; tipos MIME restritos (png, jpeg, webp); tamanho max 5 MB

---

## 10. Fora de Escopo

- **Banner da landing pública `/`:** PRD 4 cobre **EXCLUSIVAMENTE** o banner da home `/home`. A landing pública `/` tem hero/banner próprio com implementação separada e **NÃO** é gerenciado por esta tela. Backlog separado (se necessário no futuro): usar `BNR-02` para reusar mesma API.
- **Banners por usuário/sessão (segmentação):** exibição igual para todos
- **A/B testing de banners:** não há suporte para variantes; todos veem a mesma ordem
- **Estatísticas de click-through:** clicks dos botões não são trackeados (pode ser PRD separado)
- **Agendamento recorrente (cron-like):** banners recorrentes (ex: todo dia 14h); só tem `startsAt`/`endsAt` pontuais
- **Múltiplas imagens por banner (carrossel interno):** 1 imagem por slide
- **Editor visual drag WYSIWYG da imagem:** crop/resize manual; é esperado upload já em proporção 2:1
- **Cache com TTL variável por horário:** fixo em 5min

---

## 11. Dependências

| Dependência | Status | Notas |
|-------------|--------|-------|
| `ComplianceOrAdminGuard` (novo) | **FALTA** | Reaproveita padrão de `compliance.guard.ts:18` (lista de roles), com verificação `req.user.role in ['ADMIN', 'COMPLIANCE']` |
| `BannerSlide` type frontend | **PARCIAL** (precisa extensão com `buttons` opcional) | Mantém retro-compatibilidade |
| `marketplace-banner.ts` BFF público | **HARDCODED** (vai ser substituído) | Reescrito para proxy ao backend |
| `marketing.tsx` loader | **JÁ EXISTE** (`getBannerSlides(request)`) | Modifica para chamar `/marketplace/banners` |
| Módulo `uploads/*` | ✅ existe | Usa `UploadService.create()` + presigned URL |
| `Redis` (cache) | ✅ infra rodando | TTL 5min para `/marketplace/banners` |
| `AuditLog` model + service | ✅ existe | Adicionar 8 actions no service |
| `AuditLog admin.guard.ts` patterns | ✅ existe | Reaproveitar padrão |
| LGPD checklist | **FALTA** (criar `banner-LGPD-checklist.md`) | Espelho de `repasse-LGPD-checklist.md` (FIN-12) |
| Drag-and-drop lib | **FALTA** | Opções: `react-draggable`, `dnd-kit`, custom (3-5KB). Sugestão: `dnd-kit` (mantida) |
| Slug validation regex | simples | Use validator próprio |
| Cookies HTTP-only de auth | ✅ existe | BFFs usam padrão existente |
| shadcn/ui (Slider, Dialog, Select) | ✅ existe | Reaproveitar |
| `AdminGuard` patterns | ✅ existe | Reaproveitar `.guard.ts` pattern |

---

## 12. Impacto Técnico

### 12.1 Backend (NestJS) — Sprint `BNR-01`

| Arquivo/Alteração | Detalhe |
|--------------------|---------|
| Schema Prisma | 2 models novos (`Banner`, `BannerButton`) + relations inverse |
| Migration | `add_banner_customization` |
| Módulo novo | `backendnode/src/api/banners/{banners.module,banners.controller,banners.service,banners.service.spec}.ts` |
| DTOs | `dto/{create-banner,update-banner,banner-button,reorder-banners,toggle-banner}.dto.ts` |
| Guard novo | `guards/compliance-or-admin.guard.ts` (aceita ADMIN + COMPLIANCE) |
| Endpoint público | `marketplace-banners.public.controller.ts` (sem auth, retorna lista ativa) |
| Cache Redis | Reaproveitar `RedisService` (INFRA-XXX) — chaves `banners:public:active` (TTL 300s) |
| AuditLog | Adicionar 8 actions (`BANNER_*`) em `AuditLogService` |
| LGPD checklist | `backendnode/docs/legal/banner-LGPD-checklist.md` |
| Testes ≥10 | `banners.service.spec.ts`: CRUD, reorder, soft delete, toggle, cache invalidation |

### 12.2 Frontend (React Router 7) — Sprint `BNR-01`

| Arquivo/Alteração | Detalhe |
|--------------------|---------|
| `types/banner-slide.ts` | **ESTENDER** com `buttons?: BannerButton[]` (retro-compat) |
| `types/banner.ts` | **NOVO** — `Banner`, `BannerButton`, `CreateBannerDTO` |
| `lib/banner-schemas.ts` | **NOVO** — Zod schemas |
| `routes/api/admin.banners.ts` | **NOVO** — proxy GET/POST |
| `routes/api/admin.banners.$id.ts` | **NOVO** — proxy GET/PATCH/DELETE |
| `routes/api/admin.banners.reorder.ts` | **NOVO** — POST reorder |
| `routes/api/admin.banners.$id.toggle.ts` | **NOVO** — POST toggle |
| `routes/api/admin.banners.$id.buttons.ts` | **NOVO** — POST button |
| `routes/api/marketplace-banners.ts` | **NOVO/REESCRITO** — proxy público com cache 5min |
| `routes/api/admin.banners.$id.buttons.$buttonId.ts` | **NOVO** — PATCH/DELETE button |
| `routes/private/admin-banners.tsx` | **NOVO** — lista |
| `routes/private/admin-banners.new.tsx` | **NOVO** — criar |
| `routes/private/admin-banners.$id.edit.tsx` | **NOVO** — editar |
| `routes/private/admin-banners.$id.preview.tsx` | **NOVO** — preview em tela cheia |
| `routes.ts` | Registrar 4 novas rotas |
| `routes/private/marketing.tsx` | Modificar loader para usar `/api/marketplace-banners` (substitui `getBannerSlides`) |
| `components/marketplace/marketplace-banner.tsx` | **ESTENDER** com suporte a `buttons[]` posicionados (mantém retro-compat) |
| `components/admin/` (novo) | `banner-list-card.tsx`, `banner-form-fields.tsx`, `banner-image-uploader.tsx`, `banner-button-editor.tsx`, `banner-button-edit-modal.tsx`, `banner-position-canvas.tsx`, `banner-preview-viewport.tsx`, `banner-audit-info.tsx` (~8 componentes) |
| `components/layout/sidebar.tsx` | Adicionar item "Banners" condicional em roles ADMIN/COMPLIANCE |
| `hooks/use-admin-banners.ts` | **NOVO** — TanStack Query list/create/update/delete |
| `hooks/use-admin-banner-detail.ts` | **NOVO** — useQuery single |
| `hooks/use-banner-reorder.ts` | **NOVO** — mutation |
| `hooks/use-banner-toggle.ts` | **NOVO** — mutation |
| `hooks/use-marketplace-banners.ts` | **NOVO** — query público (com cache) |
| Specs Vitest ≥6 | `banner-position-canvas.test.tsx`, `banner-form-fields.test.tsx`, `banner-button-edit-modal.test.tsx` |

### 12.3 Dependências NPM a adicionar

```bash
# Editor drag-and-drop
pnpm add -w @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

(Tamanho: ~25 KB gzipped — leve; usado para botão + sortable da lista)

---

## 13. Tarefas Derivadas (proposta para `todo.json`)

Quando o sprint for despachado, criar 5 tasks no `todo.json`:
- `BNR-01A` Backend — Schema + migrations + módulo + controllers + 8 actions AuditLog + LGPD
- `BNR-01B` Frontend — Lista + Editor + drag-and-drop + 4 BFFs + 8 componentes
- `BNR-01C` BFF público `/api/marketplace-banners` + integração com `marketing.tsx`
- `BNR-01D` Guard `ComplianceOrAdminGuard` + sidebar condicional
- `BNR-01E` LGPD audit checklist + 8 audit tests

---

**Versão:** 1.0 (Rascunho 2026-08-15)  
**Relacionado:** PRD 1 (startup pública), PRD 3 (compliance), FIN-09..12 (Repasse), TRANSP-03..05 (Discussão)
