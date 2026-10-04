# Seed de Uploads — Planejamento

**Status:** PLANEJADO (não implementado)
**Criado:** 2026-07-14
**Depende de:** refactor uploads concluído (S3/RustFS providers funcionais)

---

## 1. Landscape de Uploads no Projeto

### 1.1 Modelos que Referenciam Arquivos

| Modelo | Campo FK | Tipo Arquivo | Bucket | Obrigatório? |
|--------|----------|-------------|--------|-------------|
| **User** | `avatar_id` → KYCProfile | imagem (jpg/png) | image | Não |
| **User** | `comprovante_id` → KYCProfile | imagem/pdf | image/document | Sim (KYC) |
| **User** | `documento_id` → KYCProfile | imagem/pdf | image/document | Sim (KYC) |
| **User** | `biofacial_id` → KYCProfile | imagem (jpg/png) | image | Sim (KYC) |
| **Startup** | `logo_id` → KYCProfile | imagem (jpg/png/svg) | image | Sim |
| **Startup** | `cover_id` → KYCProfile | imagem (jpg/png) | image | Não |
| **Startup** | `mie_id` → KYCProfile | pdf | document | Sim (CVM) |
| **Startup** | `contrato_social_id` → KYCProfile | pdf | document | Sim (CVM) |
| **Startup** | `cnpj_id` → KYCProfile | pdf | document | Sim (CVM) |
| **Startup** | `balanco_atual_id` → KYCProfile | pdf | document | Sim (CVM) |
| **Startup** | `declaracao_veracidade_id` → KYCProfile | pdf | document | Sim (CVM) |
| **Startup** | `ata_eleicao_id` → KYCProfile | pdf | document | Sim (CVM) |
| **Startup** | `balanco_anterior_id` → KYCProfile | pdf | document | Condicional |
| **Startup** | `procuracao_id` → KYCProfile | pdf | document | Condicional |
| **Startup** | `cv_socios_id` → KYCProfile | pdf | document | Condicional |
| **Startup** | `pitch_deck_id` → KYCProfile | pdf | document | Recomendado |
| **Startup** | `projecoes_id` → KYCProfile | pdf | document | Recomendado |
| **Startup** | `modelo_contrato_oferta_id` → KYCProfile | pdf | document | Recomendado |
| **Startup** | `comprovante_endereco_id` → KYCProfile | pdf | document | Recomendado |
| **Startup** | `declaracao_receita_id` → KYCProfile | pdf | document | Recomendado |
| **Startup** | `documents` → StartupDocument | pdf/varios | document | Sim (CVM) |
| **Upload** | Upload direto | image/video/document | Variável | - |

### 1.2 Contagem por Bucket

| Bucket | Quantidade Estimada | Tipos |
|--------|-------------------|-------|
| `iselftoken-image` | ~40 | logos, covers, avatares, comprovantes, documentos |
| `iselftoken-image-md` | ~40 | variantes medium |
| `iselftoken-image-sm` | ~40 | thumbnails |
| `iselftoken-document` | ~60 | PDFs (CVM, pitch deck, contratos) |
| **Total** | **~180 arquivos** | |

---

## 2. Estrutura de Dados por Entidade

### 2.1 User (3 users na seed: admin, founder, investidor)

```
admin/
├── avatar.jpg          (200x200, ~15KB)
├── comprovante.pdf     (1 página, ~50KB)
├── documento.pdf       (1 página, ~50KB)
└── biofacial.jpg       (400x400, ~25KB)

founder/
├── avatar.jpg          (200x200, ~15KB)
├── comprovante.pdf     (1 página, ~50KB)
├── documento.pdf       (1 página, ~50KB)
└── biofacial.jpg       (400x400, ~25KB)

investidor/
├── avatar.jpg          (200x200, ~15KB)
├── comprovante.pdf     (1 página, ~50KB)
├── documento.pdf       (1 página, ~50KB)
└── biofacial.jpg       (400x400, ~25KB)
```

### 2.2 Startup (23 startups: 3 principais + 20 marketplace)

```
startups/<slug>/
├── logo.jpg            (400x400, ~20KB)  [Obrigatório]
├── cover.jpg           (1200x630, ~80KB) [Opcional]
├── pitch.pdf           (10 páginas, ~200KB) [Recomendado]
│
├── # CVM Obrigatórios
├── mie.pdf             (1 página, ~50KB)
├── contrato_social.pdf (5 páginas, ~150KB)
├── cnpj.pdf            (1 página, ~50KB)
├── balanco_atual.pdf   (10 páginas, ~300KB)
├── declaracao_veracidade.pdf (1 página, ~30KB)
├── ata_eleicao.pdf     (3 páginas, ~80KB)
│
├── # CVM Condicionais
├── balanco_anterior.pdf (10 páginas, ~300KB)
├── procuracao.pdf      (1 página, ~30KB)
├── cv_socios.pdf       (5 páginas, ~100KB)
│
├── # Recomendados
├── projecoes.pdf       (15 páginas, ~250KB)
├── modelo_contrato_oferta.pdf (10 páginas, ~200KB)
├── comprovante_endereco.pdf (1 página, ~30KB)
└── declaracao_receita.pdf (3 páginas, ~50KB)
```

