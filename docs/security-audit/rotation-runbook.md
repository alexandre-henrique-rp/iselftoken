# Runbook de rotação de credenciais — F-16/F-17

Este procedimento encerra F-16 e F-17 somente após a rotação ser executada nos provedores e validada em produção. **Nunca cole valores de segredo neste arquivo, no chat ou em logs.**

## Escopo

- F-16: credenciais AWS/SMTP/EFI/JWT que possam ter existido em arquivos locais ou sido compartilhadas.
- F-17: `EFI_WEBHOOK_HMAC_SECRET` utilizado para autenticar callbacks da EFI.
- Arquivo esperado pelo provisionamento: `/etc/iselftoken/ec2-api.env`.
- Permissões obrigatórias: proprietário `root:root`, modo `600`.

## Pré-condições e segurança

1. Fazer a operação em janela de manutenção aprovada. A rotação de `JWT_SECRET` invalida tokens existentes e pode exigir limpeza coordenada das sessões Redis.
2. Usar um cofre/secret manager aprovado ou o arquivo root-only da EC2. Não enviar segredos por email, ticket, chat, GitHub Actions output ou shell history.
3. Registrar somente metadados não secretos: provedor, identificador da credencial, data/hora UTC, operador, ambiente e resultado do teste.
4. Não remover `CHAVES/`, CSVs ou cópias locais antes de confirmar que a operação e o rollback foram concluídos. A remoção definitiva exige aprovação do responsável pelo material.
5. Preferir IAM Role da EC2 para S3/SES e eliminar access keys estáticas quando o serviço suportar essa configuração.

## 1. Inventário sem exposição

- Listar apenas nomes de variáveis e identificadores das credenciais, nunca os valores.
- Confirmar quais ambientes consomem cada credencial: desenvolvimento, homologação e produção.
- Confirmar que os arquivos de exemplo continuam vazios ou com placeholders não utilizáveis.
- Confirmar que o deploy usa `/etc/iselftoken/ec2-api.env` e não lê `.env` versionado.

Exemplos seguros de verificação local:

```bash
stat -c '%U:%G %a %n' /etc/iselftoken/ec2-api.env
awk -F= '/^(JWT_SECRET|WEBHOOK_HASH_SECRET|EFI_WEBHOOK_HMAC_SECRET|SMTP_PASS|AWS_SECRET_ACCESS_KEY)=/ { print $1 "=<redacted>" }' /etc/iselftoken/ec2-api.env
```

O segundo comando deve ser usado somente para confirmar a presença dos nomes; não altere o comando para imprimir valores.

## 2. AWS

1. Identificar access keys antigas por **ID**, sem revelar o secret access key.
2. Criar nova credencial temporária ou, preferencialmente, atribuir IAM Role à EC2 com permissões mínimas para S3/SES.
3. Atualizar o secret manager ou `/etc/iselftoken/ec2-api.env` com a nova configuração.
4. Reiniciar o serviço de API conforme o procedimento de deploy.
5. Validar com uma identidade sem imprimir credenciais:

```bash
aws sts get-caller-identity --output json
```

6. Executar uma operação mínima autorizada: leitura/listagem controlada do bucket de produção e envio SES para um destinatário de teste aprovado.
7. Desativar a credencial antiga, observar métricas/logs por uma janela definida e removê-la após confirmação.

## 3. SMTP/SES

1. Criar novas credenciais SMTP no provedor/IAM com escopo mínimo de envio.
2. Atualizar `SMTP_USER` e `SMTP_PASS` no secret manager ou arquivo root-only. Não registrar o conteúdo.
3. Reiniciar a API e confirmar que o healthcheck não acusa falha de SMTP.
4. Enviar um email transacional de teste para uma caixa controlada, verificando remetente, TLS e entrega.
5. Desativar a credencial SMTP antiga somente após o teste bem-sucedido.

## 4. JWT e segredos internos

Gerar valores independentes e fortes, sem reutilização entre domínios:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # WEBHOOK_HASH_SECRET
openssl rand -hex 32      # EFI_WEBHOOK_HMAC_SECRET
```

Para cada valor:

1. Atualizar exclusivamente o mecanismo de secrets aprovado.
2. Confirmar que o valor possui pelo menos 32 caracteres.
3. Reiniciar a API e verificar que o bootstrap passa.
4. Para `JWT_SECRET`, invalidar sessões/tokens antigos conforme o plano aprovado e confirmar login + 2FA de um usuário de teste.
5. Para `WEBHOOK_HASH_SECRET`, confirmar que novos logs usam HMAC e que nenhum valor de PII é gravado em texto puro.

## 5. EFI — F-17

1. No painel/provedor EFI, gerar ou solicitar novo `EFI_WEBHOOK_HMAC_SECRET` e, quando aplicável, novos `EFI_CLIENT_ID`/`EFI_CLIENT_SECRET`.
2. Configurar o mesmo segredo novo no secret manager/arquivo root-only da produção.
3. Confirmar no painel o endpoint de webhook e a janela de ativação.
4. Reiniciar a API e executar callback sandbox/controlado com assinatura válida.
5. Confirmar que assinatura inválida é rejeitada e que assinatura válida não duplica pagamento nem libera tokens indevidamente.
6. Revogar o segredo antigo no provedor e guardar apenas o identificador/auditoria da revogação.

## 6. Pós-rotação

- [ ] API iniciou sem fallback ou placeholder.
- [ ] `stat` confirma `root:root` e `600` no arquivo de secrets, quando esse método for usado.
- [ ] AWS S3/SES funcionam com a nova identidade ou IAM Role.
- [ ] Email SMTP de teste foi entregue com TLS.
- [ ] Login, 2FA e logout funcionam após a rotação de JWT.
- [ ] Webhook EFI válido foi aceito e inválido foi rejeitado.
- [ ] Não há segredos em logs, artefatos de build, relatórios ou diff.
- [ ] Credenciais antigas aparecem como desativadas/revogadas no provedor.
- [ ] Cópias locais/operacionais antigas foram tratadas conforme aprovação de retenção.

## Evidência necessária para fechar F-16/F-17

A auditoria pode mudar os status para `resolved` somente quando houver evidência não secreta de todos os itens relevantes:

- IDs/ARNs ou últimos quatro caracteres das credenciais antigas e novas, sem valores secretos.
- Registro do provedor mostrando rotação e revogação/desativação das credenciais antigas.
- Timestamp UTC do deploy que passou a usar os novos secrets.
- Resultado dos smoke tests AWS, SMTP, autenticação e webhook EFI.
- Confirmação do owner de produção sobre secret manager ou arquivo root-only.
- Decisão aprovada sobre retenção/remoção de `CHAVES/` e CSVs operacionais.

Sem essa evidência, F-16/F-17 devem permanecer `open`, mesmo que o código e o provisionamento estejam saneados.
