# Fluxo De Startup

Este documento descreve como é o fluxo de uma startup na plataforma iSelfToken, da reserva de tokens à abertura de novas rodadas.

**Ordem do fluxo (visão geral):**

```
1. Cadastro + Reserva → 2. Edição do Cadastro → 3. Detalhes de Captação → 4. Pendências e Serviços
→ 5. Aprovação do Compliance (progressiva, por etapa — seção 4B) → 6. Início de Captação → 7. Conclusão de Captação (processamento ∼7 dias + decisão prorrogar/finalizar) → 8. Recebimento (parcelas mín. 12 + relatório + comprovante) → 9. Nova Rodada
```

---

## 1. Cadastro + Reserva de Token

**Descrição:** Etapa de cadastro inicial + pagamento da reserva de token. O usuário preenche o wizard de 3 etapas (Identidade, Dados Bancários, Captação & Valuation). Ao submeter, o backend grava a `Startup` **diretamente na tabela principal `startups`** com o status de ciclo de vida `PENDING_RESERVATION_PAYMENT` (ou `DRAFT_PAYMENT_PENDING`), cria o checkout (`Payment` `TOKEN_RESERVATION` `PENDING`) na mesma transação e redireciona para o pagamento; a campanha (detalhes de captação) é criada separadamente, na seção 3.

**Rota:** `/founder/startups/new`

**Form — cadastro:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| cnpj          | CNPJ                       | Texto            | Formato alfanumérico (XX.XXX.XXX/XXXX-YY) + validação DV |
| nomeFantasia  | Nome da startup (fantasia) | Texto            | Mín 2 caracteres |
| razaoSocial   | Razão social               | Texto            | Mín 3 caracteres |
| dataAbertura  | Data de abertura           | Texto            | Mín 4 caracteres (ano ou data completa) |
| paisIso3      | País sede                  | Select           | ISO3 (3 caracteres, default BRA) |
| categoryId    | Categoria                  | Select (cascata) | ID numérico (obrigatório) |
| areaAtuacaoId | Área de atuação            | Select (cascata) | ID numérico (obrigatório) |
| estagio       | Estágio da startup         | Select           | Enum: ideacao, mvp, operacao, tracao, escala |
| descricao     | Descrição do projeto       | Textarea         | 3 a 1000 caracteres |
| logo          | Logo (JPG ou PNG)          | File upload      | Max 5MB, JPEG/PNG |
| pitchDeck     | Pitch Deck (PDF)           | File upload      | Max 15MB, PDF |
| videoPitch    | Link do YouTube Pitch      | URL              | Opcional |
| website       | Link do site               | URL              | Opcional |
| linkedin      | Redes sociais (LinkedIn)   | URL              | Opcional |
| titular       | Nome do titular da conta   | Texto            | Mín 3 caracteres |
| banco         | Banco                      | Select           | Lista de 46 bancos (Nubank, Inter, Itaú, etc.) |
| agencia       | Agência                    | Texto            | Mín 1 caractere, numérico |
| conta         | Número da conta            | Texto            | Mín 1 caractere, numérico |
| digito        | Dígito                     | Texto            | Mín 1 caractere, numérico |
| tipoConta     | Tipo de conta              | Select           | Corrente (default) ou Poupança |

**Form — reserva de token:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| metaCaptacao         | Valor total que deseja levantar         | Texto (formatado R$) | Intervalo `minCampaign`–`maxCampaign` (limite CVM) — definido pelo admin |
| equityOferecido      | Equity que está disposto a oferecer (%) | Texto                | Faixa `equityMin`–`equityMax` — definida pelo admin |
| currency             | Moeda da captação                       | Select               | Real (R$) - disabled |
| wantsFastTrackReview | Desejo Avaliação Rápida (Fast Track)    | Checkbox             | Adicional de `fastTrackFee` — definido pelo admin |

**Origem dos limites e valores (configuração administrativa):**
- **Limites de captação** (`minCampaign`/`maxCampaign`), **faixa de equity** (`equityMin`/`equityMax`), **valor do Fast Track** (`fastTrackFee`), **preço do token base** (`tokenPrice`) e **valor do token de reserva** (`authFeePerToken`) são **definidos pelo Admin na página de configuração** e carregados pelo wizard — o frontend não os fixa em código.
- **Mapeamento de chaves**: os nomes de campos do Prisma (`tokenPrice`, `authFeePerToken`, etc.) são nomes de modelo. As chaves de configuração do admin são diferentes (ver `PRD_CONFIG_TAXAS_VALORES.md`): `token.salePrice`, `token.reservePrice`, `token.basePrice`, `campaign.minTarget`, `campaign.maxTarget`, `campaign.equityMin`, `campaign.equityMax`, `token.fastTrackFee`, `affiliate.commissionOptions`. Os valores da configuração são mapeados para os campos do modelo na criação da campanha.
- O preço do token base é `tokenPrice` (default R$ 200,00) e o valor do token de reserva é `authFeePerToken` (default R$ 1,00 por token).
- O wizard busca os valores operacionais em `/api/config/fundraising` (via `prefetchNewStartupData` + `founderFundraisingConfigQueryOptions`); a escrita fica em `/api/admin/config/fundraising` (guard de ADMIN), com fallback para valores default caso o admin não tenha configurado.
- O valor total da reserva de tokens é calculado: `totalTokens × authFeePerToken` (taxa por token definida pelo admin).

**Regras:**
- O CNPJ é validado com cálculo de DV1/DV2 conforme IN RFB 2.229/2024
- A categoria e área de atuação têm validação cruzada (a área deve pertencer à categoria)
- Auto-save de rascunho no backend (debounce de 3s + imediato ao mudar de etapa), vinculado ao `userId` do founder — ver subseção "Auto-save e persistência de rascunho"
- Botão "Buscar CNPJ" preenche automaticamente razão social, nome fantasia e ano de fundação via API da Receita Federal
- O wizard nunca valida/cobra valores fixos: limites, faixas e taxas vêm da configuração administrativa
- Ao submeter, o backend cria a `Startup` (status `PENDING_RESERVATION_PAYMENT`) + `Payment` (TOKEN_RESERVATION, PENDING) em **uma única transação** e redireciona para `/checkout/payment/:id`; se o checkout for abandonado ou expirar, o founder retoma pela **Central de Pendências** (seção 4) — ver subseção abaixo

**Detalhes:**
- Componente: `NewStartupWizard` (`app/components/founder/new-startup-wizard.tsx`)
- Schema: `createNewStartupSchema` (`app/lib/new-startup-schema.ts`)
- Loader: `prefetchNewStartupData` (prefetch países, categorias, config financeira via `/api/config/fundraising`)
- Config: `founderFundraisingConfigQueryOptions` (`app/lib/queries.ts`) e `DEFAULT_FOUNDER_FUNDRAISING_CONFIG`
- Submit: `fetch("/api/payment/startup-checkout")` (BFF `payment.startup-checkout.ts`) → backend `POST /payment/checkout-draft` (`createStartupCheckout`), que cria a `Startup` (status `PENDING_RESERVATION_PAYMENT`) + `Payment` (TOKEN_RESERVATION, PENDING) na mesma transação e navega para `/checkout/payment/:paymentId`
- Auto-save: `useAutoSaveDraft` + `loadDraft`/`deleteDraft` (`app/lib/use-auto-save-draft.ts`) via BFF `/api/startup/draft` → backend `StartupDraftService` (Map in-memory por `userId`)

**Notificações ao concluir a Etapa 1 (cadastro + Reserva):**
- Ao finalizar a Etapa 1 (e após confirmação do pagamento da reserva, quando aplicável), o sistema dispara **3 notificações** (padrão geral da seção 2):
  1. **Conclusão:** parabeniza e informa que a startup foi **criada e reservada com sucesso** (status `PENDING_RESERVATION_PAYMENT`).
  2. **Próximos passos:** "Complete seu cadastro para publicar a captação" com CTA "Concluir Cadastro" → `/founder/startups/:id/edit`; a **Etapa 2** é liberada **após a confirmação do pagamento da reserva**.
  3. **Pendência financeira:** avisa que a **reserva do token está pendente de pagamento** (prazo do Pix 24h), com acesso pelo **card no `/founder/dashboard` → `/founder/pendencias`** e link direto ao `/checkout/payment/:id`; se expirar, orienta a **"Gerar Novo Pagamento"** (rascunho/startup não é deletada) para retomar sem refazer o wizard (item 4 acima).
- **Quando o usuário efetua o pagamento (status `PAID`), dispara uma notificação específica parabenizando o pagamento** (ex.: "Pagamento confirmado! Sua reserva de token foi concluída com sucesso") — distinta da notificação de conclusão da etapa; a partir dela, o próximo passo (CTA "Concluir Cadastro") fica liberado.
- Sistema de notificações: TanStack Query (`notifications` table + frontend polling)
- As notificações aparecem no centro de notificações (`/notifications`) e podem ser marcadas como lidas

