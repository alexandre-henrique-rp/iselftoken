# Plano de Implementação — Upload de Imagem de Perfil (NoSuchKey)

- [x] 1. Escrever o teste exploratório da condição de bug (ANTES da correção)
  - **Property 1: Bug Condition** - Objeto canônico disponível e tentativa consultável pelo proprietário
  - **CRÍTICO**: escrever e executar este teste contra o código não corrigido; a falha é esperada e confirma o defeito. Não corrigir o teste nem o código durante esta etapa.
  - **OBJETIVO**: produzir contraexemplos para `isBugCondition(input)` do design: tentativa `kind = 'avatar'`, `status ∈ {PENDING, PROCESSING, FAILED}`, em que o objeto não existe em `storage.exists(upload.bucket, upload.key)`, o processamento diverge do `bucket/key` persistido, ou o registro deduplicado não pertence ao usuário autenticado.
  - Criar teste baseado em propriedades, com doubles de `IObjectStorageProvider`, para gerar bucket/chave lógicos, disponibilidade do objeto, estado inicial, usuário proprietário e usuário autenticado.
  - Para o caso determinístico, reproduzir um `Upload` `FAILED` deduplicado com o mesmo `sha256`, objeto removido e reenvio autenticado: observar que a versão não corrigida republica o processamento sem reidratar/confirmar o objeto e o pipeline síncrono recebe `NoSuchKey`.
  - Reproduzir a divergência de ownership com upload de usuário A e novo envio idêntico por usuário B; registrar que a consulta de B resulta em 404 sem poder representar a tentativa de B.
  - Asserir o comportamento desejado codificado pelo teste: objeto ausente ou chave divergente não executa o pipeline, resulta em `FAILED` seguro e nunca em `READY`; falha de processamento do upload do proprietário responde 200 com `status: FAILED`, sem URL e sem vínculo de perfil.
  - Executar no código não corrigido e documentar os contraexemplos concretos encontrados, incluindo o `NoSuchKey` e/ou o 404 incorreto.
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 3.4_

