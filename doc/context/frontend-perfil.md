---
Descrição: Página Privada /perfil
---

# Página `/perfil`

- Arquivo: `src/app/(protected)/perfil/page.tsx`
- Objetivo: Página de perfil do usuário, exibe os dados do usuário logado.


** inputs (completos) **

- investor ou fundador ou afiliado
  - Dados Pessoais
    - nome completo
    - apelido/nome social (opcional)
    - genero (Masculino, Feminino, Outro)
    - data de nascimento
    - nacionalidade (ex.: BR, AR, US)
    - naturalidade (cidade/estado de nascimento) (opcional)
    - estado civil (opcional)
  - Contato
    - email
    - telefone (com DDI/DDD)
  - Endereço
    - cep
    - endereco (logradouro)
    - numero
    - complemento (opcional)
    - bairro
    - cidade
    - uf (estado/província)
    - pais
  - Documento de Identificação
    - tipoDeDocumento (checkbox múltipla escolha: CPF, RG, DNI, Passport)
    - numeroDocumento (conforme tipo)
    - orgaoEmissor (para RG, opcional)
    - ufDocumento (para RG, opcional)
    - dataEmissaoDocumento (opcional)
    - arquivoDocumento (upload: PDF/IMG)
  - Biometria e Avatar
    - iselfBio (captura via webcam)
    - avatar (upload de imagem)
  - Startups (somente `role = fundador`)
    - tabela de startups (id, fantasia, cnpj)
    - ações: adicionar (modal), editar (navega /startup/:id), deletar (modal confirmação)


** atenção **
- o campo 'Documento' deve suar o componente `FileUpload`, utilizando o 'npx shadcn@latest add https://originui.com/r/comp-545.json'
- o campo 'IselfBio' deve suar o componente `WebcamCapture`, deve ser um botão que abrira um modal para capturar a foto via webcam
- o campo 'Tipo de documento' deve ser um checkbox com as opções (CPF, RG, DNI ou Passport)
- o campo 'Gênero' deve ser um select com as opções (Masculino, Feminino, Outro)
- o campo 'avatar' deve ser um upload de imagem utilizando 'npx shadcn@latest add https://originui.com/r/comp-543.json'
- o campo 'startup' deve ser um tabela contendo as startups relacionadas ao usuario, contendo as colunas (id, fantasia, cnpj, botão de ação (editar e deletar))
- o campo 'startup' deve aparecer se a role do usuario for 'fundador'
- o campo 'startup' deve ter um botão de adicionar startup que abre um modal para adicionar uma startup, esse modal deve conter os campos (fantasia, cnpj)
- o campo 'startup' deve ter um botão de editar startup que redireciona para a rota /startup/:id
- o campo 'startup' deve ter um botão de deletar startup que abre um modal de confirmação

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