**Estratégia de persistência (abordagem recomendada — startup direto na tabela principal):**

O rascunho do wizard e a startup **pendente de pagamento** são tratados em camadas separadas:

1. **Auto-save do wizard (pré-submit) — `POST /api/startup/draft`:**
   - `useAutoSaveDraft` (`app/lib/use-auto-save-draft.ts`) salva com debounce de 3s a cada mudança de campo e imediatamente ao mudar de etapa (`saveOnStepChange`); desativado durante o submit.
   - BFF `app/routes/api/startup.draft.ts` → backend `POST /startup/draft` (`startup.controller.ts`) → `StartupDraftService` (`backendnode/src/api/startup/service/startup-draft.service.ts`) — **Map in-memory por `userId`** (`Map<userId, { data, updatedAt }>`), sem linha no banco e sem status.
   - Restauração: `loadDraft()` no mount do wizard (`GET /api/startup/draft`) recupera dados + etapa com toast "Rascunho restaurado"; `deleteDraft()` remove após submit bem-sucedido.

2. **Submit (checkout) — a `Startup` nasce direto na tabela principal `startups` — `POST /api/payment/startup-checkout` → backend `POST /payment/checkout-draft`:**
   - Ao submeter, cria em **uma transação**: `Startup` (status `PENDING_RESERVATION_PAYMENT`) + `Payment` (purpose `TOKEN_RESERVATION`, status `PENDING`, `expiresAt` = now + 24h).
   - O founder é redirecionado para `/checkout/payment/:id`.
   - Duplicidade por CNPJ é validada contra startups existentes.
   - Detalhes de captação/campanha **não** fazem parte do checkout (seção 3).

3. **Abandono/retomada do checkout:**
   - `NextActionService` resolve startup `PENDING_RESERVATION_PAYMENT` + Payment PENDING como `PAGAR_RESERVA` → `/checkout/payment/${payment.id}` (`next-action.service.ts:41-53`) — permite voltar ao checkout abandonado.
   - A startup permanece **no banco** com status `PENDING_RESERVATION_PAYMENT`; nenhum dado é perdido.

4. **Expiração em dois níveis (Pix / Rascunho):**
   - **QR Code/PIX no checkout (24h):** quando o QR/Pix expira, a cobrança muda de `PENDING` → `EXPIRED` (o enum `PaymentStatus` precisa do valor `EXPIRED`).
   - **Rascunho não é deletado** no vencimento da cobrança. Na Central de Pendências (seção 4), o botão da startup muda para **"Gerar Novo Pagamento"** — recria a cobrança (Payment) sem o founder reescrever o wizard.
   - **Limpeza de rascunho inativo (30 dias):** cron/worker verifica startups em `PENDING_RESERVATION_PAYMENT` há mais de 30 dias sem pagamento concluído e altera o status para `EXPIRED`/`ARCHIVED` (ou remove, liberando espaço).
   - **Benefício:** o founder tem tempo para tirar dúvidas com o suporte da iSelfToken, organizar a conta da empresa e retornar para pagar o checkout **sem perder os dados preenchidos**.

---

## 2. Edição e Finalização do Cadastro da Startup

**Descrição:** Após o pagamento da reserva, o founder pode editar e completar o cadastro da startup através de um layout com múltiplas abas (Identidade, Localização, Bancário, Documentos, etc.). Esta etapa é obrigatória antes da aprovação do Compliance.

**Rota:** `/founder/startups/:id/edit`

**Form — identidade (aba 1):**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| razaoSocial | Razão social | Texto | Mín 3 caracteres |
| nomeFantasia | Nome fantasia | Texto | Mín 2 caracteres |
| cnpj | CNPJ | Texto | Formato alfanumérico (XX.XXX.XXX/XXXX-YY) |
| dataAbertura | Data de abertura | Texto | Mín 4 caracteres |
| paisIso3 | País | Select | ISO3 (3 caracteres) |
| categoryId | Categoria | Select (cascata) | ID numérico |
| areaAtuacaoId | Área de atuação | Select (cascata) | ID numérico |
| estagio | Estágio | Select | Enum: ideacao, mvp, operacao, tracao, escala |
| descricao | Descrição | Textarea | 3 a 1000 caracteres |
| logo | Logo | File upload | Max 5MB, JPEG/PNG |
| pitchDeck | Pitch Deck | File upload | Max 15MB, PDF |
| videoPitch | Link YouTube | URL | Opcional |
| website | Site | URL | Opcional |
| linkedin | LinkedIn | URL | Opcional |

**Form — localização (aba 2):**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| cep | CEP | Texto | Formato 00000-000 |
| logradouro | Logradouro | Texto | Mín 2 caracteres |
| numero | Número | Texto | Mín 1 caractere |
| complemento | Complemento | Texto | Opcional |
| bairro | Bairro | Texto | Mín 2 caracteres |
| cidade | Cidade | Texto | Mín 2 caracteres |
| uf | UF | Texto | 2 letras |

**Form — bancário (aba 3):**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| titular | Nome do titular | Texto | Mín 3 caracteres |
| banco | Banco | Select | Lista de 46 bancos |
| agencia | Agência | Texto | Mín 1 caractere, numérico |
| conta | Conta | Texto | Mín 1 caractere, numérico |
| digito | Dígito | Texto | Mín 1 caractere, numérico |
| tipoConta | Tipo de conta | Select | Corrente ou Poupança |

**Form — documentos (aba 4):**

**Rota:** `/founder/startups/:id/edit/documentos`

**Documentos obrigatórios:**
- `MIE` — Material Informativo Essencial (plano de negócios, riscos e uso dos recursos)
- `CONTRATO_SOCIAL` — Contrato Social / Estatuto (última versão consolidada e registrada)
- `CNPJ` — Cartão CNPJ
- `BALANCO_ATUAL` — Balanço do exercício atual (DRE + BP do último exercício)
- `DECLARACAO_VERACIDADE` — Declaração de Veracidade (assinada pelos administradores)
- `ATA_ELEICAO` — Ata de Eleição (administradores atuais)

**Documentos condicionais:**
- `BALANCO_ANTERIOR` — Balanço do exercício anterior (se a empresa tiver mais de 1 ano)
- `PROCURACAO` — Procuração (se o signatário não for administrador formalmente eleito)
- `CV_SOCIOS` — Histórico / CV dos sócios

**Documentos recomendados:**
- `PITCH_DECK` — Pitch Deck
- `PROJECOES` — Projeções financeiras
- `MODELO_CONTRATO_OFERTA` — Modelo do contrato da oferta
- `COMPROVANTE_ENDERECO` — Comprovante de endereço da pessoa jurídica dos últimos 90 dias
- `DECLARACAO_RECEITA` — Declaração de receita anual para confirmar enquadramento até R$ 15 milhões/ano

**Plataforma e outros:**
- `TERMO_PLATAFORMA` — Termo de adesão à plataforma
- `OUTRO` — Outros documentos (permite múltiplos arquivos)

**Termo de Adesão Digital:**
- O Termo de Adesão Digital faz parte desta aba, mas não é upload manual.
- O documento deve ser gerado a partir do modelo vigente publicado pelo administrador.
- O founder/dono da startup deve abrir e ler o documento completo antes de poder aceitar e assinar.
- O checkbox de aceite/assinatura só deve ser liberado depois que a leitura do documento for registrada.
- Ao marcar o checkbox e salvar, o sistema deve gerar o PDF personalizado e assiná-lo digitalmente.
- O PDF deve conter, no mínimo, o nome do usuário, o documento de identificação do usuário, o nome da startup e o CNPJ da startup.
- O documento deve ser assinado com o certificado digital individual do usuário. **O certificado de assinatura avançada só é gerado após o Compliance aprovar os documentos do usuário** — assim que aprovados, um serviço é disparado para gerar e salvar o certificado desse tipo de assinatura (ver "Armazenamento do certificado (híbrido)" abaixo).
- O selo da assinatura deve exibir o nome do usuário, o documento de identificação, a data e a hora da assinatura.
- Após a assinatura, a tela deve informar que o termo foi assinado e disponibilizar a opção de download.
- O PDF assinado deve ser armazenado no S3/RustFS, no armazenamento de documentos, e vinculado ao usuário e à startup.
- O PDF assinado e a versão do modelo utilizada devem permanecer imutáveis para preservar o histórico da assinatura.

**Mecânica de leitura obrigatória, geração dinâmica e selo (resumo):**
- **Leitura obrigatória:** o aceite só é liberado após a confirmação de rolagem/leitura do documento gerado a partir do template admin.
- **Geração dinâmica e imutabilidade:** as variáveis (`{{usuario.nome}}`, `{{startup.cnpj}}`, etc.) são injetadas em tempo real. Ao assinar, o PDF gerado é armazenado em storage imutável (S3/RustFS) junto ao hash/serial da assinatura.
- **Selo visível de assinatura:** o PDF resultante ganha um carimbo digital com Nome, Documento, Data, Hora e Hash do Certificado/Sessão.

