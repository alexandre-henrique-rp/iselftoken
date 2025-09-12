---
description: Página Privada /perfil
---

# Página `/perfil`

- Arquivo: `src/app/(protected)/perfil/page.tsx`
- Objetivo: Página de perfil do usuário, exibe os dados do usuário logado.

## Payload de Perfil (API)

```ts
// Estrutura esperada na resposta da API de Perfil
export interface PerfilUsuario {
  id: number; // id do usuário
  nome: string; // nome do usuário
  email: string; // email do usuário
  role: "fundador" | "afiliado" | "admin" | "investidor"; // papel do usuário
  telefone: string; // telefone do usuário
  cep: string; // CEP do usuário
  endereco: string; // logradouro
  bairro: string;
  cidade: string;
  uf: string; // estado/província
  pais: string;
  numero: string; // número do endereço
  avatar: string; // link do avatar (ex.: https://i.pravatar.cc/150?u=1)
  documento: string; // link do documento (ex.: https://i.pravatar.cc/150?u=1)
  reg_documento: string; // número do documento enviado (upload)
  tipo_documento: string; // tipo do documento enviado (upload)
  status: string; // status do usuário
  termos: boolean; // aceite dos termos
  bio_facial: string; // link da foto capturada pelo sistema (ex.: https://i.pravatar.cc/150?u=1)
  startups: Array<{ id: number; nome: string; logo: string; status: string; createdAt: string; updatedAt: string }>;
  indicados: Array<{ id: number; nome: string; logo: string; status: string; createdAt: string; updatedAt: string }>;
  fundador: boolean;
  afiliado: boolean;
  persent_ganho: number; // porcentagem de ganho (nome conforme contrato atual)
  dt_nascimento: string; // ISO ex.: 2025-01-01T00:00:00.000Z
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```

## Inputs (conforme PerfilUsuario)

- investidor ou fundador ou afiliado
  - Dados Pessoais
    - nome (string)
    - gênero (Masculino, Feminino, Outro)
    - data de nascimento (dt_nascimento, string ISO; UI usa input date)
    - nacionalidade (pais, ex.: BR, AR, US)
    - naturalidade (opcional)
    - role (somente leitura na UI)
  - Contato
    - email (string)
    - telefone (string, máscara com DDI/DDD)
  - Endereço
    - cep (string, máscara 99999-999)
    - endereco (logradouro)
    - numero (string)
    - complemento (opcional)
    - bairro (string)
    - cidade (string)
    - uf (2 letras)
    - pais (string)
  - Documento de Identificação
    - tipo_documento (string única: CPF | RG | DNI | Passport — select/radio)
    - reg_documento (string — número conforme tipo)
    - documento (string — URL após upload)
  - Biometria e Avatar
    - bio_facial (string — URL após captura/upload)
    - avatar (string — URL após upload)
  - Outros (conforme PerfilUsuario)
    - termos (boolean — aceite dos termos)
    - status (string — somente leitura)
  - Startups (somente `role = fundador`)
    - tabela de startups (id, nome, logo, status, createdAt, updatedAt)
    - ações: adicionar (modal), editar (navega /startup/:id), deletar (modal confirmação)

### Mapeamento PerfilUsuario -> Campos do Formulário

- Dados Pessoais
  - nome ⇄ `nome: string` (min 2, max 100)
  - gênero ⇄ `genero?: "Masculino" | "Feminino" | "Outro"` (select, opcional)
  - data de nascimento ⇄ `dt_nascimento: string` (ISO; exibir como `Date` no form, validar >= 1900 e <= hoje)
  - nacionalidade ⇄ `pais: string` (usar código/label; ex.: BR, AR, US)
  - naturalidade ⇄ `naturalidade?: string` (opcional)
  - role ⇄ `role: "fundador" | "afiliado" | "admin" | "investidor"` (somente leitura)

- Contato
  - email ⇄ `email: string` (formato válido)
  - telefone ⇄ `telefone: string` (máscara via `applyPhoneMask`)

- Endereço
  - cep ⇄ `cep: string` (máscara via `applyCepMask`; auto-preencher endereço se possível)
  - endereco ⇄ `endereco: string`
  - numero ⇄ `numero: string`
  - complemento ⇄ `complemento?: string`
  - bairro ⇄ `bairro: string`
  - cidade ⇄ `cidade: string`
  - uf ⇄ `uf: string` (2 letras)
  - pais ⇄ `pais: string`