### 2.3 StartupDocument (18 categorias)

```
# Cada startup com status APPROVED+ terá docs por categoria:
MIE, CONTRATO_SOCIAL, CNPJ, BALANCO_ATUAL,
DECLARACAO_VERACIDADE, ATA_ELEICAO,
BALANCO_ANTERIOR, PROCURACAO, CV_SOCIOS,
PITCH_DECK, PROJECOES, MODELO_CONTRATO_OFERTA,
COMPROVANTE_ENDERECO, DECLARACAO_RECEITA,
TERMO_PLATAFORMA, OUTRO
```

---

## 3. Fontes de Arquivos de Exemplo

### 3.1 Imagens (via placehold.co — gera PNGs estáticos)

| Uso | URL | Tamanho |
|-----|-----|---------|
| Logo startup | `https://placehold.co/400x400/1a1a2e/ffffff?text=S1` | 400x400 |
| Cover startup | `https://placehold.co/1200x630/16213e/ffffff?text=Cover` | 1200x630 |
| Avatar user | `https://placehold.co/200x200/e94560/ffffff?text=AV` | 200x200 |
| Biofacial | `https://placehold.co/400x400/0f3460/ffffff?text=BIO` | 400x400 |
| Thumbnail | `https://placehold.co/200x200/533483/ffffff?text=SM` | 200x200 |

**Alternativa:** `https://picsum.photos/seed/<nome>/200/200` (fotos reais aleatórias)

### 3.2 PDFs (gerar programaticamente com PDFKit)

```typescript
import PDFDocument from 'pdfkit';

function createSeedPdf(title: string, pages: number): Buffer {
  const doc = new PDFDocument();
  for (let i = 0; i < pages; i++) {
    if (i > 0) doc.addPage();
    doc.fontSize(20).text(title, 100, 100);
    doc.fontSize(12).text(`Página ${i + 1} de ${pages}`, 100, 150);
    doc.text('Documento de exemplo para seed do banco de dados.');
    doc.text('Iselftoken — Equity Crowdfunding Platform');
  }
  return doc;
  // Buffer → upload para S3/RustFS
}
```

**Dependência:** `npm install pdfkit --save-dev` + `@types/pdfkit`

### 3.3 Downloads Necessários

```bash
# Imagens (placehold.co gera PNGs)
curl -o seeds/assets/avatar-admin.jpg "https://placehold.co/200x200/e94560/ffffff?text=Admin"
curl -o seeds/assets/avatar-founder.jpg "https://placehold.co/200x200/0f3460/ffffff?text=Founder"
curl -o seeds/assets/avatar-investor.jpg "https://placehold.co/200x200/533483/ffffff?text=Invest"

# Logos (cores diferentes por startup)
curl -o seeds/assets/logo-techinnovate.png "https://placehold.co/400x400/1a1a2e/ffffff?text=TechInnovate"
curl -o seeds/assets/logo-greenenergy.png "https://placehold.co/400x400/2ecc71/ffffff?text=GreenEnergy"
curl -o seeds/assets/logo-fintechpro.png "https://placehold.co/400x400/3498db/ffffff?text=FintechPro"

# Covers
curl -o seeds/assets/cover-default.jpg "https://placehold.co/1200x630/16213e/ffffff?text=Startup+Cover"
```

---

## 4. Script de Seed (Esqueleto)

### 4.1 Arquivos a Criar

```
prisma/seeds/
├── seed-uploads.ts          # Entry point principal
├── seed-uploads-assets/     # Assets estáticos
│   ├── images/
│   │   ├── avatars/
│   │   ├── logos/
│   │   └── covers/
│   └── pdfs/                # Gerados programaticamente
├── seed-upload-helpers.ts    # Funções auxiliares
└── seed-upload-config.ts    # Config (buckes, tamanhos, etc.)
```

### 4.2 Fluxo do Script

```
1. seed-upload-helpers.ts
   ├── downloadOrGenerateImage(url, localPath) → Buffer
   ├── generatePdf(title, pages) → Buffer
   ├── uploadToS3(buffer, bucket, key) → presignedUrl
   └── createKYCProfile(data) → KYCProfile

2. seed-upload-config.ts
   ├── USER_ASSETS: { admin: [...], founder: [...], investor: [...] }
   ├── STARTUP_ASSETS: { techinnovate: [...], greenenergy: [...], ... }
   └── BUCKETS: { image: 'iselftoken-image', document: 'iselftoken-document' }

3. seed-upload.ts
   ├── Carregar config
   ├── Para cada User: criar KYCProfiles + Upload
   ├── Para cada Startup: criar KYCProfiles (logo, cover, docs CVM)
   ├── Para cada StartupDocument: criar registros
   ├── Para uploads diretos: criar registros Upload
   └── Resumo: "X imagens, Y PDFs, Z uploads criados"
```