**Armazenamento do certificado (abordagem híbrida — banco + storage):**

A chave privada/certificado **não** fica no banco de dados relacional (evita vazamento em dump/backup e não ocupa espaço no banco):

- O certificado gerado (`.p12` / `.pfx` / `.pem`) é armazenado no **storage em bucket privado/protegido** (ex.: `s3://iselftoken-certificates/users/:userId/cert.pfx`), criptografado com **chave mestre KMS (Envelope Encryption)** ou frase secreta.
- No banco (tabela `user_certificates` ou campos em `users`) ficam apenas **metadados não sensíveis** para consulta rápida:

| Campo | Descrição |
| --- | --- |
| `serial_number` | Número de série do certificado |
| `certificate_url` | URL íntegra e autenticada para download do certificado |
| `status` | Enum `PENDING_GENERATION`, `ACTIVE`, `REVOKED`, `EXPIRED` |
| `issued_at` | Data/hora de emissão |
| `expires_at` | Data de validade |
| `thumbprint` / `hash` | Fingerprint SHA-256 do certificado público |

**Editor administrativo exclusivo:**
- Deve existir uma página exclusiva para o administrador editar somente o modelo do Termo de Adesão Digital.
- O editor deve permitir texto formatado e inserção das variáveis autorizadas para preenchimento automático.
- As variáveis devem ser apresentadas em um catálogo do editor; não devem depender de texto livre ou de campos desconhecidos.
- **Versionamento explícito no painel Admin:** o editor exibe a versão vigente do modelo (ex.: `v1.1`). Ao alterar e publicar o texto, uma **nova versão é criada** (ex.: `v1.2`); os **termos já assinados permanecem vinculados à versão em que foram assinados** (ex.: `v1.1`), garantindo segurança jurídica e histórico imutável das assinaturas.
- A versão publicada do modelo será utilizada nas novas gerações; termos já assinados não devem ser alterados.

**Variáveis de preenchimento automático:**
- `{{usuario.nome}}` — nome completo do usuário/signatário.
- `{{usuario.documento}}` — documento de identificação do usuário/signatário.
- `{{startup.nome}}` — nome da startup.
- `{{startup.razao_social}}` — razão social da startup.
- `{{startup.cnpj}}` — CNPJ da startup.
- `{{assinatura.nome}}` — nome exibido no selo da assinatura.
- `{{assinatura.documento}}` — documento exibido no selo da assinatura.
- `{{assinatura.data}}` — data da assinatura.
- `{{assinatura.hora}}` — hora da assinatura.
- `{{assinatura.serial_certificado}}` — serial do certificado utilizado, quando aplicável.
- `{{termo.versao}}` — versão do modelo utilizado na geração.

**Regra de não aplicação:**
- Todos os documentos listados devem disponibilizar a opção "Não se aplica".
- Quando a startup não possuir ou não precisar apresentar um documento, o founder deve selecionar explicitamente "Não se aplica" para aquela categoria.
- Ao selecionar "Não se aplica" em um documento (ex.: `BALANCO_ANTERIOR` para empresas com menos de 1 ano), o founder deve preencher um **campo de texto obrigatório** — pergunta: **"Por que este documento não se aplica à sua startup?"** Sem justificativa, a seleção não é aceita.
- Objetivo da justificativa: evitar que o founder marque "Não se aplica" **por engano ou descaso**, facilitando a análise do Compliance. A resposta é revisada pelo Compliance (só libera a categoria quando a justificativa for aceita).
- A marcação "Não se aplica" e a justificativa devem ser registradas separadamente de um documento enviado e ficar visíveis para a análise do Compliance.

**Validação atual do frontend:**
- Arquivo PDF, MIME `application/pdf`, limite local de 50 MB por arquivo.
- Um arquivo por categoria nomeada; `OUTRO` aceita vários documentos.
- **Ponto de melhoria (UI/UX):** a opção "Não se aplica" deve estar disponível para **todos os documentos** (hoje está liberada apenas para Balanço atual e Ata de Eleição); ao selecioná-la, o founder deve preencher a **justificativa obrigatória** (ver regra acima) antes de salvar o estado.
- **Ponto de melhoria (UI/UX):** adicionar **indicador de progresso de upload (progress bar)** e **status de upload** por documento — enquanto o status for `PENDING_REVIEW` (ou antes do envio formal), exibir opções de **substituir** ou **excluir** o arquivo enviado.
- O upload ocorre imediatamente após a seleção; a aba não possui envio único.

**Form — captação (aba 5):** ver seção 3.

**Regras:**
- Layout com abas laterais de navegação (Identidade, Localização, Bancário, Documentos, Captação, Time, Termos)
- Auto-save por seção ao clicar em "Salvar" em cada aba
- Context compartilhado entre abas via `EditStartupFormProvider`
- Status de cada seção (filled/dirty) exibido visualmente (ícones indicando preenchimento)
- Dados carregados via loader do layout (`/api/startups/:id`)
- **Progresso visual:** Cada aba mostra se está completa (ícone de check) ou pendente
- **Cadastro completo:** Identidade, Localização, Bancário, Documentos (seção 2) e Captação (seção 3) precisam estar preenchidos; todos os documentos enviados precisam estar aprovados pelo Compliance ou com a opção "Não se aplica" aceita pelo Compliance; o Termo de Adesão Digital precisa estar lido, aceito e assinado.
- Quando o cadastro estiver completo, a startup muda para `AWAITING_COMPLIANCE_FEE` e a **Central de Pendências** (seção 4) habilita a Taxa de Compliance.
- No modelo atual, a análise dos documentos ocorre na **Etapa 2** como auditoria (antes do pagamento da Taxa de Compliance, que é a Etapa 4). A transição entre etapas é automática via pagamento `PAID` (seção 4B).
- A **submissão final** da startup ao gate final de aprovação (seção 5) só acontece depois que a Taxa de Compliance estiver com status `PAID`.
- O founder pode editar seções individualmente sem precisar preencher tudo de uma vez.

**Documentos e revisão do Compliance:**
- Todo documento enviado pelo founder, incluindo documentos obrigatórios, condicionais, recomendados e `OUTRO`, inicia com status `PENDING_REVIEW`.
- O Compliance deve analisar cada documento individualmente e marcar `APPROVED` ou `REJECTED`, registrando justificativa quando rejeitar.
- A opção "Não se aplica" também deve ser analisada pelo Compliance; ela só libera a categoria depois de aceita.
- Documento rejeitado retorna ao founder para substituição ou reenvio e volta para `PENDING_REVIEW`.
- Enquanto existir documento pendente ou rejeitado, a startup não pode ser aprovada.

**Detalhes:**
- Layout: `EditStartupLayout` (`app/routes/private/edit-startup-layout.tsx`)
- Components: `EditStartupNav`, `EditStartupHeader`, `EditStartupActionBar`
- Context: `EditStartupFormProvider` (`app/lib/edit-startup-form-context.tsx`)
- Tabs: identidade, localização, bancário, documentos, captação, time, termos

**Seções obrigatórias para aprovação:**
- Identidade (dados da empresa)
- Localização (endereço completo)
- Bancário (dados bancários)
- Documentos (uploads aprovados ou opções "Não se aplica" aceitas)
- Captação (detalhes da rodada — ver seção 3)
- Termo de Adesão Digital (leitura, aceite e assinatura concluídos)
- Taxa de Compliance paga (ver seção 4)

**Seções opcionais:**
- Time (informações sobre sócios e equipe)
- Serviços extras, como Aprovação Rápida, quando não contratados

**Notificações ao concluir cada etapa (padrão geral):**
- **Sempre que o founder finaliza um tópico/etapa**, o sistema dispara, **no final da etapa**, notificações informando **o que aconteceu agora** e **quais são os próximos passos**. O detalhamento por etapa fica no final de cada seção (ex.: Etapa 1 na seção 1).
- **Pagamento confirmado em qualquer etapa:** quando o usuário efetua um pagamento (status `PAID`), dispara uma **notificação específica parabenizando o pagamento** (ex.: "Pagamento confirmado! ..."), distinta das demais; só a partir dela o próximo passo é liberado.
- Exemplo — final da **Etapa 2** (cadastro + documentos + termo), 3 notificações:
  1. **Conclusão:** parabeniza pela conclusão da etapa.
  2. **Próximos passos:** informa que o Compliance fará uma **correitoria/análise dos documentos enviados**; qualquer alteração nas análises gera uma **nova notificação/mensagem** para o founder.
  3. **Pendência financeira:** informa que há uma **pendência financeira a ser concluída** (Taxa de Compliance) e **orienta pelos menus da página home** mostrando **onde ele vai encontrar essa taxa** (card no `/founder/dashboard` → `/founder/pendencias`, seção 4). Ao pagá-la, o sistema também dispara a **notificação parabenizando o pagamento** da Taxa de Compliance.