- [x] 2. Escrever os testes de preservação (ANTES da correção)
  - **Property 2: Preservation** - Fluxo saudável, isolamento entre proprietários e barreira READY
  - **IMPORTANTE**: seguir a metodologia observation-first: observar e registrar no código não corrigido somente entradas para as quais `isBugCondition(input) = false`.
  - Observar que upload saudável, com objeto disponível, proprietário correspondente, pipeline de segurança/variantes bem-sucedidos, chega a `READY`, expõe URL presigned renderizável e só então pode vincular o avatar e atualizar Redis/TanStack Query.
  - Observar que o proprietário recebe `PENDING` e `PROCESSING` sem URL; upload `READY` retorna URL; upload inexistente, soft-deletado ou de terceiro não revela metadados, URL, status nem motivo de erro.
  - Criar testes baseados em propriedades para combinações fora da condição de bug: estados autorizados, objeto disponível, pares de usuários distintos, imagem válida e variantes aprovadas.
  - Para todos os estados diferentes de `READY`, preservar a rejeição de vínculo: não criar `KYCProfile`, não alterar `User.avatar_id`, não atualizar Redis e não fazer `setQueryData(['me'])` como sucesso.
  - Verificar que estes testes passam no código não corrigido e registrar os resultados observados como baseline de regressão.
  - _Requirements: 1.3, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 3. Corrigir o pipeline de upload de avatar e a representação de erro

  - [x] 3.1 Implementar o contrato canônico e a barreira de disponibilidade do storage
    - Em `S3StorageProvider`, garantir que `upload`, `exists`, download, delete e URL presigned recebam bucket/chave lógicos e resolvam o mesmo bucket físico configurado; não persistir retorno físico como bucket lógico.
    - Validar explicitamente endpoint e path-style compatíveis com RustFS quando configurados, para que escrita e leitura usem o mesmo client e destino.
    - Em `UploadsService.create`, gravar/reidratar o objeto e confirmar `storageProvider.exists(bucket, key)` com os valores canônicos antes de persistir/publicar processamento; se a confirmação falhar, não deixar a tentativa como `PENDING` nem publicar processamento, registrar `FAILED` com motivo seguro e executar limpeza best-effort quando aplicável.
    - Em retry de `FAILED`/`INFECTED`, nunca executar novamente chave ausente: reenviar o `file.buffer` para a chave canônica e confirmar a disponibilidade, ou criar tentativa autorizada para o solicitante conforme a decisão de ownership.
    - Fazer o pipeline síncrono carregar bucket, key, MIME e tipo do registro canônico por `uploadId`, em vez de confiar em payload obsoleto do processamento.
    - _Bug_Condition: `input.kind = 'avatar'` e upload em processamento com `NOT storage.exists(upload.bucket, upload.key)` ou `input.processamento.bucket/key` divergentes do registro canônico._
    - _Expected_Behavior: para objeto indisponível, `processamentoPublished = false`, `uploadStatus = FAILED`, `profileLinked = false`, `redisUpdated = false` e `meCacheUpdated = false`; para objeto disponível, o processamento pode seguir para pipeline de segurança/variantes._
    - _Preservation: uploads normais com objeto disponível continuam usando pipeline de segurança, sanitização, variantes e URL somente após `READY`._
    - _Requirements: 1.1, 2.1, 2.2, 3.3, 3.4_

  - [x] 3.2 [BLOQUEADO — requer aprovação humana] Decidir e executar a alteração de ownership/deduplicação por SHA-256
    - **NÃO executar migration SQLite sem aprovação humana explícita.** A alteração de `Upload.sha256` de unicidade global para unicidade composta por proprietário e hash (por exemplo, `@@unique([userId, sha256])`) modifica o schema e pode afetar dados existentes.
    - Após aprovação, criar migration SQLite e adaptar `UploadsService.create()` para criar/manter uma tentativa do usuário autenticado para bytes idênticos, sem reatribuir nem revelar registro de terceiro. O objeto físico pode continuar compartilhado pela chave hash apenas quando todas as referências forem preservadas.
    - Remover o fallback `userId || 1` do caminho autenticado; a posse deve vir exclusivamente da sessão válida. Fluxos públicos devem permanecer sem associação ou impossibilitados de vincular avatar.
    - Se a aprovação for negada, escalar a decisão arquitetural: definir uma relação explícita de permissões por upload ou outra estratégia de ownership antes de implementar o reuso multiusuário. Não adotar a alternativa sem decisão humana.
    - _Bug_Condition: registro global deduplicado com `upload.userId != authenticatedUserId`, fazendo `getStatusForUser()` retornar ausência para quem enviou o arquivo._
    - _Expected_Behavior: cada tentativa aceita mantém ownership consultável pelo solicitante, sem expor dados de outro usuário._
    - _Preservation: consultas de terceiro continuam sem metadados, URL, status ou motivo de rejeição._
    - _Requirements: 1.2, 2.3, 3.1, 3.2_

  - [x] 3.3 Normalizar falhas do processamento síncrono e o endpoint de status autorizado
    - No `UploadsService`, converter `NoSuchKey` e demais erros de leitura em `FAILED`, registrando motivo seguro para o cliente e detalhes técnicos somente em logs estruturados sem PII.
    - Em `getStatusForUser()` e controller, retornar a representação autorizada de todos os estados do upload, inclusive `FAILED` e `INFECTED`; retornar `null`/404 somente para inexistente, soft-deletado ou de outro proprietário.
    - Manter URL ausente fora de `READY`; se a URL presigned não puder ser emitida, retornar falha controlada sem apresentar o upload como renderizável.
    - _Bug_Condition: o processamento falha por objeto ausente e o upload existente do próprio usuário é traduzido indevidamente em `Upload não encontrado`/404._
    - _Expected_Behavior: `processingFailed = true` implica resposta HTTP 200, `status: FAILED`, URL nula e nenhum vínculo de perfil._
    - _Preservation: `PENDING`, `PROCESSING` e `READY` do proprietário preservam a resposta autorizada; inexistente, removido ou terceiro continuam ocultos._
    - _Requirements: 1.1, 1.2, 2.2, 2.3, 3.1, 3.2, 3.4_

  - [x] 3.4 Preservar a barreira de vínculo e a sincronização de perfil
    - Manter `UsersService.createKycProfileFromUpload()` como fonte de verdade para validar posse, `READY`, bucket/chave e URL renderizável antes de criar `KYCProfile` e atualizar `User.avatar_id`.
    - Garantir atomicidade entre criação de `KYCProfile`, atualização do usuário e `SessionService.refreshUserProfile`; para estados não `READY`, não executar nenhum desses efeitos.
    - No `ProfileDocuments`, interromper polling em `FAILED`/`INFECTED`, exibir `rejectionReason` seguro, limpar preview local e não chamar `PATCH /api/users/me`.
    - Após `READY` e PATCH bem-sucedido, preservar `queryClient.setQueryData(meQueryOptions.queryKey, payload.data)` e não introduzir `useEffect`, refetch ou consulta duplicada para `/users/me`.
    - _Bug_Condition: upload não renderizável em `PENDING`, `PROCESSING`, `FAILED` ou `INFECTED` tenta ser vinculado como avatar._
    - _Expected_Behavior: somente `READY` com URL renderizável vincula o perfil; estados restantes não alteram avatar, Redis nem cache `['me']`._
    - _Preservation: vínculo válido continua atualizando perfil, sessão Redis e TanStack Query uma única vez, sem waterfall de cliente._
    - _Requirements: 1.3, 2.4, 2.5, 3.3, 3.4_

  - [x] 3.5 Cobrir integrações de backend e frontend
    - Cobrir: criação autenticada → confirmação do objeto → execução síncrona/pipeline de segurança mockado → status `READY` → PATCH do perfil → usuário e sessão Redis; ausência de objeto → `FAILED` consultável → PATCH rejeitado; e reenvio multiusuário após a decisão aprovada de schema/ownership.
    - Cobrir o BFF/frontend: preservar status 200 de `FAILED`, exibir mensagem segura, não disparar PATCH antes de `READY` e atualizar `['me']` somente depois de PATCH bem-sucedido.
    - Não enviar arquivos ou dados reais a serviços externos; usar doubles do provider e do pipeline de segurança.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.6 Verificar que o teste exploratório agora passa
    - **Property 1: Expected Behavior** - Objeto canônico disponível e tentativa consultável pelo proprietário
    - **IMPORTANTE**: reexecutar o mesmo teste da tarefa 1; não escrever um novo teste.
    - Confirmar, para todas as combinações da condição de bug, que a ausência/divergência do objeto não executa o pipeline nem gera `READY`, que falha do proprietário retorna `FAILED`/200 sem URL, e que não há vínculo ou atualização de Redis/TanStack.
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 3.4_

  - [x] 3.7 Verificar que os testes de preservação continuam passando
    - **Property 2: Preservation** - Fluxo saudável, isolamento entre proprietários e barreira READY
    - **IMPORTANTE**: reexecutar os mesmos testes da tarefa 2; não escrever testes novos.
    - Confirmar a preservação de upload saudável, pipeline de segurança/variantes, URL apenas em `READY`, isolamento de status para terceiro/inexistente e bloqueio de vínculo em todos os estados não `READY`.
    - _Requirements: 1.3, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint — garantir que todos os testes passem
  - Executar testes unitários, de propriedade e de integração afetados no backend e frontend em modo de execução única.
  - Confirmar que os contraexemplos da tarefa 1 passaram após a correção e que o baseline de preservação da tarefa 2 continua verde.
  - Confirmar que nenhuma migration SQLite de unicidade de `sha256` foi criada ou aplicada sem aprovação humana explícita; se a aprovação estiver pendente, manter a tarefa 3.2 bloqueada e registrar o impacto na entrega.