### 4.3 Comando npm

```json
{
  "scripts": {
    "seed:uploads": "ts-node prisma/seeds/seed-uploads.ts"
  }
}
```

---

## 5. Mapeamento Completo: Startup → Campos de Upload

### 5.1 3 Startups Principais (blueprints existentes)

| Startup | Slug | Logo | Cover | CVM Docs | Pitch |
|---------|------|------|-------|----------|-------|
| TechInnovate | techinnovate | ✅ | ✅ | 6 obrigatórios | ✅ |
| GreenEnergy | greenenergy | ✅ | ✅ | 6 obrigatórios | ✅ |
| FintechPro | fintechpro | ✅ | ✅ | 6 obrigatórios | ✅ |

### 5.2 20 Startups Marketplace (seedRichStartups)

| Startup | Slug | Logo | Cover | CVM Docs | Pitch |
|---------|------|------|-------|----------|-------|
| AgroSeed | agroseed | ✅ | ❌ | ❌ | ✅ |
| AuroraSaaS | aurorasaas | ✅ | ❌ | ❌ | ✅ |
| BioGenix | biogenix | ✅ | ❌ | ❌ | ✅ |
| BrainPath | brainpath | ✅ | ❌ | ❌ | ✅ |
| Clinilink | clinilink | ✅ | ❌ | ❌ | ✅ |
| CloudPilot | cloudpilot | ✅ | ❌ | ❌ | ✅ |
| DataVision | datavision | ✅ | ❌ | ❌ | ✅ |
| EduSphere | edusphere | ✅ | ❌ | ❌ | ✅ |
| GreenFleet | greenfleet | ✅ | ❌ | ❌ | ✅ |
| LearnFlow | learnflow | ✅ | ❌ | ❌ | ✅ |
| LogiXchain | logixchain | ✅ | ❌ | ❌ | ✅ |
| MediCoreFlex | medicoreflex | ✅ | ❌ | ❌ | ✅ |
| NestoPay | nestopay | ✅ | ❌ | ❌ | ✅ |
| NeuralForge | neuralforge | ✅ | ❌ | ❌ | ✅ |
| PaySwift | payswift | ✅ | ❌ | ❌ | ✅ |
| PixGlobal | pixglobal | ✅ | ❌ | ❌ | ✅ |
| RetailOps | retailops | ✅ | ❌ | ❌ | ✅ |
| SafeHome | safehome | ✅ | ❌ | ❌ | ✅ |
| TokenVault | tokenvault | ✅ | ❌ | ❌ | ✅ |
| VibeDeck | vibedeck | ✅ | ❌ | ❌ | ✅ |

---

## 6. Fluxo de Upload via API (Referência)

### 6.1 Upload Normalizado (novo modelo)

```
Browser → POST /api/uploads (multipart/form-data)
    → UploadsController.uploadFile()
    → UploadsService.create() (pipeline síncrono)
        → SHA-256 hash
        → Upload do original para S3/RustFS
        → Validação de MIME e sanitização
        → EXIF strip (imagens)
        → Geração de variants (lg/md/sm para imagens)
        → Persistência no DB (Upload + variants + status READY)
    → Resposta HTTP com URLs prontas
```

### 6.2 Seed: Upload Direto (sem browser)

```
seed-upload.ts
    → Ler arquivo local (ou baixar de URL)
    → Gerar SHA-256
    → Upload via S3Service ou IObjectStorageProvider
    → Criar registro Upload no banco
    → Criar registro KYCProfile com URLs presigned
```

### 6.3 URLs Presigned

```
Upload:   POST /api/uploads → { url: presignedUrl, uploadId }
View:     <img src="presignedUrl"> → MinIO/S3 direto
Renovar:  GET /api/uploads/url/:id → nova presignedUrl
```

---

## 7. Ordem de Implementação (Futura)

1. **Instalar dependência:** `npm install pdfkit --save-dev`
2. **Criar diretório:** `prisma/seeds/seed-upload-helpers.ts`
3. **Implementar helpers:** download, generatePdf, uploadToS3
4. **Criar config:** `prisma/seeds/seed-upload-config.ts`
5. **Implementar seed:** `prisma/seeds/seed-uploads.ts`
6. **Adicionar script:** `"seed:uploads": "ts-node prisma/seeds/seed-uploads.ts"`
7. **Testar:** `npm run seed:uploads`
8. **Verificar:** `npx prisma studio` → checar registros KYCProfile + Upload

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| placehold.co instável | Fallback: gerar PNGs com canvas sharp |
| PDFs muito grandes | Limitar a 1-3 páginas por doc de seed |
| S3 indisponível em dev | Usar RustFS local (minio) |
| Muitos uploads lentos | Processar em batch com Promise.allSettled |
| Bucket não existe | Seed deve criar buckets antes (init-cors.sh) |
| SHA-256 dedup conflito | Usar conteúdo único por arquivo (nomes diferentes) |
