# PRD — Perfil & KYC (10-profile)

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Objetivo** | Gerenciar dados pessoais do usuário e verificação KYC |
| **Rota** | `/perfil` |
| **Path** | `app/routes/private/perfil/index.tsx` |
| **Componentes** | `app/routes/private/perfil/components/index.tsx` |
| **APIs** | `userApi.me()`, `userApi.updateProfile()`, `userApi.uploadDoc()` |
| **Tipo** | Private (requer autenticação) |
| **Design System** | Tailwind CSS v4 + shadcn/ui (tema stone) |

## 2. Dependências

### 2.1 APIs Utilizadas
```typescript
// app/api/userapi.ts
userApi.me(): Promise<UserProfile>
userApi.updateProfile(data: UpdateProfileDTO): Promise<UserProfile>
userApi.uploadDoc(file: File, tipo: DocType): Promise<UploadResponse>
userApi.verifyPhone(codigo: string): Promise<VerifyResponse>
```

### 2.2 Contextos
- `AuthContext` — verificação de autenticação
- `UserContext` — dados do usuário logado

### 2.3 Componentes UI
- `Card` — seções do formulário
- `Input` — campos de texto
- `Select` — dropdowns
- `FileUpload` — upload de arquivos
- `Button` — ações
- `Badge` — status de verificação

## 3. Requisitos Funcionais

### 3.1 Seção Dados Pessoais

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Nome completo | text | Sim | Mín. 3 caracteres |
| E-mail | email | Sim | Formato válido |
| Telefone | tel | Sim | Formato +55 (XX) XXXXX-XXXX |
| Data de nascimento | date | Sim | Maior de 18 anos |
| Gênero | select | Não | Masculino/Feminino/Outro/Prefiro não dizer |
| Estado civil | select | Não | Solteiro/Casado/Divorciado/Viúvo |

```typescript
interface DadosPessoais {
  nomeCompleto: string;
  email: string;
  emailVerificado: boolean;
  telefone: string;
  telefoneVerificado: boolean;
  dataNascimento: string; // ISO date
  genero?: 'masculino' | 'feminino' | 'outro' | 'nao_informado';
  estadoCivil?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo';
}
```

**Status de Verificação:**
- E-mail: Badge verde "Verificado" ou amarelo "Pendente"
- Telefone: Badge com botão "Verificar número"

### 3.2 Seção Endereço

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| CEP | text | Sim | 8 dígitos, busca automática |
| Rua | text | Sim | Mín. 3 caracteres |
| Número | text | Sim | Alfanumérico |
| Complemento | text | Não | — |
| Bairro | text | Sim | Mín. 2 caracteres |
| Cidade | text | Sim | Mín. 2 caracteres |
| Estado | select | Sim | UF válida |
| País | select | Sim | Default: Brasil |

```typescript
interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  paisIso3?: string;
}

interface ProfissaoOcupacao {
  profissao: string;
  ocupacao?: string;
  empresa?: string;
}
```

**Busca de CEP:**
1. Usuário digita CEP (8 dígitos)
2. Sistema busca via API ViaCEP
3. Preenche automaticamente: rua, bairro, cidade, estado
4. Usuário pode editar campos preenchidos

### 3.3 Seção Documentação

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Tipo de documento | select | Sim |
| Número do documento | text | Sim |
| Data de emissão | date | Sim |
| Órgão emissor | text | Não |

```typescript
type TipoDocumento = 'rg' | 'cnh' | 'passaporte' | 'dni';

interface Documentacao {
  tipo: TipoDocumento;
  numero: string;
  dataEmissao: string;
  orgaoEmissor?: string;
  ufEmissao?: string;
}
```

**Validações por tipo:**
- RG: 7-14 caracteres alfanuméricos
- CNH: 11 dígitos numéricos
- Passaporte: Alfanumérico, formato internacional
- DNI: Documento estrangeiro

### 3.4 Uploads KYC

| Documento | Formato | Tamanho Max | Obrigatório |
|-----------|---------|-------------|-------------|
| Documento oficial | JPG, PNG, PDF | 5MB | Sim |
| Selfie com documento | JPG, PNG | 5MB | Sim |
| Comprovante de residência | JPG, PNG, PDF | 5MB | Sim |

```typescript
type DocType = 'documento' | 'selfie' | 'comprovante';

interface UploadDoc {
  tipo: DocType;
  arquivo: File;
  preview?: string;
  status: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado';
  motivoRejeicao?: string;
}

interface UploadResponse {
  id: string;
  url: string;
  status: string;
}
```