- Documento de Identificação
  - tipo_documento ⇄ `tipo_documento: string` (único valor)
  - reg_documento ⇄ `reg_documento: string`
  - documento ⇄ `documento: string` (URL após upload)

- Biometria e Avatar
  - bio_facial ⇄ `bio_facial: string` (URL após captura/upload)
  - avatar ⇄ `avatar: string` (URL após upload)

- Outros
  - termos ⇄ `termos: boolean`
  - status ⇄ `status: string` (somente leitura)

- Startups (somente fundador)
  - tabela derivada de `startups: { id, nome, logo, status, createdAt, updatedAt }[]`
  - ações: adicionar/editar/deletar (modais). Não fazem parte do formulário principal de perfil.

### Validações (Zod) — sugestão (alinhado à interface)

```ts
import { z } from "zod";

export const perfilSchema = z.object({
  nome: z.string().min(2).max(100),
  genero: z.enum(["Masculino", "Feminino", "Outro"]).optional(),
  dt_nascimento: z.string().refine(v => !Number.isNaN(Date.parse(v)), {
    message: "Data inválida",
  }).optional(),
  email: z.string().email(),
  telefone: z.string().min(10), // máscara aplicada na UI (applyPhoneMask)
  cep: z.string().min(9).optional(), // 99999-999 (applyCepMask)
  endereco: z.string().min(3).optional(),
  numero: z.string().min(1).optional(),
  complemento: z.string().optional(),
  bairro: z.string().min(2).optional(),
  cidade: z.string().min(2).optional(),
  uf: z.string().length(2).optional(),
  pais: z.string().min(2).optional(),
  tipo_documento: z.string().min(1).optional(), // string única
  reg_documento: z.string().min(3).optional(),
  documento: z.string().url().optional(), // URL após upload
  bio_facial: z.string().url().optional(),
  termos: z.boolean().optional(),
  status: z.string().optional(),
});

export type PerfilFormValues = z.infer<typeof perfilSchema>;
```

### Máscaras e componentes sugeridos

- Telefone: `applyPhoneMask` de `src/lib/mask-utils.ts`.
- CEP: `applyCepMask` de `src/lib/mask-utils.ts`.
- Avatar: componente shadcn (comp-543) com preview e validação de tipo/tamanho.
- Documento: componente shadcn (comp-545) com restrição de tipos (PDF/JPG/PNG) e tamanho.
- iSelfBio: `WebcamCapture` abrindo modal; salvar como arquivo e obter URL do backend.

### Componente iSelfBio (Modal de Captura Facial)

- __Objetivo__: Capturar uma foto facial do usuário através da webcam (desktop) ou câmera (mobile) para preencher `bio_facial`.

- __Fluxo de UX__
  - Abrir modal ao clicar em “Capturar Biometria”.
  - Solicitar permissão da câmera via `getUserMedia`.
  - Exibir vídeo ao vivo com guia/overlay para posicionamento do rosto.
  - Ações: “Capturar” → preview → “Confirmar” ou “Refazer”; “Cancelar” fecha o modal e para a câmera.
  - Ao confirmar: realizar upload, obter URL e setar no form `bio_facial`.

- __Requisitos Técnicos__
  - `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`.
  - Mobile: manter `facingMode: 'user'` e oferecer opção `'environment'` se necessário.
  - Captura via `<canvas>`: `drawImage(video, ...)` → `canvas.toBlob()` ou `toDataURL('image/jpeg', 0.8)`.
  - Formatos: JPEG/PNG; tamanho máximo sugerido: 2 MB (configurável).
  - Fallback: `<input type="file" accept="image/*" capture="user">` quando permissão negada ou sem suporte.
  - Ao fechar modal, parar `MediaStreamTrack` para liberar a câmera.
  - Acessibilidade: foco inicial, `aria-*`, fechar com ESC e navegação por teclado.
  - i18n: textos extraídos para `i18n`.

- __Contrato do Componente__ (proposta)

```ts
export interface WebcamCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptured: (file: Blob | File) => Promise<void> | void; // responsável por fazer upload e atualizar o form
  onError?: (error: Error) => void;
  facingMode?: 'user' | 'environment';
  maxSizeBytes?: number; // default 2 * 1024 * 1024
  aspectRatio?: number; // ex.: 3/4 ou 1
  showGuideOverlay?: boolean;
}
```

- __Exemplo de Uso__ (dentro do `PerfilForm`)

