---
Descrição: Regras de Negócio do Projeto iSelfToken
---

# Regras de Negócio

## Autenticação e Autorização
- Usuários devem se autenticar para acessar áreas protegidas da aplicação.
- A autenticação de dois fatores (A2F) é obrigatória para todos os usuários logados, garantindo maior segurança.
- Middleware verifica a presença de cookies de sessão e A2F para liberar ou redirecionar acessos.
- Roles de usuário (investidor, startup, admin, afiliado) determinam as rotas acessíveis e os redirecionamentos após autenticação.

## Validações e Constraints
- Formulários de registro e login possuem validações rigorosas via Zod, incluindo formatos específicos para CPF, CNPJ, telefone e CEP.
- Dados mascarados são sanitizados antes do envio para o backend.
- Código A2F deve ser um número de 6 dígitos, validado no frontend (em ambiente de desenvolvimento) e no backend.

## Fluxos de Trabalho Específicos
- **Registro**: Usuários escolhem um perfil (investidor ou startup) e preenchem formulários específicos com validação em tempo real.
- **Login**: Autenticação via e-mail e senha, seguida de verificação A2F se necessário.
- **A2F**: Geração e envio de código por e-mail; validação do código inserido pelo usuário atualiza o status do cookie `a2f-verified`.
- **Recuperação/Redefinição de Senha**: Fluxo para recuperação de conta via e-mail com link temporário para redefinição.

## Permissões e Controle de Acesso
- Middleware redireciona usuários com base em sua role após autenticação e verificação A2F:
  - Investidor: `/home`
  - Startup: `/dashboard`
  - Admin: a definir
  - Afiliado: a definir
- Rotas `/api/*` têm bypass no middleware para permitir chamadas de API sem redirecionamento.

## Exceções e Tratamento de Erros
- Erros de validação de formulário são exibidos inline com mensagens claras.
- Falhas na validação de código A2F exibem mensagens via `toast` (lib `sonner`).
- Erros de API são capturados e exibidos ao usuário de forma amigável.