**Requisitos dos uploads:**
1. **Documento oficial**: Frente do documento legível
2. **Selfie com documento**: Rosto visível + documento na mão
3. **Comprovante de residência**: Emitido nos últimos 3 meses

### 3.5 Modal de Câmera (Selfie)

```typescript
interface CameraModalProps {
  isOpen: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
}
```

**Funcionalidades:**
- Acesso à câmera do dispositivo
- Preview em tempo real
- Botão de captura
- Retake se necessário
- Instruções na tela

### 3.6 Ações Finais

| Botão | Ação | Estado |
|-------|------|--------|
| Salvar informações | `userApi.updateProfile()` | Loading durante envio |
| Cancelar | Descarta alterações | Confirmação se houver mudanças |

## 4. Estruturas de Dados

### 4.1 UserProfile Completo

```typescript
interface UserProfile {
  id: string;
  dadosPessoais: DadosPessoais;
  endereco: Endereco;
  profissao: ProfissaoOcupacao;
  documentacao: Documentacao;
  kyc: {
    status: 'pendente' | 'em_analise' | 'aprovado' | 'reprovado';
    documentos: UploadDoc[];
    dataEnvio?: string;
    dataAnalise?: string;
    observacoes?: string;
  };
  plano?: {
    id: string;
    nome: string;
    validoAte: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 UpdateProfileDTO

```typescript
interface UpdateProfileDTO {
  dadosPessoais?: Partial<DadosPessoais>;
  endereco?: Partial<Endereco>;
  profissao?: Partial<ProfissaoOcupacao>;
  documentacao?: Partial<Documentacao>;
}
```

### 4.3 Exemplo de Resposta API

```json
{
  "id": "user-001",
  "dadosPessoais": {
    "nomeCompleto": "João Silva Santos",
    "email": "joao@email.com",
    "emailVerificado": true,
    "telefone": "+55 11 99999-9999",
    "telefoneVerificado": false,
    "dataNascimento": "1990-05-15",
    "genero": "masculino",
    "estadoCivil": "solteiro"
  },
  "endereco": {
    "cep": "01310-100",
    "rua": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Apto 101",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "estado": "SP",
    "pais": "Brasil"
  },
  "documentacao": {
    "tipo": "rg",
    "numero": "12.345.678-9",
    "dataEmissao": "2015-03-20",
    "orgaoEmissor": "SSP",
    "ufEmissao": "SP"
  },
  "kyc": {
    "status": "em_analise",
    "documentos": [
      {
        "tipo": "documento",
        "status": "enviado"
      },
      {
        "tipo": "selfie",
        "status": "aprovado"
      },
      {
        "tipo": "comprovante",
        "status": "pendente"
      }
    ],
    "dataEnvio": "2024-01-10T14:30:00Z"
  },
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-10T14:30:00Z"
}
```

## 5. Requisitos de UI/UX

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Meu Perfil                                    [KYC: ████░]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DADOS PESSOAIS                                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Nome completo    [________________________________] │   │
│  │ E-mail           [________________] ✓ Verificado    │   │
│  │ Telefone         [________________] [Verificar]     │   │
│  │ Nascimento       [__/__/____]                       │   │
│  │ Gênero           [▼ Selecione]                      │   │
│  │ Estado civil     [▼ Selecione]                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ENDEREÇO                                             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ CEP [________] 🔍   Rua [_______________________]   │   │
│  │ Número [____]       Complemento [______________]    │   │
│  │ Bairro [________]   Cidade [___________________]    │   │
│  │ Estado [▼ UF]       País [▼ Brasil]                 │   │
│  │ Profissão [____________________________________]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DOCUMENTAÇÃO                                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Tipo [▼ RG]         Número [___________________]    │   │
│  │ Data emissão [__/__/____]  Órgão [_____________]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ VERIFICAÇÃO KYC                          Status: ●   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                       │   │
│  │  │ DOC  │  │SELFIE│  │COMPR.│                       │   │
│  │  │  ✓   │  │  📷  │  │  +   │                       │   │
│  │  └──────┘  └──────┘  └──────┘                       │   │
│  │  Enviado    Tirar    Enviar                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                    [Cancelar]  [Salvar informações]         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Cores e Estilos

| Elemento | Classe Tailwind |
|----------|-----------------|
| Background página | `bg-stone-950` |
| Card seção | `bg-stone-900 border border-stone-800 rounded-lg p-6` |
| Título seção | `text-lg font-semibold text-stone-100 mb-4` |
| Label | `text-sm text-stone-400 mb-1` |
| Input | `bg-stone-800 border-stone-700 text-stone-100` |
| Input focus | `focus:border-[#d500f9] focus:ring-[#d500f9]` |
| Badge Verificado | `bg-green-600/20 text-green-400` |
| Badge Pendente | `bg-yellow-600/20 text-yellow-400` |
| Badge Reprovado | `bg-red-600/20 text-red-400` |
| Botão primário | `bg-[#d500f9] hover:bg-[#b000d4] text-white` |
| Botão secundário | `bg-stone-800 hover:bg-stone-700 text-stone-100` |

### 5.3 Upload Area

```typescript
interface UploadAreaProps {
  tipo: DocType;
  status: UploadDoc['status'];
  preview?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}
```

**Estados visuais:**
- Vazio: Área tracejada com ícone de upload
- Hover: Borda destacada
- Uploading: Progress bar
- Enviado: Preview com ícone de check
- Rejeitado: Borda vermelha com mensagem

## 6. Estados e Feedbacks

### 6.1 Loading

| Elemento | Comportamento |
|----------|---------------|
| Página inicial | Skeleton em todas as seções |
| Salvando | Spinner no botão + desabilita formulário |
| Upload | Progress bar com percentual |
| Busca CEP | Spinner no campo |

### 6.2 Validação Inline

```typescript
interface FieldError {
  field: string;
  message: string;
}

// Exibição abaixo do campo
<span className="text-red-500 text-xs mt-1">
  {error.message}
</span>
```

### 6.3 Status KYC

| Status | Cor | Ícone | Mensagem |
|--------|-----|-------|----------|
| Pendente | Amarelo | ⏳ | "Envie seus documentos para verificação" |
| Em análise | Azul | 🔄 | "Seus documentos estão sendo analisados" |
| Aprovado | Verde | ✓ | "Sua identidade foi verificada" |
| Reprovado | Vermelho | ✗ | "Documentos rejeitados. Veja o motivo." |

### 6.4 Toasts

| Ação | Tipo | Mensagem |
|------|------|----------|
| Salvar sucesso | success | "Perfil atualizado com sucesso!" |
| Salvar erro | error | "Erro ao salvar. Tente novamente." |
| Upload sucesso | success | "Documento enviado com sucesso!" |
| Upload erro | error | "Erro no upload. Verifique o arquivo." |

## 7. Fluxo KYC

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Pendente   │────▶│  Em análise │────▶│  Aprovado   │
│  (uploads)  │     │  (aguarda)  │     │  (completo) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Reprovado  │
                    │  (reenviar) │
                    └─────────────┘
```

**Passos:**
1. Usuário preenche dados pessoais
2. Envia os 3 documentos obrigatórios
3. Sistema marca como "Em análise"
4. Equipe analisa documentos (24-48h)
5. Aprovado → acesso completo / Reprovado → reenviar

## 8. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Labels | Todos os inputs com `<label>` associado |
| Erro | `aria-invalid` e `aria-describedby` |
| Focus | `focus-visible:ring-2 focus-visible:ring-[#d500f9]` |
| Required | `aria-required="true"` |
| Upload | `aria-label` descritivo |
| Modal câmera | Focus trap e `role="dialog"` |

## 9. Critérios de Aceitação

- [ ] Dados pessoais carregam corretamente
- [ ] E-mail exibe status de verificação
- [ ] Telefone permite verificação via modal
- [ ] CEP busca e preenche endereço automaticamente
- [ ] Validação inline em todos os campos
- [ ] Upload aceita formatos especificados
- [ ] Preview de arquivos enviados
- [ ] Modal de câmera funciona para selfie
- [ ] Status KYC exibido corretamente
- [ ] Toast de sucesso/erro ao salvar
- [ ] Confirmação ao cancelar com alterações
- [ ] Formulário responsivo em mobile

## 10. Notas Técnicas

- Usar `react-hook-form` para gerenciamento de formulário
- Validação com `zod` schema
- Compressão de imagens antes do upload (max 1MB)
- Preview com `URL.createObjectURL()`
- Camera API via `navigator.mediaDevices.getUserMedia()`
- Debounce de 500ms na busca de CEP

## 11. Referências Cruzadas

| Documento | Relação |
|-----------|---------|
| [07-layout.md](./07-layout.md) | Layout pai com sidebar |
| [03-auth-context.md](./03-auth-context.md) | Dados do usuário |
| [css_padrão.md](../css_padrão.md) | Design tokens |
| [SPEC/10-profile.md](../SPEC/10-profile.md) | Especificação técnica |
