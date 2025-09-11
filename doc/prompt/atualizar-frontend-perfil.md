---
description: Prompt para atualizar doc/context/frontend-perfil.md com base em Clean Architecture, Adapter, RHF+Zod, remask e requisitos de UX/UI.
---

# Discussão Técnica (Engenheiro de Software × Dev Sênior Next.js/UX-UI)

- Engenheiro de Software:
  - Precisamos de um prompt que garanta atualização consistente do arquivo `doc/context/frontend-perfil.md` seguindo os padrões do projeto: Clean Architecture, Adapter, respostas `{ status, message, data }`, formulários com RHF + Zod, máscaras com remask e componentes shadcn. O prompt deve exigir mapeamento entre `PerfilUsuario` e os inputs, incluir validações, máscaras, adapter, DTO, mapper, casos de uso e exemplos de API. Também devemos detalhar o componente iSelfBio (modal de captura facial) com requisitos técnicos e UX.
  - Além disso, o prompt precisa orientar sobre acessibilidade, i18n, responsividade, e regras de privacidade/segurança para biometria.

- Dev Sênior Next.js/UX-UI:
  - Concordo. Vamos incluir instruções para manter títulos/seções, melhorar semântica, padronizar listas e blocos de código (TypeScript). O prompt deve exigir: 
    - Atualização do frontmatter.
    - Seções “Payload de Perfil (API)”, “Inputs (completos)”, “Mapeamento PerfilUsuario → Campos do Formulário”, “Validações (Zod)”, “Máscaras e componentes”, “Componente iSelfBio (Modal de Captura Facial)”, “Camada de Aplicação e Adapter”, “Casos de Uso”, “Contrato da API (Server Routes)”, “Exemplos de Request/Response”, “Tratamento de Erros & Regras”, “Components”, “Uso na página”, “Discussão Técnica”, “Plano de Ação”, “Especificação Detalhada”, “Lógica Principal e Fluxos”, “Integração com API”, “Decisões de Implementação”, “Testes Recomendados”, “Roteiro de Implementação”.
    - Incluir exemplos TS/TSX com imports no topo quando aplicável, e observar o padrão do repositório.
    - Garantir que campos com máscaras usem handlers de `src/lib/mask-utils.ts` e que uploads usem componentes shadcn (comp-543/545). 
    - Para iSelfBio, detalhar getUserMedia, fallback mobile, encerramento de streams e acessibilidade do modal.
  - Também proponho que o prompt peça verificação de consistência com `doc/documentação/index.md` (padrão de resposta) e com a arquitetura já descrita.

- Engenheiro de Software:
  - Excelente. Vamos fechar com critérios de aceite (consistência, completude, exemplos válidos) e um checklist de revisão.

---

# Prompt — Atualizar `doc/context/frontend-perfil.md`

Você é um Engenheiro(a) de Software Sênior especialista em Next.js 15 (App Router), React 19, TypeScript, UX/UI e Clean Architecture. Sua tarefa é ATUALIZAR o arquivo `doc/context/frontend-perfil.md` do projeto iSelfToken para torná-lo a referência oficial de validação e gerenciamento do perfil do usuário.

Siga estritamente estas diretrizes:

1) Contexto e Padrões do Projeto
- Baseie-se no conteúdo ATUAL do arquivo `doc/context/frontend-perfil.md` (considerar todas as seções já existentes) e refine-o.
- Mantenha a arquitetura: Clean Architecture com Adapter, DTO, Mapper e Casos de Uso.
- Padrão de resposta de API: sempre `{ status, message, data }` (conferir `doc/documentação/index.md`).
- Formulários com React Hook Form (RHF) + Zod.
- Máscaras com remask via utilitários `src/lib/mask-utils.ts` (`createPhoneHandler`, `createCepHandler`, etc.).
- Componentes de UI inspirados em shadcn; uploads usando comp-543 (avatar) e comp-545 (documento).
- i18n, acessibilidade (ARIA, foco, ESC), responsividade e tema (dark/light) devem ser considerados.