- O padrão se repete ao final de cada etapa do fluxo (seções 1–9), sempre com: (a) notificação de conclusão, (b) notificação de próximos passos, (c) notificação de pendências financeiras (quando houver) e (d) notificação parabenizando o pagamento quando o usuário efetua o pagamento.

---

## 3. Detalhamento de Captação (Campanha)

**Descrição:** Preenchimento detalhado da campanha de captação (tese de negócio, alocação de recursos, dividendos, afiliados). Esta etapa é obrigatória antes de publicar a campanha e faz parte das seções obrigatórias para aprovação do Compliance (Cadastro completo).

**Rota:** `/founder/startups/:id/captacao`

**Form — metas e recursos:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| esperaAlcancar | O que espera alcançar | Textarea | 10 a 2000 caracteres |
| recursosFundador | Alocação para fundadores | Slider + Number (vinculados) | 0-100% |
| recursosDesenvolvimento | Alocação para desenvolvimento | Slider + Number (vinculados) | 0-100% |
| recursosComercial | Alocação para comercial | Slider + Number (vinculados) | 0-100% |
| recursosMarketing | Alocação para marketing | Slider + Number (vinculados) | 0-100% |
| recursosNuvem | Alocação para nuvem/infra | Slider + Number (vinculados) | 0-100% |
| recursosJuridico | Alocação para jurídico | Slider + Number (vinculados) | 0-100% |
| recursosCaixa | Alocação para caixa | Slider + Number (vinculados) | 0-100% |

**3A. Alocação de Recursos — Validação Estrita de 100% (Ponto de Melhoria UX/UI)**

**Regra do negócio:** a soma exata de todas as categorias de alocação de recursos deve resultar em **exatamente 100%**.

**Melhorias de UX/UI:**
- **Sliders vinculados a campos numéricos editáveis:** cada categoria de alocação tem um slider E um campo de input numérico independente — o usuário pode **arrastar o slider ou digitar o valor diretamente no campo numérico**; ambos são sincronizados bidirecionalmente em tempo real.
- **Gráfico de pizza/rosca dinâmico:** exibido em tempo real, atualizando a cada mudança de alocação, mostrando a distribuição entre as categorias.
- **Trava visual no botão "Salvar":** se a soma for diferente de 100% (ex.: 95% ou 105%), o botão **permanece desabilitado**, com **indicador visual do delta** — mostrando quanto falta (restante) ou quanto está excedente.

**Form — tese de negócio:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| problema | Problema que resolve | Textarea | 10 a 2000 caracteres |
| solucao | Solução proposta | Textarea | 10 a 2000 caracteres |
| diferencial | Diferencial competitivo | Textarea | 10 a 2000 caracteres |
| modeloReceita | Modelo de receita | Textarea | 10 a 2000 caracteres |
| mercadoAlvo | Mercado-alvo | Textarea | 10 a 2000 caracteres |
| compradores | Compradores potenciais | Textarea | 10 a 2000 caracteres |
| concorrencia | Concorrência | Textarea | 10 a 2000 caracteres |

**Form — time e dedicação:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| socios | Número de sócios/fundadores | Number | Mín 1 |
| dedicacao | Tempo de dedicação | Texto | Mín 5 caracteres |
| investimentoPrevio | Investimento prévio | Texto | Opcional, max 2000 caracteres |

**Form — dividendos e benefícios:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| ofereceLucros | Oferece participação nos lucros | Checkbox | Obrigatório |
| lucrosDescricao | Descrição da política de lucros | Textarea | Obrigatório se ofereceLucros=true, 10-2000 caracteres |
| ofereceBeneficios | Oferece benefícios adicionais | Checkbox | Obrigatório |
| beneficiosDescricao | Descrição dos benefícios | Textarea | Obrigatório se ofereceBeneficios=true, max 4000 caracteres |

**Form — afiliação:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| aceitaAfiliados | Aceita afiliados | Checkbox | Obrigatório |
| affiliateCommissionPct | Comissão de afiliado | Select | Lista `affiliateCommissionOptions` (padrão: 5%, 10%) — **definida pelo admin na configuração**; o frontend não fixa o valor |

**Regras:**
- A soma das alocações de recursos deve ser exatamente 100%
- Se `ofereceLucros=true`, `lucrosDescricao` é obrigatório (10-2000 caracteres)
- Se `ofereceBeneficios=true`, `beneficiosDescricao` é obrigatório (max 4000 caracteres)
- **A comissão de afiliado é configurada pelo Admin na página de configuração** como uma **lista de opções selecionáveis** (`affiliateCommissionOptions`, padrão `[5, 10]`). O Admin pode **incluir/remover opções** (ex.: adicionar 7,5%; retirar uma existente) — o select do founder é populado sempre com as opções vigentes da configuração, e o aceite do programa de afiliados para a rodada fica vinculado à porcentagem escolhida entre as opções configuradas.
- Campos de texto têm limite de 2000 caracteres (exceto benefícios: 4000)
- Com os detalhes preenchidos, a campanha passa a existir em status `DRAFT` (aguardando início, ver seção 6)

**Estado de Rascunho da Campanha (DRAFT):**
- Ao preencher e **validar todos os dados da captação** (alocação 100%, justificativas de lucros/benefícios), o registro da campanha é **criado/atualizado com o status `DRAFT`**.
- O status `DRAFT` indica que a campanha está **pronta do ponto de vista do founder**, aguardando o **pagamento da Taxa de Compliance** e o **envio para a aprovação final** (tópicos 4 e 5).
- Diferente do status da Startup (que segue o fluxo de aprovação), `DRAFT` refere-se ao registro da **campanha/rodada**: a criação do `DRAFT` não inicia a campanha (início real na seção 6).

**Preview da página de captação (somente founder):**
- A partir das **Etapas 2 e 3**, o founder tem o botão **"Visualizar página de captação"** (rota autenticada com ownership, ex.: `/founder/startups/:id/captacao-preview`).
- **Somente o founder vê essa prévia** — nenhum outro usuário logado, Admin ou visitante acessa; a URL pública (`/s/:slugOrId`) **só passa a existir quando a campanha fica `OPEN`** (seção 6).
- Os blocos da página refletem os dados das Etapas 1–3; campos ainda sem dados aparecem como **empty state/placeholder**. Visibilidade completa: seção 17.5 do `PRD_STARTUP_PUBLICA_PRIVADA.md`.

**Consistência entre Meta da Reserva (Tópico 1) e Oferta (Tópico 3):**
- **Preço do token e valor base:** na **Etapa 1**, a meta de captação e o valor base do token definiram a quantidade de tokens reservados.
- **Cálculo automático read-only:** na **Etapa 3**, o sistema **calcula e exibe automaticamente** para o founder (somente leitura, sem preenchimento manual), conforme a **meta salva e paga na Etapa 1**:

$$\text{Valuation Post-Money} = \frac{\text{Meta de Captação}}{\text{Equity Oferecido (\%)}} \times 100$$

$$\text{Valuation Pre-Money} = \text{Valuation Post-Money} - \text{Meta de Captação}$$

- Essa exibição evita **erros de preenchimento manual** e **divergências nas projeções financeiras** analisadas pelo Compliance.

**Detalhes:**
- Componente: `EditStartupCaptacao` (`app/routes/private/edit-startup-captacao.tsx`)
- Schema: `captaFormSchema` (Zod com validação de alocação 100%)
- Context: `EditStartupFormProvider` compartilhado
- Loader: busca campanha ativa da startup (`/api/startups/:id`)

**Notificações ao concluir a Etapa 3 (detalhes de captação):**
- Ao finalizar a Etapa 3 (campanha em status `DRAFT`), o sistema dispara uma **notificação própria desta etapa**: o founder está **quase pronto para começar a captação** — o **Compliance só precisa validar se a captação está dentro dos padrões da plataforma** (dados de captação coerentes, alocação 100%, faixas configuradas pelo admin, etc.).
- A notificação informa que a validação do Compliance é a última etapa **antes de liberar** o início da captação (em conjunto com a Taxa de Compliance paga — seção 4 — e o gate final — seção 5).

---

## 4. Pendências Financeiras e Serviços Extras (Central de Pendências / Taxas)

**Descrição:** Página **global** do founder (sem `:id` de startup) que concentra as **pendências financeiras** e os **serviços extras** de todas as suas startups — Taxa de Reserva de Token, Taxa de Compliance, Aprovação Rápida (Fast Track) e demais serviços. É a página única onde o founder paga as taxas e contrata/quita os serviços extras; **a antiga página por startup** (`/founder/startups/:id/taxas-servicos`) **foi removida** — os pagamentos passam a ser feitos somente aqui. O acesso é feito por um **card/botão no dashboard** (`/founder/dashboard`) e há também um botão na página que lista as startups. Sempre que existir uma pendência nova **não vista**, aparece um **contador (badge)** no padrão do contador de mensagens/notificações.