```tsx
const [bioOpen, setBioOpen] = useState(false);

async function handleCaptured(file: Blob) {
  // upload e retorno da URL final
  const url = await uploadArquivo(file, 'bio_facial');
  form.setValue('bio_facial', url, { shouldValidate: true });
}

<Button onClick={() => setBioOpen(true)}>Capturar Biometria</Button>
<WebcamCapture
  open={bioOpen}
  onOpenChange={setBioOpen}
  onCaptured={handleCaptured}
  facingMode="user"
  maxSizeBytes={2 * 1024 * 1024}
  aspectRatio={3/4}
  showGuideOverlay
/>
```

- __Integração com Adapter/API__
  - Upload preferencial via endpoint dedicado (ex.: `POST /api/upload?tipo=bio_facial`) retornando `{ status, message, data: { url } }`.
  - Após upload, atualizar o perfil via `PUT /api/perfil` com `{ bio_facial: url }` ou enviar junto com demais campos do form.
  - Respeitar o padrão `{ status, message, data }` em todas as respostas.

- __Validação__
  - Zod: `bio_facial: z.string().url().optional()`; tornar obrigatório conforme regra KYC quando aplicável.

- __Segurança e Privacidade__
  - Exigir consentimento explícito (informar claramente no modal).
  - Tráfego criptografado (HTTPS) e sanitização de metadados.
  - Evitar persistir base64 no localStorage; realizar upload imediato e manter somente a URL.

## Atenção
- O campo "Documento" deve usar o componente `FileUpload` (shadcn): `npx shadcn@latest add https://originui.com/r/comp-545.json`.
- O campo "iSelfBio" deve usar o componente `WebcamCapture` como botão que abre um modal para captura via webcam.
- O campo "Tipo de documento" deve ser um checkbox com as opções: CPF, RG, DNI, Passport.
- O campo "Gênero" deve ser um select com as opções: Masculino, Feminino, Outro.
- O campo "Avatar" deve ser um upload de imagem (shadcn): `npx shadcn@latest add https://originui.com/r/comp-543.json`.
- O campo "Startup" deve ser uma tabela com as startups relacionadas ao usuário, com colunas: id, fantasia, cnpj, ações (editar, deletar).
- O campo "Startup" só deve aparecer se a role do usuário for `fundador`.
- O campo "Startup" deve ter um botão de adicionar que abre um modal com os campos: fantasia, cnpj.
- O campo "Startup" deve ter um botão de editar que redireciona para `/startup/:id`.
- O campo "Startup" deve ter um botão de deletar que abre um modal de confirmação.

## Components

### Componentização da página de Perfil
- Caminhos dos componentes:
  - `src/components/business/perfil/perfil-resumo.tsx` — resumo do usuário (nome, email, role, localização, país, telefone)
  - `src/components/business/perfil/tabela-startups-do-usuario.tsx` — tabela de startups (somente fundador)
  - (planejado) `src/components/business/perfil/perfil-form.tsx` — formulário completo com RHF+Zod e máscaras
  - (planejado) `src/components/business/perfil/campo-avatar-upload.tsx` — upload de avatar (shadcn comp-543)
  - (planejado) `src/components/business/perfil/campo-documento-upload.tsx` — upload de documento (shadcn comp-545)
  - (planejado) `src/components/business/perfil/botao-iselfbio-webcam.tsx` — botão que abre modal de webcam
  - (planejado) `src/components/business/perfil/modal-cadastro-startup.tsx`
  - (planejado) `src/components/business/perfil/modal-confirmacao-excluir-startup.tsx`

### Uso na página `page.tsx`
- A página `src/app/(protected)/perfil/page.tsx` deve:
  - Manter o fetch server-side (`GET /api/perfil`) e passar dados para componentes.
  - Renderizar `PerfilResumo` e, se `role = fundador`, `TabelaStartupsDoUsuario`.
  - No futuro, importar `PerfilForm` (client) para edição e submissão (`PUT /api/perfil`).

## Discussão Técnica (Dev Frontend Sênior × Arquiteto de Soluções)
- __Dev__: Formulário único com campos comuns e condicionais por role. RHF + Zod. Máscaras via `src/lib/mask-utils.ts` (remask). Avatar/Documento com shadcn. IselfBio via modal webcam.
- __Arq__: Separar UI de serviços (Clean Architecture). Usar `src/app/api/perfil/route.ts` (GET/PUT) para persistir. Startups apenas se `role='fundador'`, com tabela e modais. Evitar acoplamento a backend específico.