2) Seções Obrigatórias
Garanta que o documento contenha, no mínimo, as seções a seguir (em ordem lógica, mantendo títulos em PT-BR):
- Frontmatter `description` e título `# Página /perfil`.
- Payload de Perfil (API) — interface TypeScript `PerfilUsuario` completa.
- Inputs (completos) — lista por domínio (Dados Pessoais, Contato, Endereço, Documento, Biometria e Avatar, Startups para fundador).
- Mapeamento PerfilUsuario → Campos do Formulário — mapeie cada campo da interface para o input correspondente, com observações de máscara, validação, leitura/somente leitura.
- Validações (Zod) — schema `perfilSchema` e tipo `PerfilFormValues`.
- Máscaras e componentes sugeridos — telefone, CEP, avatar (comp-543), documento (comp-545), iSelfBio.
- Componente iSelfBio (Modal de Captura Facial) — objetivo, fluxo UX, requisitos técnicos (`getUserMedia`, facingMode, canvas), fallback mobile, contrato de props, exemplo de uso (TSX), integração com adapter/API, validação, segurança/privacidade.
- Camada de Aplicação e Adapter (Clean Architecture) — contrato do adapter, DTOs, mapper, casos de uso (get/update), contrato de server routes (GET/PUT), exemplos de request/response.
- Components — lista e caminhos dos componentes (perfil-resumo, tabela-startups-do-usuario, etc.).
- Uso na página `page.tsx` — orientação para fetch server-side e renderização condicional por role.
- Discussão Técnica (Dev Frontend Sênior × Arquiteto de Soluções) e Conclusões.
- Plano de Ação; Especificação Detalhada (modelo `frontend-register.md`).
- Lógica Principal e Fluxos; Integração com API; Decisões de Implementação.
- Testes Recomendados (TDD); Roteiro de Implementação.

3) Regras de Conteúdo
- Linguagem: português brasileiro, objetiva e técnica.
- Código em TypeScript/TSX quando apropriado, com imports no topo.
- Padronize acentuação, listas, títulos e blocos de código.
- Respeite nomes dos arquivos/pastas citados e mantenha referências corretas (ex.: `src/lib/mask-utils.ts`).
- Evite trechos excessivamente longos; privilegie exemplos representativos e modulares.

4) UX/UI e Acessibilidade
- Defina recomendações de UX: estados de loading, sucesso/erro (toast), mensagens de feedback.
- Acessibilidade: labels/aria, foco ao abrir modal, fechar com ESC, navegação por teclado.
- Responsividade: layouts adaptados a mobile/desktop.

5) Integração e Segurança
- Uploads devem retornar URLs persistidas (não salve base64 no localStorage).
- Para iSelfBio, detalhe consentimento do usuário, encerramento de streams e limites de tamanho.
- Campos sensíveis e somente leitura (ex.: `email`, `role`) devem ser sinalizados.

6) Critérios de Aceite
- Documento completo, coerente e alinhado ao padrão `{ status, message, data }`.
- Exemplos TS/TSX compiláveis (salvo dependências do projeto).
- Mapeamento campo→input claro, com validações e máscaras documentadas.
- Seções de Adapter/DTO/Mapper/Use-Case e exemplos de API presentes.
- Seção de iSelfBio com fluxo, contrato e exemplo.

7) Checklist Final (para o próprio gerador)
- [ ] Frontmatter padronizado
- [ ] Interface `PerfilUsuario` revisada
- [ ] Inputs + Mapeamento completos
- [ ] Zod + RHF alinhados
- [ ] Máscaras + shadcn + remask referenciados
- [ ] iSelfBio detalhado
- [ ] Adapter/DTO/Mapper/Use-Case presentes
- [ ] Exemplos API `{ status, message, data }`
- [ ] Componentes e uso na página
- [ ] Testes/TDD e roteiro de implementação

Saída esperada: sobrescreva o conteúdo de `doc/context/frontend-perfil.md` com a versão revisada e completa, mantendo as seções listadas e adicionando as melhorias necessárias. Não remova informações relevantes já existentes; apenas normalize, complete e aperfeiçoe.
