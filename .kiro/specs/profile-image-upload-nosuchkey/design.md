# Profile Image Upload NoSuchKey Bugfix Design

## Overview

Este bugfix corrige a execução síncrona de substituição da imagem de perfil quando um registro de `Upload` aponta para um bucket/chave cujo objeto não pode ser lido durante o processamento. O sintoma observado é `NoSuchKey` quando o `UploadsService` tenta ler o original, seguido no frontend por uma resposta incorreta de 404 (`Upload não encontrado`) ao consultar o status de um upload que deveria pertencer ao usuário.

A estratégia é tornar a disponibilidade do objeto uma pré-condição explícita para executar o pipeline, usar o bucket/chave canônicos persistidos ao processar, preservar a associação do upload ao proprietário mesmo em deduplicação e expor os estados terminais de processamento ao proprietário. O vínculo de `User.avatar_id`, a atualização de Redis e o cache TanStack Query continuam ocorrendo exclusivamente depois de `READY` e de uma URL renderizável estar disponível.

## Glossary

- **Bug_Condition (C)**: condição em que um upload de avatar autenticado é aceito ou reutilizado, mas seu objeto não está disponível no bucket/chave canônicos quando o processamento é iniciado, ou seu registro não permanece consultável pelo proprietário.
- **Property (P)**: resultado exigido para C: o processamento só inicia com objeto verificável; falhas ficam em `FAILED` e são consultáveis pelo proprietário; somente `READY` pode ser vinculado.
- **Preservation**: comportamentos fora da condição de erro que devem permanecer iguais, incluindo autorização por proprietário, pipeline de segurança, URLs presigned e o fluxo normal de KYC.
- **Upload canônico**: registro `Upload` que contém `userId`, `bucket`, `key`, `sha256`, `status`, variantes e motivo de rejeição; `bucket` e `key` usam a convenção lógica esperada pelo `IObjectStorageProvider`.
- **Bucket lógico**: identificador persistido, como `image`; o provider aplica internamente o prefixo físico configurado, como `iselftoken-image`.
- **Objeto disponível**: objeto confirmado pelo provider no mesmo bucket/chave que será usado pelo processamento síncrono.
- **Processamento de upload**: `backendnode/src/api/uploads/uploads.service.ts`; valida o original, executa sanitização/variants e atualiza o estado no mesmo request.
- **UploadsService.create**: `backendnode/src/api/uploads/uploads.service.ts`; processa de forma síncrona, persiste os metadados e retorna o resultado pronto.
- **getStatusForUser**: método de `UploadsService` que filtra `Upload` por `id`, `userId` e `deletedAt`, retornando URL apenas no estado `READY`.
- **Vínculo de perfil**: criação de `KYCProfile` a partir do upload e atualização de `User.avatar_id` no `UsersService`, seguida de `SessionService.refreshUserProfile`.

## Bug Details

### Bug Condition

O defeito se manifesta quando o fluxo aceita ou reutiliza um upload para uma imagem de perfil sem assegurar que o objeto correspondente existe no storage usado pelo processamento síncrono. Isso pode ocorrer quando um registro globalmente deduplicado em `FAILED`/`INFECTED` é reutilizado sem reenviar o conteúdo, quando o registro preserva uma chave cujo objeto foi removido, ou quando a convenção/configuração de bucket usada na escrita diverge da usada na leitura por S3/RustFS.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ProfileImageUploadAttempt
  OUTPUT: boolean

  LET upload = input.persistedUpload
  LET objectAvailable = storage.exists(upload.bucket, upload.key)
  LET ownerCanRead = upload.userId = input.authenticatedUserId
  LET isProcessingAttempt = upload.status IN [PENDING, PROCESSING, FAILED]

  RETURN input.kind = 'avatar'
         AND isProcessingAttempt
         AND (
           NOT objectAvailable
           OR NOT ownerCanRead
           OR input.bucket != upload.bucket
           OR input.key != upload.key
         )