**Rota:** `/founder/pendencias` (alternativa considerada: `/founder/billing`)

**Acesso e navegação:**
- **Card/botão no dashboard do founder** (`/founder/dashboard`) leva à `/founder/pendencias`
- A **página que lista as startups** também exibe um botão para acessar a página de pendências
- A página é **global** — não recebe `:id` de startup e não é uma etapa da ordem linear do fluxo (seções 1–9); é uma superfície de trabalho do founder

**Itens exibidos (escopo):**
1. **Startups aguardando pagamento da reserva** — startups com status `PENDING_RESERVATION_PAYMENT` (Taxa de Reserva de Token + Fast Track, se selecionado), com cobrança `PENDING` (Aguardando Pix) ou `EXPIRED`
2. **Pagamentos `PENDING`/`EXPIRED` do usuário** — outras cobranças do founder aguardando pagamento (ex.: selo de verificação, cobranças pendentes de serviços)
3. **Serviços extras pagáveis por startup** — Taxa de Compliance, Aprovação Rápida (Fast Track) e outros serviços extra, agregados por startup, com descrição, valor e ação de "pagar"

**Serviços exibidos:**

| Serviço | Obrigatoriedade | Valor | Status/regra |
| --- | --- | --- | --- |
| Taxa de Compliance | Obrigatória | Definido na página de configuração administrativa | **Gerada automaticamente** assim que o cadastro estiver completo (seções 2 e 3); deve estar `PAID` antes do envio para análise do Compliance |
| Aprovação Rápida (Fast Track) | Opcional | Definido na configuração administrativa | Se foi selecionada e paga na reserva, exibir `PAID`; não cobrar novamente |
| Aprovação Rápida (Fast Track) | Opcional | Definido na configuração administrativa | Se não foi paga na reserva, exibir opção para contratar e pagar (acelera a etapa do Compliance) |
| Outros serviços extras | Opcional | Definido na configuração administrativa | Exibir descrição, valor e opção de contratação |

**Card da reserva de token (modelo):**

| Campo | Exemplo |
| --- | --- |
| Startup | Minha Startup Tech |
| Item | Taxa de Reserva de Token (+ Fast Track, se selecionado) |
| Status | Pagamento Pendente / Aguardando Pix |
| Ação | Botão "Pagar / Retomar Checkout" → `/checkout/payment/:id` |

**Regras (página global de pendências):**
- A lista agrega as pendências de **todas as startups do founder** (a página é por usuário, não por startup)
- Fonte de dados: o dashboard consulta as startups do founder com status `PENDING_RESERVATION_PAYMENT` **ou** que possuam cobranças com status `PENDING` / `EXPIRED`
- Cada item exibe: startup vinculada (nome/logo), descrição, valor, status do pagamento (`PENDING`, `EXPIRED`, `PAID`, `FAILED` ou `CANCELED`) e ação para quitar (checkout)
- **Cobrança ativa** (`PENDING`) → botão "Pagar / Retomar Checkout" leva direto a `/checkout/payment/:id` (status exibido: "Pagamento Pendente / Aguardando Pix")
- **Cobrança expirada** (`EXPIRED`) → o rascunho/startup **não é deletada**; o botão muda para **"Gerar Novo Pagamento"**, recriando a cobrança (Payment) sem o founder reescrever o wizard
- A Taxa de Compliance deve ser carregada da configuração administrativa; o frontend não deve fixar o valor.
- **Assim que o cadastro estiver devidamente preenchido** (seções 2 e 3), a **Taxa de Compliance é gerada automaticamente** para que o Compliance possa trabalhar.
- Se o founder **não aceitou o Fast Track na etapa 1**, aqui aparece a **opção de pagar o Fast Track** para **acelerar a etapa do Compliance**; se ele já pagou (na reserva), exibir como `PAID` e não cobrar novamente.
- A Aprovação Rápida altera prioridade/SLA de análise, mas não dispensa o pagamento da Taxa de Compliance, a revisão dos documentos ou os critérios obrigatórios.
- Serviços extras contratados devem aparecer com status `PENDING`, `PAID`, `FAILED` ou `CANCELED`, conforme o pagamento.
- A aprovação do Compliance fica bloqueada enquanto a Taxa de Compliance não estiver `PAID` ou enquanto houver documento pendente/rejeitado.
- A geração de cobrança e a confirmação do pagamento devem ser **idempotentes** (sem cobrança duplicada — especialmente quando a Aprovação Rápida já foi paga na reserva).
- **Retenção:** startup em `PENDING_RESERVATION_PAYMENT` sem pagamento concluído por 30 dias → cron/worker altera para `EXPIRED`/`ARCHIVED` (seção 1, item 4)

**Fluxo de pagamento:**
1. Cadastro devidamente preenchido (seções 2 e 3) → a **Taxa de Compliance é gerada automaticamente** e fica visível na Central de Pendências (AWAITING_COMPLIANCE_FEE).
2. Founder visualiza a Taxa de Compliance e os serviços extras disponíveis de todas as startups.
3. Founder paga a Taxa de Compliance e, se desejar, contrata a Aprovação Rápida (se não a aceitou na reserva) ou outro serviço — o Fast Track acelera a etapa do Compliance.
4. O dashboard atualiza os status após confirmação do pagamento e dispara a **notificação parabenizando o pagamento** (padrão da seção 2).
5. Taxa de Compliance `PAID` + documentos aprovados/N/A aceitos → startup enviada para `PENDING_APPROVAL` (ver seção 5).
6. Compliance realiza a análise e decide pela aprovação ou rejeição.

**Contador de pendências não vistas ("igual ao de mensagem"):**
- O badge segue o padrão do contador de mensagens/notificações existente (sino no navbar + contagem de não lidas)
- Cada **nova pendência** gera uma **notificação por item** no centro de notificações do usuário
- O usuário **marca a pendência como vista/lida** (reusa o conceito de lida/não lida do centro de notificações); ao zerar, o contador some
- O contador deve recarregar com o polling/query de notificações já existente

**Detalhes planejados:**
- Componentes: card/badge no `FounderDashboard` + lista na página `/founder/pendencias`
- BFF: rota de listagem agregada de pendências e de contagem de não lidas (padrão `notifications.unread-count`)
- Backend: endpoint agregado por `userId` consultando startups `PENDING_RESERVATION_PAYMENT` ou cobranças `PENDING`/`EXPIRED` + serviços extras por startup com checkout; ação "Gerar Novo Pagamento" recria o `Payment` sem refazer o wizard
- O checkout deve reutilizar o fluxo de pagamento existente e identificar cada cobrança pelo serviço contratado
- A configuração administrativa deve permitir alterar o valor da Taxa de Compliance e dos serviços extras sem alteração de código
- A rota e os componentes seguem o padrão do restante do app (frontend feature-based em `app/components/founder/`, queries em `app/lib/queries.ts`)

> **Nota de status:** `AWAITING_COMPLIANCE_FEE` e `PENDING_APPROVAL` são os status previstos no contrato de negócio (CASE.md) para este trecho do fluxo. O enum atual do Prisma (`StartupStatus` em `schema.sqlite.prisma`) ainda usa `RESERVATION_PAID`/`PENDING_CURATOR_REVIEW` para o trajeto de aprovação — a migração de status faz parte da implementação desta etapa.

---

## 4B. Visão Admin/Compliance — Etapas do Fluxo e Liberação Progressiva

**Descrição:** O Admin/Compliance acompanha **cada etapa** do fluxo da startup de forma **progressiva**. Na lista de startups do Admin (`/admin/startups`) cada startup exibe **um botão por etapa** até o **início da captação**. Cada botão leva a uma **página de revisão** (somente leitura) mostrando o que o usuário preencheu naquele estágio + painel de pagamento. Ao aprovar uma etapa, o sistema **registra a validação dos dados** (auditoria/qualidade). A **transição entre etapas é automática** — o próximo passo é liberado para o founder assim que o pagamento da etapa atual é confirmado (`PAID`). O Admin/Compliance também visualiza o botão da próxima etapa.

**Regra de ouro do gate (aprovação):**
- **Só pode liberar o botão "Aprovar" se o usuário tiver feito tudo da etapa e pago** o valor devido.
- A transição para a etapa N+1 é **automática** quando o pagamento da etapa N é confirmado (`PAID`), **independentemente da aprovação** do Admin/Compliance. O Admin/Compliance visualiza a próxima etapa como auditoria, sem ser o gatilho da liberação.

**Botões por etapa na lista de startups do Admin:**