### Conclusões
- Formulário principal tipado e validado (RHF+Zod), com máscaras reutilizáveis.
- Uploads (avatar/documento) com componentes shadcn e validações.
- Webcam em modal para IselfBio.
- Tabela CRUD de startups (fundador) com adicionar/editar/deletar.

## Plano de Ação
- 1) Definir schemas Zod (Perfil e StartupMin).
- 2) Montar `PerfilForm` com campos e condicionais por role.
- 3) Integrar uploads (avatar/documento) e webcam.
- 4) Implementar `TabelaStartupsDoUsuario` + modais (cadastro/confirmar exclusão).
- 5) Integrar `GET/PUT /api/perfil` mantendo padrão `status/message/data`.
- 6) Escrever testes (unidade/integr./UI/acessibilidade).

## Especificação Detalhada (modelo baseado em `doc/context/frontend-register.md`)

### PerfilForm
- __Descrição__: Formulário principal do perfil.
- __Objetivo__: Exibir/editar dados do usuário autenticado com validação.
- __Lógica__:
  - Carrega valores via `GET /api/perfil`.
  - Campos: nome, cpf, telefone, cep, endereco, bairro, cidade, uf, pais, numero, email, tipoDeDocumento (checkbox: CPF/RG/DNI/Passport), documento (upload), dataNascimento, genero (select), iselfBio (webcam), avatar (upload).
  - Condicional: seção Startups visível apenas para `role='fundador'`.
  - Envio: `PUT /api/perfil` com payload tipado. Exibir toast de sucesso/erro.

### CampoAvatarUpload (shadcn comp-543)
- Upload com pré-visualização, validação de tipo/tamanho, integrado ao RHF via Controller.

### CampoDocumentoUpload (shadcn comp-545)
- Upload de documento (PDF/IMG). Associa com `tipoDeDocumento`. Validação de tamanho/formatos.

### BotaoIselfBioWebcam
- Abre modal `WebcamCapture`. Retorna imagem (base64/Blob) para o RHF.

### TabelaStartupsDoUsuario (somente fundador)
- Colunas: id, fantasia, cnpj, ações (Editar → `/startup/:id`, Deletar → modal).
- Botão “Adicionar Startup” → `ModalCadastroStartup` (campos: fantasia, cnpj, validação Zod + máscara CNPJ).
- Fonte de dados: sessão/estado ou mock local até haver endpoints dedicados.

### ModalCadastroStartup
- RHF + Zod. Ao confirmar: atualiza lista local ou chama endpoint futuro.

### ModalConfirmacaoExcluirStartup
- Confirma remoção. Ao confirmar: remove da lista local ou chama endpoint futuro.

## Lógica Principal e Fluxos
- Carregar → exibir formulário → editar → validar → salvar (PUT) → feedback.
- Renderização condicional por role. i18n e tema respeitados.

## Integração com API
- Existente: `src/app/api/perfil/route.ts` (GET/PUT). Responder no padrão `doc/documentação/index.md` (status/message/data).
- Futuro (proposta): endpoints para startups do usuário (listar/criar/deletar). Enquanto não existir, usar mock local documentado.

## Camada de Aplicação e Adapter (Clean Architecture)

### Contrato do Adapter

```ts
// src/infrastructure/perfil/perfil-adapter.ts
export interface PerfilAdapter {
  getPerfil(): Promise<{ status: string; message: string; data: PerfilDTO }>;
  updatePerfil(input: UpdatePerfilDTO): Promise<{ status: string; message: string; data: PerfilDTO }>;
}
```

### DTOs (Infra)

```ts
// src/infrastructure/perfil/dto.ts
export interface PerfilDTO {
  id: number;
  nome: string;
  email: string;
  role: "fundador" | "afiliado" | "admin" | "investidor";
  telefone: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
  numero: string;
  avatar: string;
  documento: string;
  reg_documento: string;
  tipo_documento: string;
  status: string;
  termos: boolean;
  bio_facial: string;
  startups: Array<{ id: number; nome: string; logo: string; status: string; createdAt: string; updatedAt: string }>;
  indicados: Array<{ id: number; nome: string; logo: string; status: string; createdAt: string; updatedAt: string }>;
  fundador: boolean;
  afiliado: boolean;
  persent_ganho: number;
  dt_nascimento: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdatePerfilDTO = Partial<Omit<PerfilDTO, "id" | "createdAt" | "updatedAt" | "startups" | "indicados" | "role" | "status">> & {
  // manter email/role imutáveis na maior parte dos casos; atualizar apenas quando permitido
  email?: string;
};
```