END FUNCTION
```

### Examples

- Um usuário reenvia um PNG cujo registro anterior está em `FAILED`. A deduplicação por `sha256` apenas reutiliza a chave antiga, mas o original havia sido removido. O processamento síncrono recebe `NoSuchKey`; o correto é reenviar/confirmar o objeto antes de processar ou manter a tentativa em `FAILED` sem iniciar o processamento.
- Um `PutObject` ocorre em um bucket físico RustFS, mas a leitura usa prefixo, endpoint ou path-style divergentes. A leitura tenta `image/<hash>.png` em uma localização diferente e falha. O correto é que as duas operações usem o mesmo contrato de bucket lógico e a mesma configuração de endpoint.
- O upload deduplicado pertence ao usuário A e é retornado após um envio do usuário B. A consulta de status por B filtra por `userId` e responde 404. O correto é criar/associar uma tentativa pertencente a B sem expor o upload de A.
- Um upload existente do próprio usuário chega a `FAILED` por ausência do objeto. A consulta `GET /uploads/:id/status` deve retornar 200, `status: FAILED` e um motivo seguro; não deve responder 404.
- Um cliente tenta `PATCH /users/me` com `avatar_upload_id` em `PENDING`, `PROCESSING`, `FAILED` ou `INFECTED`. O correto é rejeitar o vínculo, manter avatar/cache anteriores e não criar `KYCProfile`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- O status de um upload existente e pertencente ao usuário continua retornando `PENDING`, `PROCESSING` ou `READY` de forma autorizada; URL presigned só é incluída em `READY`.
- Uploads inexistentes, soft-deletados ou pertencentes a outro usuário continuam sem revelar metadados, URL, status ou motivo de erro.
- O caminho de sucesso continua executando pipeline de segurança, validação/sanitização, geração de variantes e só então marca `READY`.
- `UsersService.createKycProfileFromUpload` continua recusando qualquer estado diferente de `READY`; clicks, polling e toasts no frontend não podem contornar essa validação de backend.
- Após um vínculo válido, `SessionService.refreshUserProfile` e a atualização da query `meQueryOptions.queryKey` continuam sincronizando Redis e TanStack Query, sem refetch duplicado.

**Scope:**
Todos os casos em que `isBugCondition` retorna falso ficam fora da mudança funcional, incluindo:
- uploads normais de imagem, vídeo e documento com objeto disponível no storage configurado;
- consultas de status autorizadas para estados não terminais e para `READY`;
- consultas sem posse, inexistentes ou soft-deletadas;
- vínculo de outros documentos KYC, validação de MIME, quotas e rate limiting;
- interação de mouse, seleção de arquivo e demais estados visuais do perfil.

## Hypothesized Root Cause

1. **Reprocessamento sem reidratação do objeto**: no ramo de deduplicação, um registro `FAILED`/`INFECTED` é restaurado para `PENDING` e reutilizado usando `bucket`/`key` já persistidos, mas não há novo `storageProvider.upload` nem confirmação de existência antes de publicar. Se o objeto foi removido, o `pipeline síncrono do UploadsService.downloadOriginal` inevitavelmente recebe `NoSuchKey`.

2. **Contrato de bucket físico versus lógico e configuração RustFS incompleta**: `S3StorageProvider` prefixa o bucket em cada operação, mas `upload()` devolve o nome físico. Sem um contrato único, persistir ou reenviar nomes físicos pode causar prefixação dupla. Além disso, o cliente atual não declara explicitamente endpoint compatível com RustFS ou path-style; uma configuração divergente entre ambientes pode fazer escrita e leitura apontarem para locais distintos.

3. **Deduplicação global incompatível com ownership de perfil**: `Upload.sha256` é único globalmente e `UploadsService.create()` devolve o registro existente sem garantir que seu `userId` seja o usuário autenticado. Como `getStatusForUser()` exige posse, isso explica a resposta 404 para o novo solicitante e também impede o vínculo seguro.

4. **Processamento baseado em dados transitórios**: o fluxo antigo poderia transportar bucket/chave separados; se esses dados fossem obsoletos ou divergentes do registro, a leitura não reconciliaria a fonte de verdade antes do download. A falha é gravada como `FAILED`, mas a observabilidade não distingue claramente uma ausência do objeto de uma inexistência de registro/posse.

5. **Confirmação insuficiente de prontidão do ativo**: `READY` é atribuído após processamento, mas não há barreira explícita entre o `PutObject` e a leitura que comprove que o serviço consegue consultar a mesma chave. Isso deixa a causa operacional chegar ao processamento em vez de falhar de forma determinística na criação/retry.

## Correctness Properties

Property 1: Bug Condition - Objeto canônico disponível antes do processamento

_For any_ tentativa de upload de avatar para a qual `isBugCondition` seria verdadeira por objeto ausente ou divergência de bucket/chave, a função corrigida SHALL não publicar nem executar um processamento usando esse objeto até que o mesmo provider confirme a existência na combinação canônica persistida; se a confirmação falhar, SHALL manter o upload em `FAILED` com motivo seguro e sem marcá-lo `READY`.

**Validates: Requirements 1.1, 2.1, 2.2, 3.4**

Property 2: Bug Condition - Status terminal consultável pelo proprietário

_For any_ upload existente, não deletado e pertencente ao usuário autenticado cujo processamento termine em `FAILED` ou `INFECTED`, o endpoint de status SHALL retornar a representação autorizada desse estado e seu motivo de rejeição seguro, em vez de representar o registro como ausente.

**Validates: Requirements 1.2, 2.3, 3.1**

Property 3: Bug Condition - Vínculo somente de upload renderizável

_For any_ tentativa de vínculo de avatar cujo upload pertencente ao usuário tenha status diferente de `READY` ou não tenha URL renderizável válida, a função corrigida SHALL rejeitar a mutação sem criar `KYCProfile`, sem alterar `User.avatar_id`, sem atualizar Redis e sem atualizar a query `['me']` como sucesso.

**Validates: Requirements 1.3, 2.4, 3.4**

Property 4: Preservation - Fluxo válido e isolamento entre proprietários

_For any_ upload cujo objeto esteja disponível, cujo processamento pipeline de segurança e de variantes tenha sucesso e cujo proprietário corresponda ao usuário autenticado, a função corrigida SHALL preservar o fluxo atual: expor URL somente em `READY`, vincular o perfil após `READY` e atualizar Redis e TanStack Query. _For any_ outro usuário ou ID inexistente, SHALL preservar a ausência de informações.

**Validates: Requirements 2.2, 2.5, 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Assumindo que as hipóteses sejam confirmadas pelos testes exploratórios e por uma verificação no RustFS do ambiente afetado:

**Files**: `backendnode/src/common/storage/s3-storage.provider.ts`, `backendnode/src/api/uploads/uploads.service.ts`, `backendnode/src/api/uploads/uploads.service.ts`, `backendnode/src/api/uploads/uploads.controller.ts`, `backendnode/src/api/users/users.service.ts`, `frontend/app/components/profile/profile-documents.tsx` e os testes co-localizados.

**Schema impact requiring human approval before implementation**: para que a deduplicação preserve posse individual, substituir a unicidade global de `Upload.sha256` por uma unicidade composta por proprietário e hash (por exemplo, `@@unique([userId, sha256])`) requer migration SQLite e aprovação humana conforme as regras do projeto. O objeto físico pode continuar deduplicado por chave hash; cada usuário terá seu próprio registro autorizado apontando para a mesma chave canônica. Caso a decisão seja manter deduplicação global, será necessário introduzir uma relação explícita de permissões por upload, que é mais complexa e não deve ser adotada sem decisão arquitetural.

1. **Definir contrato canônico de storage**:
   - Persistir e trafegar internamente apenas bucket lógico e `key` lógica; `S3StorageProvider` é o único componente que transforma para o bucket físico com prefixo.
   - Ajustar `ObjectStorageUploadResult`/`S3StorageProvider.upload()` para não devolver bucket físico como se fosse lógico, ou impedir que esse retorno seja persistido diretamente.
   - Adicionar configurações explícitas e validadas para RustFS compatível com S3 (endpoint e path-style, quando configurados), garantindo que `PutObject`, `HeadObject`, `GetObject`, delete e URLs presigned usem o mesmo client e destino.

2. **Tornar disponibilidade pré-condição de criação e retry**:
   - Em `UploadsService.create()`, após gravar o objeto e antes de criar/reexecutar o pipeline, executar `storageProvider.exists(bucket, key)` usando os valores canônicos.
   - Se `exists` retornar falso ou lançar erro, não criar/publicar uma nova tentativa como `PENDING`; fazer limpeza best-effort do objeto recém-gravado quando aplicável e retornar erro controlado ao cliente.
   - No reprocessamento de um registro terminal, reenviar o `file.buffer` para a mesma chave antes da confirmação, ou criar uma nova tentativa de propriedade do solicitante; nunca apenas reenfileirar uma chave ausente.
   - Publicar o processamento somente depois da confirmação e fazer o processamento carregar `bucket`, `key`, tipo e MIME do registro persistido por `uploadId`, em vez de confiar em valores de payload potencialmente obsoletos.

3. **Corrigir ownership e deduplicação**:
   - Remover o fallback `userId || 1` do caminho de upload autenticado; a associação deve usar somente o usuário resolvido pela sessão válida. O upload público sem sessão permanece explicitamente sem associação ou em um fluxo que não possa ser vinculado a perfil.
   - Com a migration aprovada, deduplicar por `(userId, sha256)` e criar uma tentativa pertencente ao usuário atual quando ele reenviar o mesmo conteúdo. Não reatribuir nem revelar um registro de outro proprietário.
   - Para reuso do mesmo proprietário, distinguir `READY` (pode reutilizar o registro) de `FAILED`/`INFECTED` (deve reidratar o objeto e reiniciar o processamento de modo determinístico, respeitando a política de antivírus).

4. **Normalizar estados e o endpoint de status**:
   - O `pipeline síncrono do UploadsService` deve converter `NoSuchKey` e outros erros de leitura em `FAILED`, registrando um motivo seguro para o cliente e detalhes técnicos somente em logs estruturados sem PII.
   - `getStatusForUser()` deve retornar o registro autorizado em todos os estados, inclusive `FAILED` e `INFECTED`; apenas registro inexistente, soft-deletado ou de outro proprietário retorna `null`/404.
   - A geração de URL deve permanecer limitada a `READY`; se a URL presigned não puder ser emitida, não falsificar `READY` renderizável: retornar falha controlada e investigar a disponibilidade do objeto.

5. **Preservar a barreira de vínculo e sincronização de cache**:
   - Manter `UsersService.createKycProfileFromUpload()` como fonte de verdade para `READY`, posse, bucket/chave e URL. O patch deve ser atômico quanto à criação de `KYCProfile`, atualização do usuário e refresh da sessão.
   - No frontend, manter polling até `READY` com `url`; em `FAILED`/`INFECTED`, exibir `rejectionReason`, limpar preview local e não chamar `PATCH /api/users/me`.
   - Após sucesso do PATCH, continuar usando `queryClient.setQueryData(meQueryOptions.queryKey, payload.data)`; não adicionar fetch em `useEffect` nem consulta duplicada de `/users/me`.

## Testing Strategy

### Validation Approach

A validação seguirá duas fases: primeiro, reproduzir o contraexemplo com a implementação atual usando um registro deduplicado com objeto ausente e, depois, provar que o código corrigido satisfaz a condição de falha e preserva o comportamento de uploads saudáveis. Os testes usarão doubles do `IObjectStorageProvider`, sem enviar arquivos ou dados do projeto a serviços externos.

### Exploratory Bug Condition Checking

**Goal**: produzir contraexemplos no código não corrigido e confirmar se `NoSuchKey`, deduplicação global e perda de ownership explicam a resposta 404 observada.

**Test Plan**: simular `Upload` terminal com `sha256` já existente, `bucket/key` persistidos e `storageProvider.exists/download` indicando ausência. Submeter o mesmo arquivo por usuário autenticado e observar se o serviço reenfileira sem reupload; em seguida, consultar o status com o novo usuário. Executar também uma matriz de configurações de bucket lógico/físico no provider mockado.

**Test Cases**:
1. **Retry com objeto ausente**: upload `FAILED` deduplicado, `exists=false`; verificar que o código atual publica o processamento e o processor falha no download com `NoSuchKey`.
2. **Retry sem nova escrita**: upload terminal existente e mesmo buffer; confirmar que o código atual não chama `storageProvider.upload` antes de `UploadsService.create`.
3. **Status do proprietário divergente**: registro global com hash igual pertencente ao usuário A, envio autenticado por B e consulta por B; confirmar o 404 atual sem expor dados de A.
4. **Vínculo antecipado**: parametrizar `PENDING`, `PROCESSING`, `FAILED` e `INFECTED`; confirmar que `PATCH /users/me` não cria `KYCProfile`, não troca avatar e não atualiza Redis.
5. **Contrato RustFS**: configurar mock com prefixo/endpoint lógico e validar que escrita, `exists` e download recebem a mesma chave lógica e resolvem o mesmo bucket físico.

**Expected Counterexamples**:
- `UploadsService.create` é chamado para chave ausente porque o retry não reidrata nem confirma o objeto.
- O pipeline síncrono marca `FAILED` após `NoSuchKey`, mas a consulta do usuário que iniciou o novo envio não localiza o registro global pertencente a terceiro.
- Possíveis causas: deduplicação global por `sha256`, fallback de usuário não autenticado, bucket físico/lógico divergente e payload de processamento obsoleto.

### Fix Checking

**Goal**: verificar que todos os inputs em que a condição de falha se aplica passam pelo controle de disponibilidade, preservam ownership e nunca alcançam `READY` ou vínculo indevido.

**Pseudocode:**
```
FUNCTION expectedBehavior(result)
  INPUT: result of type UploadFlowResult
  OUTPUT: boolean

  IF result.objectAvailable = false THEN
    RETURN result.processamentoPublished = false
           AND result.uploadStatus = FAILED
           AND result.profileLinked = false
           AND result.redisUpdated = false
           AND result.meCacheUpdated = false
  END IF

  IF result.processingFailed = true THEN
    RETURN result.statusResponse.httpStatus = 200
           AND result.statusResponse.status = FAILED
           AND result.statusResponse.url = null
           AND result.profileLinked = false
  END IF

  RETURN result.processingSucceeded = true
         AND result.uploadStatus = READY
         AND result.renderableUrl EXISTS
         AND result.profileLinked = true