| Botão | Etapa | Condição para liberar próxima etapa |
| --- | --- | --- |
| Etapa 1 — Cadastro + Reserva | Wizard preenchido + Pagamento da reserva (seção 1) | **Automática** — pagamento `PAID` → Etapa 2 liberada para o usuário |
| Etapa 2 — Edição do Cadastro | Seções 2 completas (identidade, localização, bancário, documentos, termo) | **Etapa 1 aprovada + Etapa 2 aprovada** → Etapa 3 — Detalhes de Captação |
| Etapa 3 — Captação | Detalhes de Captação (seção 3, campanha `DRAFT`) | Aprovação → Etapa 4 — Taxas e Serviços |
| Etapa 4 — Taxas e Serviços | Taxa de Compliance `PAID` + serviços (seção 4) | Gate final → `APPROVED` → Início de Captação (seção 6) |

**Página de revisão de cada etapa (visão read-only do Admin/Compliance):**
- Mostra **somente o que o usuário preencheu** naquela etapa (sem edição desta tela).
- **Etapa 1:** exibe os dados como no wizard de "nova startup" (identidade, bancário, captação & valuation) — **sem muita informação extra**.
- **Etapa 3 (parte de captação):** tese de negócio, alocação de recursos, dividendos, benefícios, afiliação.
- **Painel de pagamento na parte de captação/reserva:** mostra **se o usuário pagou ou não**; se foi **gerado um segundo pagamento** (ex.: via "Gerar Novo Pagamento"), indicando se a **primeira cobrança deu erro/expirou**; histórico de status (`PENDING`, `EXPIRED`, `PAID`, `FAILED`, `CANCELED`).
- **Painel de taxas/serviços (Etapa 2 do cadastro e Etapa 4):** o Compliance visualiza **se o usuário pagou a Taxa de Compliance** e **se pagou o Fast Track** (`PENDING`/`PAID`); o Fast Track não aceito na etapa 1 aparece como disponível para o founder pagar nesta etapa (acelerando a análise).
- **Ações:** botão "Aprovar" (habilitado **somente** com etapa completa + paga) e "Rejeitar / Solicitar ajustes" (com justificativa).

**Regras:**
- **Fechar a etapa 1 e liberar a etapa 2** exige: pagamento da reserva **confirmado** (`PAID`). A liberação é **automática** quando o pagamento é confirmado, sem necessidade de aprovação do Admin/Compliance para a transção.
- A aprovação do Admin/Compliance permanece como ação de **auditoria/qualidade** (registra validação dos dados) mas **não bloqueia** o progresso do founder. O founder avança para a próxima etapa assim que o pagamento é confirmado.
- O botão "Aprovar" na visão admin agora registra a validação dos dados sem impedir que o founder avance para a próxima etapa.
- A análise documental acompanha a fase em que o documento pertence (ex.: documentos da seção 2 são revisados na aprovação da Etapa 2).
- O botão "Aprovar" de cada etapa (função de auditoria/qualidade) só é habilitado com **etapa completa + pagamento confirmado** — mas a transção para a próxima etapa é automática via payment PAID (sem dependência de aprovação).

---

## 5. Aprovação do Compliance

**Descrição:** As etapas do fluxo são **progressivas** — cada etapa só avança quando o pagamento correspondente é confirmado (`PAID`). O Admin/Compliance realiza **auditoria/validação** de cada etapa (botão "Aprovar"), mas a **liberação da próxima etapa é automática** via pagamento. Esta seção (5) descreve o **gate final** que libera o início da captação: todas as etapas com pagamento `PAID` + Taxa de Compliance `PAID` + sem documento pendente/rejeitado → decisão final `APPROVED`.

**Rota da decisão:** `/api/compliance/startups/:id/decide` (gate final; cada etapa também tem o botão de aprovar na visão Admin/Compliance — seção 4B)

**Fluxo de aprovação (progressivo por etapa):**
1. Etapa 1: pagamento da reserva `PAID` → libera automaticamente a Edição do Cadastro (seção 2). Aprovação do Compliance (seção 4B) registra validação dos dados sem bloquear o founder.
2. Etapa 2: cadastro completo (seções 2, incl. documentos analisados e Termo assinado) + **Etapa 1 já aprovada** + aprovação da Etapa 2 → libera os Detalhes de Captação (seção 3).
3. Etapa 3: Detalhes de Captação preenchidos (campanha `DRAFT`) + aprovação → libera a Central de Pendências para quitação das taxas (seção 4).
4. Etapa 4: Taxa de Compliance `PAID` + tudo aprovado → status `PENDING_APPROVAL` e notificação interna enviada ao Compliance/Admin.
5. Gate final: Compliance aprova via `/api/compliance/startups/:id/decide`, registrando justificativa quando rejeitar → status `APPROVED` → founder pode iniciar a captação (seção 6). Se rejeitado, o founder revisa as pendências e resubmete (documentos retornam para `PENDING_REVIEW`).

**Regras:**
- Etapa 1→2: liberação **automática** quando pagamento `PAID` (sem aprovação do Admin/Compliance).
- Etapa 2→3: exige **Etapa 1 aprovada + Etapa 2 aprovada** (ambas obrigatórias).
- Etapa 3→4: exige aprovação da Etapa 3.
- A aprovação do Admin/Compliance é registrada **por etapa** como auditoria/qualidade.
- A transição entre etapas é liberada **automaticamente** pelo pagamento confirmado (`PAID`) nas etapas que não exigem aprovação (Etapa 1→2).
- **Nota (alteração):** o modelo deixou de exigir aprovação como gate entre Etapa 1→2. Agora o pagamento `PAID` libera automaticamente a Etapa 2 para o founder. A aprovação do Admin/Compliance é uma ação paralela de auditoria que valida os dados. Aprovações das Etapas 1 e 2 são ambas necessárias para liberar a Etapa 3. A análise documental (seção 2) acontece na etapa 2 como auditoria, independentemente do pagamento da Taxa de Compliance (Etapa 4).
- A decisão deve considerar a startup, o usuário proprietário, os documentos individuais, as marcações "Não se aplica", o Termo de Adesão Digital e o pagamento da taxa.
- Enquanto existir documento pendente ou rejeitado, ou Taxa de Compliance não `PAID`, o botão "Aprovar" do gate final não é liberado.
- A Aprovação Rápida (Fast Track) altera prioridade/SLA de análise, mas não dispensa documentos, aceite do termo ou pagamento da Taxa de Compliance.

---

## 6. Início de Captação + Aceite de Afiliado

**Descrição:** Após aprovação do Compliance, o founder pode iniciar a captação (publicar a campanha). Neste momento, ele também pode aprovar afiliados que solicitaram parceria.

**Rota:** `/founder/startups/:id/captacao` (botão "Iniciar Captação" no dashboard)

**Form — confirmação de início:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| confirmar | Confirmar início de captação | Checkbox | Obrigatório |
| termoAceite | Aceitar termos de captação | Checkbox | Obrigatório |

**Form — gestão de afiliados (modal/triagem):**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| affiliateId | ID do afiliado | Number | Seleção via lista |
| decisao | Decisão (Aprovar/Rejeitar) | Select | Obrigatório |
| motivo | Motivo da rejeição | Textarea | Obrigatório se rejeitar |

**Regras:**
- Apenas campanhas com status `DRAFT` podem ser iniciadas
- Após iniciar, status muda para `OPEN` (captação ativa)
- Apenas campanhas `OPEN` aceitam novos afiliados
- Afiliados precisam ser aprovados pelo founder antes de promover a startup
- O fundador pode aprovar/rejeitar afiliados via triagem (`/founder/affiliate/triagem`)
- **Visibilidade da página de captação no `OPEN`:** ao iniciar a captação, a página passa a ser visível para **toda a plataforma** — usuários logados veem a **versão privada completa** (decidir/investir); **visitantes não logados** veem a **versão pública parcial** (meta, captado, progresso, equity, proposta resumida). Até o `OPEN`, apenas o founder via preview (ver "Preview da página de captação" na seção 3; detalhes na seção 17.5 do `PRD_STARTUP_PUBLICA_PRIVADA.md`).

**Detalhes:**
- Componente: Botão "Iniciar Captação" no dashboard + modal de confirmação
- Componente de triagem: `AffiliateTriagem` (`app/components/founder/affiliate-triagem-modal.tsx`)
- Mutation: `usePublishRoundMutation` (PATCH `/api/startup/:id/rodada/:rodadaId/publicar`)
- Afiliados: rota `/founder/affiliate/triagem?startupId=:id`

---

## 7. Conclusão de Captação

**Descrição:** A captação é concluída por **meta atingida** (100% dos tokens vendidos → `FUNDED`) ou por **tempo** (período definido pelo Compliance expira → encerramento automático). Ao concluir, os valores entram em **processamento**: o founder é notificado ("captação concluída, valores sendo processados", ∼7 dias, prorrogável) e o **Admin/Compliance** recebe notificação com link para a **página de gestão de pagamentos** da startup (`/admin/startups/:id/pagamentos`), onde avalia captado, tokens vendidos e data de início e decide **Prorrogar** ou **Finalizar Definitivamente**. Detalhes completos: `PRD_RECEBIMENTO_CAPTACAO.md`.