### Mapper (Infra → Domínio)

```ts
// src/modules/perfil/perfil-mapper.ts
import { PerfilDTO } from "@/infrastructure/perfil/dto";
import { PerfilUsuario } from "@/models/entities/perfil"; // sugestão de entidade de domínio

export class PerfilMapper {
  static toDomain(dto: PerfilDTO): PerfilUsuario {
    // aqui poderíamos normalizar nomenclaturas e validar invariantes de domínio
    return {
      ...dto,
    } as unknown as PerfilUsuario;
  }

  static toDTO(entity: PerfilUsuario): PerfilDTO {
    return {
      ...(entity as unknown as PerfilDTO),
    };
  }
}
```

### Casos de Uso (Application)

```ts
// src/modules/perfil/use-cases/get-perfil.use-case.ts
import { PerfilAdapter } from "@/infrastructure/perfil/perfil-adapter";
import { PerfilMapper } from "@/modules/perfil/perfil-mapper";

export class GetPerfilUseCase {
  constructor(private readonly adapter: PerfilAdapter) {}
  async execute() {
    const res = await this.adapter.getPerfil();
    // verificar padrão status/message/data
    if (res.status !== "success") {
      throw new Error(res.message || "Falha ao carregar perfil");
    }
    return PerfilMapper.toDomain(res.data);
  }
}

// src/modules/perfil/use-cases/update-perfil.use-case.ts
import { PerfilAdapter } from "@/infrastructure/perfil/perfil-adapter";
import { PerfilMapper } from "@/modules/perfil/perfil-mapper";
import { UpdatePerfilDTO } from "@/infrastructure/perfil/dto";

export class UpdatePerfilUseCase {
  constructor(private readonly adapter: PerfilAdapter) {}
  async execute(input: UpdatePerfilDTO) {
    const res = await this.adapter.updatePerfil(input);
    if (res.status !== "success") {
      throw new Error(res.message || "Falha ao atualizar perfil");
    }
    return PerfilMapper.toDomain(res.data);
  }
}
```

### Contrato da API (Server Routes)

```ts
// src/app/api/perfil/route.ts (exemplo ilustrativo)
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // obter usuário/sessão e carregar dados
    const data = /* ...carregar PerfilDTO... */ null;
    return NextResponse.json({ status: "success", message: "Perfil carregado", data });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message, data: null }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    // validar body, persistir e retornar PerfilDTO atualizado
    const data = /* ...atualizar PerfilDTO... */ null;
    return NextResponse.json({ status: "success", message: "Perfil atualizado", data });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message, data: null }, { status: 400 });
  }
}
```

### Exemplos de Request/Response

```http
GET /api/perfil
Response 200
{
  "status": "success",
  "message": "Perfil carregado",
  "data": { /* PerfilDTO */ }
}

PUT /api/perfil
Request Body (parcial - somente campos alterados)
{
  "nome": "Novo Nome",
  "telefone": "+55 (11) 91234-5678",
  "cep": "01001-000"
}

Response 200
{
  "status": "success",
  "message": "Perfil atualizado",
  "data": { /* PerfilDTO atualizado */ }
}
```

### Tratamento de Erros & Regras

- __Padronizar respostas__: sempre `{ status, message, data }`.
- __Validação__: usar Zod no server antes de persistir (converter do DTO de entrada para tipos fortes).
- __Permissões__: alguns campos podem ser somente leitura (ex.: `email`, `role`). Documentar a política.
- __Uploads__: retornar URLs finais nos campos `avatar` e `documento` após armazenamento.
- __Auditoria__: manter `updatedAt` atualizado no retorno.

## Decisões de Implementação
- Clean Architecture: UI em `src/components/`; serviços/adaptadores em `src/modules/` ou `src/infrastructure/`.
- SOLID/DDD: responsabilidade única; tipos explícitos; validações com Zod no domínio.
- Acessibilidade: labels/aria, foco em modais.

## Testes Recomendados (TDD)
- Unidade: schemas Zod; máscaras CPF/CEP/telefone/CNPJ.
- Integração: fluxo GET→edição→PUT; visibilidade de startups por role; modais.
- UI: responsividade, tema, i18n; uploads com pré-visualização.
- Acessibilidade: navegação por teclado, leitores de tela.

## Roteiro de Implementação
1) Schemas e testes.
2) `PerfilForm` com condicionais + máscaras.
3) Uploads e webcam.
4) Tabela e modais de startups.
5) Integração GET/PUT.
6) Cobertura de testes e revisão.