END FUNCTION

FOR ALL input WHERE isBugCondition(input) DO
  result := processProfileUpload_fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: verificar que entradas fora da condição de erro mantêm as respostas e efeitos previamente corretos.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT observableBehavior(processProfileUpload_original(input))
         = observableBehavior(processProfileUpload_fixed(input))
END FOR
```

**Testing Approach**: usar testes baseados em propriedades para gerar combinações de estado (`PENDING`, `PROCESSING`, `READY`, `FAILED`, `INFECTED`), posse, tipo de arquivo e presença do objeto. Comparar apenas os efeitos observáveis permitidos: autorização, status, ausência/presença de URL, publicação de processamento, vínculo de perfil e atualizações de sessão/cache. O comportamento intencionalmente alterado para C não deve ser usado como baseline de preservação.

**Test Cases**:
1. **Upload saudável**: objeto disponível, scan limpo e variantes geradas; mantém `READY`, URL presigned, vínculo e refresh de Redis/TanStack.
2. **Status autorizado não terminal**: proprietário recebe `PENDING`/`PROCESSING` sem URL e continua aguardando sem 404.
3. **Isolamento de dados**: usuário diferente e ID inexistente continuam recebendo ausência/autorização aplicável sem status, URL ou motivo de rejeição.
4. **Preservação de KYC**: MIME, quota, pipeline de segurança, variantes e os vínculos de documento/comprovante/biofacial continuam obedecendo às regras atuais.

### Unit Tests

- `S3StorageProvider`: bucket lógico → físico consistente, endpoint/path-style RustFS quando configurado, e mesmas entradas para upload, `exists`, download e URL presigned.
- `UploadsService.create`: objeto confirmado antes de `prisma.upload.create`/`UploadsService.create`; indisponibilidade impede processamento; retry reidrata o objeto; ownership e deduplicação por usuário são preservados.
- `pipeline síncrono do UploadsService`: carregar metadados canônicos por `uploadId`, converter ausência do objeto em `FAILED`, nunca em `READY`, e registrar motivo seguro.
- `UploadsService.getStatusForUser` e controller: proprietário recebe `FAILED`/`INFECTED` com 200; inexistente, apagado e terceiro recebem 404 sem vazamento.
- `UsersService.updateMe`: todos os estados não `READY` rejeitam o vínculo e não chamam criação de KYC, update de usuário ou refresh da sessão.
- `ProfileDocuments`: polling para em `FAILED`/`INFECTED`, mostra a mensagem retornada, não dispara PATCH e só atualiza `['me']` após o payload de sucesso.

### Property-Based Tests

- Gerar estado do objeto (disponível/ausente), estado inicial do upload, bucket/key lógico, proprietário e tipo; verificar a Property 1 para toda combinação que representaria `NoSuchKey`.
- Gerar pares de usuários e hashes iguais; verificar que nenhum usuário obtém status, URL ou motivo de outro e que o upload aceito para cada proprietário permanece consultável pela sua própria sessão.
- Gerar todos os estados de upload diferentes de `READY`; verificar que não há `KYCProfile`, alteração de avatar, refresh Redis ou `setQueryData(['me'])` como sucesso.
- Gerar uploads saudáveis com combinações de imagem/variantes; verificar a Property 4, incluindo URL somente em `READY` e preservação do caminho aprovado.

### Integration Tests

- Fluxo backend autenticado: `POST /uploads?kind=avatar` → confirmação do objeto no provider de teste → processor/pipeline de segurança mockado → `GET /uploads/:id/status` com `READY` e URL → `PATCH /users/me` → verificação de usuário e sessão Redis.
- Fluxo de ausência: upload/retry com `HeadObject`/download `NoSuchKey` → `FAILED` consultável pelo proprietário → tentativa de PATCH rejeitada, avatar anterior e sessão inalterados.
- Fluxo de deduplicação multiusuário: dois usuários enviam bytes idênticos; cada um mantém registro/autorização próprios sem vazar metadados e sem apagar o objeto enquanto houver referências.
- Fluxo frontend BFF: o BFF preserva o status 200 de `FAILED`, o componente mostra o motivo seguro e a query `['me']` só é atualizada depois de `READY` e PATCH bem-sucedido.