**Rota:** `/founder/startups/:id` (dashboard) — botão "Encerrar Captação" quando meta atingida (encerramento por tempo é automático)

**Form — confirmação de encerramento:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| confirmar | Confirmar encerramento da captação | Checkbox | Obrigatório |
| motivoFinalizacao | Motivo da finalização | Textarea | Opcional (se encerramento manual) |

**Regras:**
- Apenas campanhas `OPEN` podem ser encerradas
- Se meta foi atingida (100% vendido), status muda para `FUNDED`
- Se o período do Compliance expirou, a captação é **encerrada automaticamente** (por tempo) e segue para processamento
- Após a conclusão (qualquer modo), a startup entra em `AWAITING_PAYOUT_DECISION` — valores em processo (∼7 dias úteis, prorrogável)
- O **Admin/Compliance decide**: `PRORROGAR` (proposta ao founder, seção 8.1) ou `FINALIZAR_DEFINITIVAMENTE` (define parcelas, seção 8)
- Após `FUNDED`/conclusão, investidores não podem mais comprar tokens
- O botão "Transparência" aparece no dashboard para relatórios pós-captação

**Notificações:**
- **Founder:** conclusão + "os valores estão sendo processados" (prazo de ∼7 dias, prorrogável)
- **Admin/Compliance:** "a captação da startup <nome> finalizou" + link para `/admin/startups/:id/pagamentos`

**Detalhes:**
- Componente: Botão "Encerrar Captação" + modal `ConfirmCancelRoundDialog`
- Mutation: `useCancelRoundMutation` (PATCH `/api/startup/:id/rodada/:rodadaId/cancelar`)
- Ações de dashboard: ver botões em `startup-card.tsx` conforme status da campanha
- PRD de referência: `scripts/PRD_RECEBIMENTO_CAPTACAO.md` (máquina de estados, prorrogação e parcelas)

---

## 8. Requisição de Parcelas (Repasse de Fundos)

**Descrição:** Após a decisão `FINALIZAR_DEFINITIVAMENTE` do Admin/Compliance, o repasse é dividido em **parcelas (mínimo 12, com juros/configuração do Financeiro)** e a página de solicitação é liberada. O founder pode solicitar **1 parcela por mês** (não cumulativo; parcela não sacada não expira — segue disponível nos próximos meses). Para solicitar, ele deve preencher o **relatório do mês** (obrigatório), que é publicado na página de transparência. O Financeiro/Admin anexa o **comprovante** e marca como pago. Detalhes completos: `PRD_RECEBIMENTO_CAPTACAO.md`.

**Rotas:** founder `/founder/startups/:id/financeiro` · financeiro `/financeiro/repasse` e `/financeiro/repasse/:solicitacaoId`

**Form — solicitação de parcela:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| installmentId | ID da parcela | Number | Seleção via stepper (1 por mês) |
| valorSolicitado | Valor a receber | Texto (R$) | Calculado automaticamente (valor + juros) |
| dadosBancarios | Dados bancários para recebimento | Objeto | Titular, banco, agência, conta, dígito |
| justificativa | Justificativa da solicitação | Textarea | 10 a 500 caracteres |

**Form — relatório do mês (obrigatório para solicitar):**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| usoRecurso | Para onde o recurso será utilizado | Textarea | Obrigatório; alinhado à alocação da captação (tópico 3A) |
| teveLucro | A startup teve lucro neste período? | Radio (Sim/Não) | Obrigatório |
| marcoAlcancado | Alcançou algum marco/desenvolvimento? | Radio (Sim/Não) + Textarea | Obrigatório |
| mensagemInvestidores | Mensagem para os investidores | Textarea | Obrigatório → "mensagem do mês" na transparência |

**Form — alocação de recursos (opcional, se exigido pelo financeiro):**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| recursosFundador | Alocação para fundadores | Slider/Number | 0-100% |
| recursosDesenvolvimento | Alocação para desenvolvimento | Slider/Number | 0-100% |
| recursosComercial | Alocação para comercial | Slider/Number | 0-100% |
| recursosMarketing | Alocação para marketing | Slider/Number | 0-100% |
| recursosNuvem | Alocação para nuvem/infra | Slider/Number | 0-100% |
| recursosJuridico | Alocação para jurídico | Slider/Number | 0-100% |
| recursosCaixa | Alocação para caixa | Slider/Number | 0-100% |

**Regras:**
- Apenas campanhas com status `PAID_OUT` têm repasse disponível (após decisão `FINALIZAR_DEFINITIVAMENTE`)
- O repasse é dividido em **N parcelas, mín. 12**, com valores/juros configurados pelo Financeiro
- **1 parcela por mês** (não cumulativo); parcela não sacada no mês **não expira** (fica disponível nos próximos, respeitando 1/mês)
- **Relatório do mês obrigatório** para liberar a solicitação; ao salvar, vai para o relatório do mês na transparência
- A soma das alocações deve ser 100% (se exigido)
- SLA de 48h para aprovação/rejeição pelo financeiro
- Status da parcela: `PENDING` → `APPROVED` → `PAID` ou `REJECTED`
- O **Financeiro/Admin** anexa o **comprovante** e marca como `PAID`; comprovante exibido no relatório da transparência
- Parcelas rejeitadas podem ser reenviadas (resubmit)

**Detalhes:**
- Componente: `RepasseDashboard` (`app/components/founder/repasse-dashboard.tsx`)
- Form de solicitação: `RepasseInstallmentForm` (`app/components/founder/repasse-installment-form.tsx`)
- Form do relatório do mês: `RelatorioMesForm` (publica na transparência)
- Stepper: `RepasseStepper` (visualização das parcelas)
- Hooks: `useRepasseDashboard`, `useCreateSolicitacao`, `useResubmitSolicitacao`
- BFFs: `/api/founder/startups/:id/repasse/dashboard`, `/api/founder/startups/:id/repasse/installments/:installmentId/request`
- PRD de referência: `scripts/PRD_RECEBIMENTO_CAPTACAO.md`

### 8.1 Prorrogação da Captação (antes da finalização definitiva)

- Na janela de decisão (seção 7), o Admin/Compliance pode optar por **Prorrogar**.
- O founder recebe notificação + email: "identificamos potencial em sua captação; se tiver interesse em prorrogar..." com CTA para a **página de prorrogação** (`/founder/startups/:id/prorrogacao`).
- Na página: o founder define o **valor adicional**; o sistema exibe a **meta somada** automaticamente (ex.: R$ 500k + R$ 200k = **R$ 700k**, read-only) e calcula a **reserva de tokens apenas sobre o adicional** (ex.: R$ 200k ÷ preço do token).
- Após o founder **pagar a nova reserva**, o sistema **reativa automaticamente** a captação (`OPEN`) por um novo período definido pelo Compliance.
- Detalhes, máquina de estados e ACs: `scripts/PRD_RECEBIMENTO_CAPTACAO.md`.

---

## 9. Nova Captação (Nova Rodada)

**Descrição:** Após a conclusão da rodada anterior (100% vendida + repasse concluído + 3 meses de carência), o founder pode abrir uma nova rodada de captação para a mesma startup. Esta etapa tem gates estritos para garantir compliance com a CVM.

**Rota:** `/founder/startups/:id/new-round`

**Form — configuração da nova rodada:**

| Campo | Label | Tipo | Validação |
| --- | --- | --- | --- |
| targetAmount | Valor total da captação | Texto (R$) | R$ 10.000 a R$ 5.000.000 |
| equityPercent | Equity oferecido (%) | Texto | 5% a 49% |
| valuation | Valuation pré-money | Texto (R$) | Calculado automaticamente (readOnly) |
| tokenPrice | Preço do token | Texto (R$) | Configurado pelo admin |
| wantsFastTrackReview | Avaliação Rápida (Fast Track) | Checkbox | Adicional de R$ 2.500,00 |

**Regras (gates de acesso - PRD §4.11):**
- **Gate 1:** Startup deve ter status `APPROVED` (`LIVE` é sinônimo — usar apenas `APPROVED`)
- **Gate 2:** Nenhuma campanha ativa (sem status `OPEN`, `PAUSED` ou `DRAFT`)
- **Gate 3:** Deve existir pelo menos 1 campanha anterior finalizada (`CLOSED`, `FUNDED` ou `PAID_OUT`)
- **Gate 4:** Última campanha deve estar 100% vendida (todos os tokens vendidos)
- **Gate 5:** Carência de 3 meses desde o encerramento da última campanha
- **Gate 6:** Repasse de fundos da última campanha deve estar concluído (`PAID_OUT`)

