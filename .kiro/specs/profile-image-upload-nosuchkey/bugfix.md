# Bugfix Requirements Document

## Introduction

Corrigir o fluxo de substituição da imagem de perfil para que um upload só seja processado depois que o objeto correspondente estiver disponível no bucket/chave persistidos no S3/RustFS. A correção deve impedir respostas inconsistentes no status de uploads do próprio usuário, preservar a proteção contra vínculo antecipado e manter sincronizados o perfil renderizável, o Redis e o cache do TanStack Query.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN uma nova imagem de perfil é criada com bucket e chave persistidos, mas o objeto ainda não existe no S3/RustFS quando o `UploadsService` inicia a leitura do original, THEN o S3StorageProvider retorna NoSuchKey e o processamento falha.

1.2 WHEN o processamento de uma imagem de perfil falha por NoSuchKey, THEN o endpoint de status para o upload pertencente ao usuário responde `{ error: true, message: 'Upload não encontrado', codigo: 404 }`, ocultando o estado de erro de processamento.

1.3 WHEN um upload de imagem de perfil ainda não alcançou o estado READY, THEN o fluxo pode tentar vincular a imagem ao usuário antes de haver uma URL renderizável e validada.

### Expected Behavior (Correct)

2.1 WHEN uma nova imagem de perfil é criada, THEN o sistema SHALL assegurar que o objeto esteja concluído e disponível no S3/RustFS no bucket e na chave persistidos antes de iniciar o processamento.

2.2 WHEN o pipeline síncrono do `UploadsService` processa uma imagem de perfil cujo objeto está disponível no S3/RustFS, THEN o sistema SHALL executar o processamento e a verificação pipeline de segurança, marcar o upload como READY somente após sucesso e disponibilizar uma URL renderizável.

2.3 WHEN o processamento de uma imagem de perfil pertencente ao usuário falha, incluindo por NoSuchKey, THEN o sistema SHALL persistir e expor no endpoint de status um estado de erro de processamento consistente, sem responder que o upload não foi encontrado.

2.4 WHEN uma imagem de perfil não está no estado READY, THEN o sistema SHALL impedir seu vínculo ao usuário e não atualizar a imagem de perfil, o Redis ou o TanStack Query como se a imagem estivesse disponível.

2.5 WHEN uma imagem de perfil alcança o estado READY, THEN o sistema SHALL vincular a URL renderizável ao usuário e atualizar os dados de perfil no Redis e no TanStack Query de forma consistente.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN o usuário consulta o status de um upload existente que lhe pertence e que está pendente, em processamento ou READY, THEN o sistema SHALL CONTINUE TO retornar seu estado atual de forma autorizada e consistente.

3.2 WHEN o usuário consulta um upload inexistente ou que pertence a outro usuário, THEN o sistema SHALL CONTINUE TO não revelar seus dados e retornar a resposta de ausência ou autorização aplicável.

3.3 WHEN uma imagem de perfil é concluída corretamente no S3/RustFS e processada sem falhas, THEN o sistema SHALL CONTINUE TO executar a verificação pipeline de segurança, disponibilizar a URL renderizável após READY e refletir a nova imagem nos caches de perfil.

3.4 WHEN o objeto de uma imagem de perfil não está disponível no bucket/chave persistidos, THEN o sistema SHALL CONTINUE TO não vincular a imagem ao usuário nem tratar o upload como READY.