**Mensagens de bloqueio:**
- `STATUS_INVALIDO`: "Esta startup ainda não concluiu todo o fluxo. A abertura de rodada só é liberada após a aprovação."
- `CAMPANHA_ATIVA`: "Sua captação atual ainda está em andamento. Finalize-a antes de abrir uma nova rodada."
- `CAMPANHA_DRAFT`: "Sua captação está aguardando aprovação. Não é possível abrir outra rodada."
- `TOKENS_NAO_VENDIDOS`: "A rodada anterior precisa estar 100% vendida para iniciar uma nova."
- `CARENCIA_3_MESES`: "É preciso esperar 3 meses desde o encerramento da rodada anterior."
- `REPASSE_PENDENTE`: "O repasse de fundos da rodada anterior precisa ser concluído primeiro."
- `SEM_CAMPANHA_ANTERIOR`: "Não há campanha anterior finalizada. Não é possível abrir nova rodada."

**Detalhes:**
- Componente: `FounderNewRoundPage` (`app/routes/private/founder-new-round.tsx`)
- Schema: cálculo automático de valuation (`targetAmount * 100 / equityPercent`)
- Mutation: `useCreateRoundMutation` (POST `/api/startup/:id/rounds`)
- Loader: gates completos com redirect para dashboard se qualquer pré-condição falhar
- Config: limites carregados via `founderFundraisingConfigQueryOptions` (admin)

---

## Resumo do Fluxo Completo

| Etapa | Rota | Status Pós-Etapa | Próxima Etapa |
|-------|------|------------------|--------------|
| 1. Cadastro + Reserva | `/founder/startups/new` | `PENDING_RESERVATION_PAYMENT` → Checkout | 2. Edição |
| 2. Edição + Finalização | `/founder/startups/:id/edit` | `AWAITING_COMPLIANCE_FEE` (cadastro completo) | 3. Detalhes de Captação |
| 3. Detalhes de Captação | `/founder/startups/:id/captacao` | Campanha `DRAFT` criada | 4. Pendências e Serviços |
| 4. Pendências e Serviços | `/founder/pendencias` | Taxa de Compliance `PAID` → `PENDING_APPROVAL` | 5. Aprovação Compliance |
| 5. Aprovação Compliance | Auditoria por etapa (seção 4B) + gate final `/api/compliance/startups/:id/decide` | `APPROVED` (gate final) | 6. Início de Captação |
| 6. Início de Captação | `/founder/startups/:id` (botão) | `OPEN` (captação ativa) | Venda de Tokens (investidores) |
| 7. Conclusão de Captação | `/founder/startups/:id` (botão) + automática por tempo | `FUNDED` (meta) → `AWAITING_PAYOUT_DECISION` → decisão (prorrogar/finalizar) | 8. Recebimento |
| 8. Recebimento (Parcelas) | `/founder/startups/:id/financeiro` + `/financeiro/repasse` | Parcelas (mín. 12) `APPROVED` → `PAID` + comprovante | 9. Nova Rodada (opcional) |
| 9. Nova Captação | `/founder/startups/:id/new-round` | Nova campanha `DRAFT` | Volta para etapa 6 |

**Transições de Status da Startup:**
```
Etapa 1 pagamento confirmado (reserva PAID) → libera Etapa 2 (Edição)
Etapa 1 aprovada + Etapa 2 aprovada (cadastro completo, docs aprovados, termo assinado) → libera Etapa 3 (Captação)
Etapa 3 aprovada (campanha DRAFT preenchida) → libera Etapa 4 (Central de Pendências)
Etapa 4: Taxa de Compliance PAID + tudo aprovado → PENDING_APPROVAL → APPROVED (gate final libera captação)
PENDING_RESERVATION_PAYMENT → (após pagamento) → aguarda aprovação da Etapa 1
PENDING_RESERVATION_PAYMENT → EXPIRED/ARCHIVED (30 dias sem pagamento concluído — cron/worker)
Payment PENDING → EXPIRED (QR Code/Pix expirado em 24h; a startup NÃO é deletada — retomar via "Gerar Novo Pagamento")
cadastro completo (incl. captação) → AWAITING_COMPLIANCE_FEE
AWAITING_COMPLIANCE_FEE → (Taxa de Compliance paga) → PENDING_APPROVAL
PENDING_APPROVAL → APPROVED (após aprovação Compliance)
```

**Transições de Status da Campanha:**
```
DRAFT → OPEN (após início da captação)
OPEN → FUNDED (meta atingida)
OPEN → CLOSED (meta não atingida, finalização manual)
OPEN → AWAITING_PAYOUT_DECISION (período do Compliance expirou — conclusão por tempo)
FUNDED → AWAITING_PAYOUT_DECISION (processamento ∼7 dias, prorrogável)
AWAITING_PAYOUT_DECISION → OPEN (reativação automática por prorrogação, após reserva paga)
AWAITING_PAYOUT_DECISION → PAID_OUT (finalização definitiva → parcelas liberadas)
PAID_OUT → DRAFT (nova rodada, após 3 meses carência)
```

**Atores Envolvidos:**
- **Founder:** Cadastra, edita, preenche captação, paga taxas e serviços, acompanha pendências financeiras e serviços extras no dashboard, publica captação, prorroga quando convidado (define adicional + paga nova reserva), solicita parcela (1/mês) com relatório obrigatório
- **Compliance/Admin:** Revisa o preenchimento de cada etapa como auditoria/qualidade (seção 4B — validação de dados, documentos e termo); **não bloqueia** a transição entre etapas (isso é automática via pagamento `PAID`); decide o gate final (`APPROVED`); decide **prorrogar ou finalizar definitivamente** o payout (∼7 dias) e define a quantidade de parcelas (mín. 12)
- **Financeiro:** Configura limites, valores e juros das parcelas, aprova/rejeita solicitações, anexa **comprovante** e marca como pago
- **Afiliado:** Solicita afiliação, promove campanha (quando `OPEN`)
- **Investidor:** Compra tokens (quando campanha `OPEN`)
- **Admin:** Configura valor da Taxa de Compliance e serviços extras

---

## 10. Wireframes das Etapas (visões por ator)

### 10.1 Visão do Founder — pipeline de status da startup

```text
Pipeline de etapas (header do wizard/dashboard):

  [1 ✔ Reserva] [2 ✔ Cadastro] [3 ✔ Captação] [4 ✔ Taxa] [5 ✔ Aprovado]
  [6 ● OPEN] [7 ○ PROCESSANDO] [8 ○ Parcelas]

Card de status no dashboard (visão do founder):

┌────────────────────────────────────────────────────────────────┐
│ <Startup> · R$ 300.000 / R$ 500.000 · CAPTAÇÃO EM PROCESSAMENTO│
│ ⚠ Valores em análise (até ∼7 dias, prorrogável) · conclusão:   │
│   (●) meta atingida  ( ) tempo expirado                         │
│ [ Transparência ] [ Financeiro/Parcelas (bloqueado) ]           │
└────────────────────────────────────────────────────────────────┘

Após decisão do Compliance:
  PRORROGAR       → card mostra: "Proposta de prorrogação recebida"
                    [ Definir Prorrogação ] → /founder/startups/:id/prorrogacao
  FINALIZAR       → card mostra: "Parcelas liberadas (Nx)"
                    [ Financeiro ] → /founder/startups/:id/financeiro
```

### 10.2 Visão do Admin/Compliance — revisão das Etapas (painel 4B) + decisão

```text
┌──────────────────────────────────────────────────────────────────────┐
│ REVISÃO DE ETAPAS — <Startup>                                        │
│ ──────────────────────────────────────────────────────────────────── │
│ 1. Reserva/Termo    ✔ Aprovada    4B. Painel de Taxas                │
│ 2. Cadastro/Docs    ✔ Aprovada       · Taxa de Compliance  ✓ PAID    │
│ 3. Captação         ✔ Aprovada       · Fast Track          ✓ PAID    │
│ 5. Gate final       ✔ APPROVED                                        │
│ ──────────────────────────────────────────────────────────────────── │
│ CAPTAÇÃO CONCLUÍDA — decisão pendente (janela ∼7 dias, expira 2d04h) │
│  Conclusão: (●) meta atingida  ( ) tempo expirado                     │
│  Captado R$ 300k · Tokens 7.500 · Início 12/08/2026                   │
│  [ PRORROGAR CAPTAÇÃO ]   [ FINALIZAR DEFINITIVAMENTE ▾ ]            │
│  → Definir Parcelas (mín. 12, juros/config Financeiro)                │
│                                                       [ Ver etapas ▸ ]│
└──────────────────────────────────────────────────────────────────────┘
```

- Visual por ator: **founder** vê o pipeline/status (10.1); **Admin/Compliance** vê o painel de revisão por etapa + decisão de pagamento (10.2); **Financeiro** vê as solicitações de parcelas e comprovante (PRD_RECEBIMENTO_CAPTACAO §12.5).