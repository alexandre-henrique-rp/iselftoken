"""
Gerador do Relatorio de Auditoria de Seguranca — IselfToken
Stack: Python 3.14 + reportlab 5 + matplotlib 3.11 (ambiente isolado)
"""

import os
import json
import datetime
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageTemplate,
    Frame,
    BaseDocTemplate,
)
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ============================================================
# Dados da auditoria
# ============================================================
PROJECT_NAME = "IselfToken"
REPORT_DATE = datetime.date(2026, 9, 9).strftime("%d/%m/%Y")
OUTPUT_DIR = Path("docs/security-audit")
OUTPUT_PDF = OUTPUT_DIR / "relatorio-auditoria-seguranca.pdf"
OUTPUT_JSON = OUTPUT_DIR / "issues.json"

# Paleta do briefing
COLORS = {
    "critica": HexColor("#B91C1C"),
    "alta": HexColor("#EA580C"),
    "media": HexColor("#D97706"),
    "baixa": HexColor("#2563EB"),
    "forte": HexColor("#059669"),
    "ink": HexColor("#0F172A"),
    "muted": HexColor("#64748B"),
    "rule": HexColor("#E2E8F0"),
    "bg": HexColor("#F8FAFC"),
    "card": HexColor("#FFFFFF"),
}

# Achados estruturados
FINDINGS = [
    # ============== CATEGORIA 1 — BANCO SEM TRANCA ==============
    {
        "id": "F-02",
        "cat": 1,
        "cat_name": "Isolamento por userId",
        "sev": "critica",
        "title": "PUT /campaigns/:id/resources sem autenticacao nem checagem de owner",
        "file": "backendnode/src/api/campaigns/campaigns.controller.ts",
        "line": "201-214",
        "evidence": "@Put(':id/resources') async updateResources(@Param('id') id, @Body() dto) { return this.resources.replaceAll(+id, dto.resourceAllocations); }",
        "why": "Rota desprotegida (sem @UseGuards). Atacker anonimo pode chamar PUT /campaigns/123/resources com payload malicioso e SUBSTITUIR as alocacoes de recursos de qualquer campanha — a unica protecao eh o @Body() ser validado por DTO.",
        "impact": "Manipulacao das alocacoes de 100% de recursos de qualquer campanha. Quebra de regra de negocio B05/CVM 88/2022. Frontend deixa de exibir informacoes confiaveis.",
        "fix": "Adicionar @UseGuards(AuthGuard) e validar que req.user.id eh o founder da startup dona da campanha antes de replaceAll.",
        "status": "resolved",
    },
    {
        "id": "F-03",
        "cat": 1,
        "cat_name": "Isolamento por userId",
        "sev": "alta",
        "title": "GET /startup/:id publico retorna email do founder (LGPD)",
        "file": "backendnode/src/api/startup/service/startup-crud.service.ts",
        "line": "647-685",
        "evidence": "founder: { select: { id: true, nome: true, email: true } } (linha 658-660) — controller (startup.controller.ts:137-148) nao tem @UseGuards",
        "why": "Rota GET /startup/:id eh publica (sem guard). O payload inclui o email do founder. Qualquer visitante anonimo consegue listar founders da plataforma e seus emails.",
        "impact": "Violacao de LGPD: exposicao de PII (email) sem consentimento ou necessidade. Possivel alvo de phishing/scraping.",
        "fix": "Remover `email: true` do select de founder. Se o email for necessario para CTAs, criar endpoint autenticado /api/startups/:id/contact que retorna mascarado e rate-limited.",
        "status": "resolved",
    },
    {
        "id": "F-04",
        "cat": 1,
        "cat_name": "Isolamento por userId",
        "sev": "media",
        "title": "GET /campaigns e /campaigns/:id publicos sem filtro de status",
        "file": "backendnode/src/api/campaigns/service/campaigns-crud.service.ts",
        "line": "20-77 / 79-156",
        "evidence": "findAll aplica a allowlist PUBLIC_CAMPAIGN_STATUSES = ['OPEN', 'FUNDED', 'PAID_OUT']; findOne exige `id` e status nessa mesma allowlist. O endpoint administrativo protegido `/admin/compliance/campaigns` permite Compliance/Admin revisar campanhas DRAFT, PAUSED e CLOSED sem usar o catalogo publico.",
        "why": "Endpoint publico retorna campanhas nao publicadas quando nao restringe os status. Visitantes podem ver campanhas em rascunho com dados internos.",
        "impact": "Vazamento de informacoes de campanhas nao publicadas (incluindo dados bancarios da startup, dados de receita, projecoes).",
        "fix": "Manter o catalogo publico restrito a OPEN, FUNDED e PAID_OUT. Para revisao administrativa de DRAFT, PAUSED e CLOSED, usar GET /admin/compliance/campaigns e GET /admin/compliance/campaigns/:id com AuthGuard + AdminGuard; os BFFs de Compliance foram migrados para essas rotas.",
        "status": "resolved",
    },
    {
        "id": "F-05",
        "cat": 1,
        "cat_name": "Isolamento por userId",
        "sev": "media",
        "title": "GET /campaigns/:id/resources sem filtro de status e projecao segura",
        "file": "backendnode/src/api/campaigns/campaigns.controller.ts",
        "line": "188-219",
        "evidence": "A leitura publica valida status OPEN/FUNDED/PAID_OUT e seleciona apenas categoria, percentual e descricaoCustomizada. Campanhas DRAFT/PAUSED/CLOSED usam /campaigns/:id/resources/private com AuthGuard e verificacao de owner/papel administrativo.",
        "why": "A rota anterior consultava alocacoes de qualquer campanha e retornava o row Prisma completo, incluindo IDs e timestamps internos. Isso permitia inferir estrategia de campanhas nao publicadas.",
        "impact": "Vazamento de estrategia de alocacao e metadados internos de campanhas para visitantes e usuarios sem ownership.",
        "fix": "Manter a leitura publica apenas para campanhas OPEN/FUNDED/PAID_OUT com DTO minimo. Para campanhas nao publicadas, exigir AuthGuard e permitir somente o founder owner ou ADMIN, FINANCEIRO e COMPLIANCE.",
        "status": "resolved",
    },
    {
        "id": "F-06",
        "cat": 1,
        "cat_name": "Isolamento por userId",
        "sev": "baixa",
        "title": "POST /payment aceita subscriptionId/investmentId/campaignId do body sem ownership",
        "file": "backendnode/src/api/payment/payment.service.ts",
        "line": "111-190, 1795-1840",
        "evidence": "PaymentService.validatePaymentReferences() roda antes de payment.create() e de createCheckout(). SUBSCRIPTION consulta subscription.findFirst({ id, userId }); INVESTMENT consulta investment.findFirst({ id, userId }) e exige campaignId consistente quando informado; TOKEN_RESERVATION consulta campaign.findFirst({ id, startup: { founderId: userId } }); demais propositos rejeitam IDs relacionados. Referencias inexistentes ou de outra conta retornam REFERENCIA_PAGAMENTO_INVALIDA. A confirmacao de investimento tambem repassa payment.userId ao InvestmentsService.",
        "why": "User A podia enviar subscriptionId, investmentId ou campaignId de B no body. Sem validar o vinculo antes da criacao, o Payment era aceito com uma referencia pertencente a outra conta ou com combinacoes inconsistentes.",
        "impact": "Criacao de payments vinculados a recursos de outros usuarios, possibilidade de efeitos de dominio na conta errada e inconsistencias entre investimento e campanha.",
        "fix": "Validar ownership e combinacoes por purpose no servico, antes de inserir o Payment: assinatura pertence ao pagador; investimento pertence ao pagador; campaignId de INVESTMENT apenas coincide com o investimento; TOKEN_RESERVATION exige campanha da startup do founder; propósitos sem relacionamento rejeitam IDs extras. Cobertura unitária inclui cross-user, referencias invalidas, combinacoes inconsistentes e fluxos legitimos.",
        "status": "resolved",
    },
    {
        "id": "F-07",
        "cat": 1,
        "cat_name": "Isolamento por userId",
        "sev": "baixa",
        "title": "GET /admin/config/fundraising e /admin/config/parameters acessiveis a qualquer user autenticado",
        "file": "backendnode/src/api/admin/admin.controller.ts",
        "line": "269-447; config.service.ts: public snapshot; frontend new-startup-loader.ts",
        "evidence": "AdminConfigController agora usa @UseGuards(AuthGuard, AdminGuard) no nível da classe, protegendo GET /admin/config/fundraising e GET /admin/config/parameters, além das escritas. O wizard de founder deixou de consumir o endpoint administrativo e usa /config/fundraising, protegido por AuthGuard, que retorna somente os campos operacionais necessários, sem histórico ou metadados administrativos.",
        "why": "Os GETs administrativos estavam acessíveis a qualquer usuário autenticado porque a classe tinha somente AuthGuard. Além do vazamento de configurações de negócio, o bloqueio direto poderia quebrar o wizard de founder, que dependia indevidamente do endpoint admin.",
        "impact": "Usuários comuns podiam consultar taxas, limites e histórico de parâmetros administrativos. O fallback silencioso do wizard também podia usar defaults frontend divergentes do backend.",
        "fix": "Adicionar AuthGuard + AdminGuard no nível da classe AdminConfigController e remover guards redundantes dos métodos. Criar leitura operacional autenticada em /config/fundraising com payload mínimo para founders, migrar BFF/loader/query do wizard e cobrir ADMIN/FINANCEIRO/COMPLIANCE, bloqueio de USER, contrato mínimo e propagação de 403.",
        "status": "resolved",
    },
    # ============== CATEGORIA 2 — PERMISSAO DEFINIDA NO NAVEGADOR ==============
    {
        "id": "F-08",
        "cat": 2,
        "cat_name": "Autorizacao servidor",
        "sev": "media",
        "title": "AdminGuard usado sem AuthGuard — rotas admin inacessiveis OU 403 fixo",
        "file": "backendnode/src/api/payment/split/split.controller.ts",
        "line": "35-88",
        "evidence": "Auditoria global confirmou que a única ocorrência de @UseGuards(AdminGuard) isolado estava nos métodos create, update e deactivate do SplitController. O controller agora declara @UseGuards(AuthGuard, AdminGuard) na classe, na ordem explícita de autenticação e autorização, sem guards administrativos isolados nos métodos.",
        "why": "AdminGuard depende de request.user populado pelo AuthGuard. Quando a autorização era declarada separadamente no método, a dependência entre os guards ficava implícita e o padrão podia causar 403 incorreto para requisições sem autenticação ou ser replicado de forma insegura.",
        "impact": "As rotas administrativas de split passam a autenticar a sessão antes de validar ADMIN, FINANCEIRO ou COMPLIANCE, evitando bloqueio funcional de administradores válidos e mantendo USER sem autorização.",
        "fix": "Combinar @UseGuards(AuthGuard, AdminGuard) no nível da classe SplitController e remover decorators AdminGuard redundantes dos métodos. Regressão verifica a metadata na ordem exata; testes de AdminGuard cobrem ausência de usuário, USER e os três papéis administrativos.",
        "status": "resolved",
    },
    {
        "id": "F-09",
        "cat": 2,
        "cat_name": "Autorizacao servidor",
        "sev": "baixa",
        "title": "Frontend tem useUserRole()/hasRole() mas o backend eh a fonte de verdade — sem furo direto encontrado",
        "file": "AGENTS.md; frontend/AGENTS.md; frontend/app/hooks/use-user-role.ts",
        "line": "Frontend auth docs; use-user-role.ts:1-35",
        "evidence": "A regra foi documentada no AGENTS.md raiz e em frontend/AGENTS.md: useUserRole()/hasRole() controlam somente affordances visuais. O hook agora declara explicitamente que nunca substitui autorização server-side; endpoints continuam protegidos por AuthGuard + AdminGuard/ComplianceGuard/FinanceRoleGuard. A regressão use-user-role.spec.ts cobre roles válidas, ausência de usuário e role desconhecida.",
        "why": "A prática correta já estava em uso, mas o limite de segurança entre UI e backend não estava explícito na documentação nem coberto por teste do hook. Sem essa regra, uma futura tela poderia tratar o gate visual como autorização ou omitir a revalidação server-side.",
        "impact": "Nenhum bypass imediato foi encontrado. A documentação e a regressão reduzem o risco de uma futura rota administrativa confiar em role derivada do navegador, DOM, estado local ou resposta mockada.",
        "fix": "Documentar que o gate de UI é cosmético e que toda permissão DEVE ser revalidada no backend com sessão HTTP-only, AuthGuard e guard de domínio apropriado. Manter o hook sem responsabilidade de autorização e cobrir sua derivação de role com teste unitário.",
        "status": "resolved",
    },
    # ============== CATEGORIA 3 — IDOR ==============
    {
        "id": "F-10",
        "cat": 3,
        "cat_name": "IDOR",
        "sev": "critica",
        "title": "GET /tokens/:id — IDOR permite ler qualquer token pelo UUID",
        "file": "backendnode/src/api/tokens/tokens.controller.ts; tokens.service.ts",
        "line": "25-31; tokens.service.ts:139-190",
        "evidence": "A implementação atual extrai req.user.id no TokensController.detail() e chama getTokenById(id, req.user.id). O TokensService aplica findFirst({ where: { id: tokenId, userId } }), fazendo Token de outra conta resultar em 404 sem payload. A regressão tokens.service.spec.ts cobre owner e cross-user; tokens.controller.spec.ts confirma o encaminhamento do userId e metadata AuthGuard. AuthGuard também tem regressão para ausência de sessionId.",
        "why": "A evidência histórica descrevia uma consulta somente por id, que permitiria ao usuário A ler o Token do usuário B. O source atual já contém o filtro composto, mas a ausência de testes co-localizados deixava o contrato de ownership sem proteção contra regressão.",
        "impact": "Sem o filtro, haveria vazamento do hash, valores, certificado e histórico do Token. Com a implementação atual e a regressão adicionada, UUID de outra conta é indistinguível de token inexistente no detalhe privado.",
        "fix": "Preservar o filtro obrigatório por { id: tokenId, userId } no detalhe privado e o encaminhamento de req.user.id pelo controller. Não criar /admin/tokens/:id sem requisito de negócio; o certificado mantém regra explícita: owner ou ADMIN. Adicionar testes para owner, cross-user, AuthGuard, USER e ADMIN.",
        "status": "resolved",
    },
    {
        "id": "F-11",
        "cat": 3,
        "cat_name": "IDOR",
        "sev": "critica",
        "title": "PUT /campaigns/:id/resources — IDOR permite alterar recursos de qualquer campanha",
        "file": "backendnode/src/api/campaigns/campaigns.controller.ts; campaigns/service/campaign-resource.service.ts",
        "line": "225-240; campaign-resource.service.ts:114-131",
        "evidence": "A rota PUT /campaigns/:id/resources usa @UseGuards(AuthGuard), recebe req.user e encaminha a identidade ao service. CampaignResourceService.replaceAll busca startup.founderId antes da transação e permite somente o founder owner ou ADMIN; founder de outra startup, USER, FINANCEIRO e COMPLIANCE recebem NOT_OWNER sem delete/create. A regressão de controller confirma AuthGuard e encaminhamento; a regressão do service cobre owner, cross-owner, ADMIN, FINANCEIRO, COMPLIANCE, USER e campanha inexistente.",
        "why": "A evidência histórica descrevia uma rota sem autenticação que aceitava somente o campaignId enviado pelo cliente. Isso permitiria substituir as alocações de qualquer campanha. O source atual já valida a sessão no controller e ownership no service; o finding permaneceu aberto por falta de sincronização e cobertura explícita para todos os papéis.",
        "impact": "Sem a proteção, qualquer visitante ou founder de outra startup poderia manipular a estratégia de alocação de recursos. Com AuthGuard, ownership e teste de ausência de transação em falhas, a alteração cross-startup fica bloqueada para papéis não ADMIN.",
        "fix": "Preservar @UseGuards(AuthGuard) no PUT, encaminhar req.user e manter a checagem founderId ou role ADMIN antes de iniciar $transaction. Cobrir anônimo via AuthGuard, owner legítimo, cross-owner, ADMIN, FINANCEIRO, COMPLIANCE, USER e campanha inexistente. Não alterar a regra de negócio atual que permite escrita cross-startup somente a ADMIN.",
        "status": "resolved",
    },
    {
        "id": "F-12",
        "cat": 3,
        "cat_name": "IDOR",
        "sev": "alta",
        "title": "GET /startup/marketplace/private/:slug — sem checar se user eh founder/compliance/admin",
        "file": "backendnode/src/api/startup/startup.controller.ts; startup.service.ts; startup-crud.service.ts",
        "line": "109-144; 58-66; 520-668",
        "evidence": "O endpoint owner/admin usa @UseGuards(AuthGuard), recebe req.user e chama findPrivate(slug, req.user). O StartupCrudService aplica founderId = request.user.id para founders e permite somente ADMIN, FINANCEIRO e COMPLIANCE sem esse filtro. A descoberta de investidores foi separada em /marketplace/authenticated/:slug, também protegida por AuthGuard, com payload mínimo sem id interno ou PII. Testes cobrem owner, cross-user, papéis administrativos, USER/INVESTOR, inexistente e metadata dos guards.",
        "why": "A evidência histórica mostrava que qualquer sessão válida podia consultar qualquer slug pelo endpoint chamado private. Isso permitia acesso cross-user ao detalhe sem checagem de ownership. A correção preserva o fluxo legítimo de descoberta antes do investimento em endpoint autenticado separado e restringe a superfície private ao owner/admin no servidor.",
        "impact": "Sem a proteção, um founder poderia consultar o detalhe privado de startup de outro founder. Com a autorização por founderId, o cross-user retorna 404 sem payload; papéis administrativos continuam podendo revisar startups, e investidores autenticados recebem somente o contrato mínimo necessário para análise e checkout.",
        "fix": "Passar request.user ao service, filtrar Startup.founderId para o endpoint private e permitir apenas ADMIN, FINANCEIRO e COMPLIANCE como bypass administrativo. Usar endpoint autenticado separado para investidores, sem id interno, dados bancários, email, CNPJ ou documento do titular; manter preview do founder dependente do endpoint owner/admin.",
        "status": "resolved",
    },
    {
        "id": "F-13",
        "cat": 3,
        "cat_name": "IDOR",
        "sev": "media",
        "title": "GET /campaigns/:id — projeção pública expunha dados completos da campanha",
        "file": "backendnode/src/api/campaigns/service/campaigns-crud.service.ts; campaigns.controller.ts",
        "line": "88-157; 56-61",
        "evidence": "O detalhe público mantém a allowlist server-side de status OPEN, FUNDED e PAID_OUT; DRAFT, PAUSED e CLOSED resultam em 404. A consulta agora usa select explícito e o mapper retorna somente id/título/status/valores públicos, deadline, startup com nome/slug/área/estágio/logo e métricas derivadas. Não são retornados investimentos individuais, tokens, hashes, CNPJ, razão social, descrição ou campos internos. A revisão administrativa continua em /admin/compliance/campaigns/:id com AuthGuard + AdminGuard. Testes cobrem projeção mínima, status não públicos e separação administrativa.",
        "why": "A evidência histórica tratava o endpoint como capaz de retornar qualquer campanha e o registro completo. O filtro de status já existia no source atual, mas a resposta ainda fazia over-fetching com investimentos, tokens e campos sensíveis da startup. A correção preserva o detalhe público para campanhas publicadas e transforma o retorno em uma projeção explícita.",
        "impact": "Sem a projeção, visitantes poderiam coletar linhas de investimento, tokens, hashes e dados cadastrais/operacionais de campanhas publicadas; campanhas não publicadas também poderiam ser alvo de enumeração se a allowlist regredisse. Com a consulta filtrada e o payload mínimo, o catálogo público não expõe ativos, transações individuais ou dados administrativos.",
        "fix": "Manter a allowlist OPEN/FUNDED/PAID_OUT no detalhe público e substituir include/spread do registro por select e mapper explícitos. Remover investimentos, tokens/hashes, CNPJ, razão social, descrição e campos internos do contrato público; manter o endpoint administrativo separado para revisão completa de qualquer status.",
        "status": "resolved",
    },
    # ============== CATEGORIA 4 — CHAVES EXPOSTAS ==============
    {
        "id": "F-14",
        "cat": 4,
        "cat_name": "Segredos hardcoded",
        "sev": "critica",
        "title": "JWT_SECRET sem fallback e validado no bootstrap",
        "file": "backendnode/src/auth/auth.module.ts; backendnode/src/common/config/env.schema.ts",
        "line": "24-30; 25-33",
        "evidence": "AuthModule injeta ConfigService e lê JWT_SECRET sem valor alternativo; envSchema exige segredo presente com no mínimo 32 caracteres e rejeita placeholders conhecidos. app.module.ts executa envSchema.parse(config) durante o bootstrap.",
        "why": "A implementação anterior permitia inicializar a aplicação com uma chave JWT conhecida quando a variável não era configurada. A configuração atual falha de forma explícita antes de servir requisições.",
        "impact": "O fallback previsível foi removido; a falsificação de tokens por ausência de segredo deixa de ser possível no caminho de inicialização validado.",
        "fix": "Remover o fallback, centralizar a validação em envSchema e cobrir ausência, tamanho mínimo, vazio e placeholders com testes unitários.",
        "status": "resolved",
    },
    {
        "id": "F-15",
        "cat": 4,
        "cat_name": "Segredos hardcoded",
        "sev": "alta",
        "title": "WEBHOOK_HASH_SECRET obrigatório e sem fallback hardcoded",
        "file": "backendnode/src/api/webhook/webhook-log.service.ts; backendnode/src/common/config/env.schema.ts",
        "line": "73-77; 35-43",
        "evidence": "WebhookLogService usa ConfigService.getOrThrow('WEBHOOK_HASH_SECRET'); envSchema exige segredo com no mínimo 32 caracteres e rejeita placeholders conhecidos. O teste verifica HMAC-SHA256 com segredo injetado e falha quando ausente.",
        "why": "A implementação anterior usava uma chave conhecida quando WEBHOOK_HASH_SECRET não estava configurado, permitindo correlação de PII anonimizada nos logs. O serviço agora falha sem configuração válida.",
        "impact": "A anonimização HMAC de PII em logs de webhook não depende mais de um segredo publicado ou implícito.",
        "fix": "Remover o fallback, separar o segredo de JWT/EFI, exigir configuração no schema e cobrir o comportamento com teste unitário.",
        "status": "resolved",
    },
    {
        "id": "F-16",
        "cat": 4,
        "cat_name": "Segredos hardcoded",
        "sev": "alta",
        "title": "Credenciais operacionais exigem rotação e secret manager",
        "file": "backendnode/.env, backendnode/.env.prod, infra/prod/ec2-api/user-data.sh",
        "line": "global",
        "evidence": "Os arquivos de ambiente versionados localmente foram sanitizados e o provisionamento deixou de conter valores de AWS/SMTP/EFI/JWT; user-data lê /etc/iselftoken/ec2-api.env com permissões root-only. Não há evidência operacional de revogação/rotação dos valores que existiram fora do código nem de migração para um secret manager.",
        "why": "Remover valores do código e exigir injeção externa reduz exposição futura, mas não invalida credenciais que possam ter sido copiadas ou comprometidas anteriormente.",
        "impact": "AWS, SMTP e EFI permanecem dependentes de rotação coordenada com os provedores e de confirmação do armazenamento seguro em produção.",
        "fix": "Pendente: revogar e gerar novas credenciais nos provedores, atualizar o secret manager/arquivo root-only de produção, validar o deploy e remover cópias operacionais antigas após confirmação.",
        "status": "open",
    },
    {
        "id": "F-17",
        "cat": 4,
        "cat_name": "Segredos hardcoded",
        "sev": "media",
        "title": "EFI_WEBHOOK_HMAC_SECRET depende de rotação operacional",
        "file": "backendnode/.env, backendnode/.env.prod, infra/prod/ec2-api/user-data.sh",
        "line": "global",
        "evidence": "Os exemplos e o provisionamento não carregam um valor de EFI_WEBHOOK_HMAC_SECRET; o user-data exige a variável na fonte externa de secrets. A rotação no painel/provedor EFI e a confirmação de revogação do valor anterior ainda não foram executadas.",
        "why": "A configuração deixou de publicar um valor de desenvolvimento no fluxo de provisionamento, mas a correção operacional não pode ser comprovada apenas pelo repositório.",
        "impact": "Até a rotação confirmada, um valor antigo eventualmente compartilhado pode permitir falsificação de callbacks EFI.",
        "fix": "Pendente: gerar HMAC forte, atualizar a configuração da EFI e da produção, revogar o valor anterior e executar teste de assinatura controlado.",
        "status": "open",
    },
    {
        "id": "F-18",
        "cat": 4,
        "cat_name": "Segredos hardcoded",
        "sev": "baixa",
        "title": "VITE_EFI_PAYEE_CODE público por design (informativo)",
        "file": "frontend/.env, frontend/.env.prod",
        "line": "global",
        "evidence": "VITE_EFI_PAYEE_CODE é embutido no bundle por ser uma variável pública do frontend; o payee_code não é credencial segundo o contrato da EFI. Nenhuma chave privada ou HMAC é derivada desse valor.",
        "why": "Variáveis VITE_* são visíveis no navegador. Este achado não representa segredo exposto, mas a natureza pública deve permanecer documentada para evitar uso indevido.",
        "impact": "Nenhum impacto de confidencialidade identificado; o código público é esperado para iniciar pagamentos destinados ao recebedor configurado.",
        "fix": "Manter a documentação explícita de que payee_code é público e não reutilizá-lo como segredo de autenticação.",
        "status": "open",
    },
    # ============== CATEGORIA 5 — INPUTS SEM TRATAMENTO (XSS) ==============
    {
        "id": "F-19",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS / template injection",
        "sev": "critica",
        "title": "Templates de email escapam dados e validam links dinâmicos",
        "file": "backendnode/src/email/templates/verification-code.template.ts; backendnode/src/api/email-templates/email-render.service.ts",
        "line": "12-75; 100-124",
        "evidence": "O template de código aplica escapeHtml a nome, ação, código e validade, usa escapeSafeUrl para redirectPath e mantém href entre aspas. O renderer de templates escapa placeholders HTML, valida href/src dinâmicos e mantém texto/assunto em contexto textual.",
        "why": "O vetor histórico combinava interpolação de dados do usuário sem escaping e redirectPath sem validação. A cadeia foi fechada nos templates hardcoded e no renderer de templates persistidos.",
        "impact": "Scripts, handlers e javascript: URLs fornecidos nos dados não são renderizados como HTML executável nem aceitos como links dinâmicos.",
        "fix": "Aplicar escaping contextual nos templates, validar URLs antes do escaping, usar atributos href citados e cobrir payloads XSS/URLs inseguras nos testes de renderer e templates.",
    },
    {
        "id": "F-20",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS / template injection",
        "sev": "alta",
        "title": "Templates welcome e forgot-password escapam dados do usuário",
        "file": "backendnode/src/email/templates/welcome.template.ts, forgot-password.template.ts",
        "line": "9-52 / 10-62",
        "evidence": "welcomeTemplate aplica escapeHtml a nome e email; forgotPasswordTemplate aplica escapeHtml a nome, código e validade antes de montar o HTML.",
        "why": "Os templates de boas-vindas e recuperação eram parte do mesmo vetor de interpolação HTML sem escaping identificado na auditoria.",
        "impact": "Dados maliciosos nesses fluxos são tratados como texto, sem execução de markup ou handlers no cliente de email.",
        "fix": "Aplicar escaping HTML contextual em todas as interpolações dinâmicas dos templates e manter regressões para payloads de markup.",
    },
    {
        "id": "F-21",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS / template injection",
        "sev": "alta",
        "title": "EmailRenderService usa escaping contextual no HTML",
        "file": "backendnode/src/api/email-templates/email-render.service.ts",
        "line": "13-26; 100-124",
        "evidence": "interpolate recebe escapeValues; render chama interpolate(..., true) para HTML e false para texto/assunto. Valores ausentes permanecem como placeholders e URLs href/src dinâmicas são validadas antes da interpolação.",
        "why": "A função de escaping deixou de ser código morto: o renderer agora aplica o tratamento adequado ao contexto de saída.",
        "impact": "Templates persistidos não inserem dados de usuário diretamente no HTML sem escaping; texto e assunto não recebem escaping HTML indevido.",
        "fix": "Refatorar a interpolação para distinguir contexto HTML de texto, validar URLs dinâmicas antes do escaping e cobrir campos desconhecidos/obrigatórios.",
    },
    {
        "id": "F-22",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS / template injection",
        "sev": "alta",
        "title": "EmailService escapa texto simples antes de convertê-lo em HTML",
        "file": "backendnode/src/email/email.service.ts",
        "line": "279-284",
        "evidence": "No caso simple, o serviço usa `<p>${escapeHtml(text).replace(/\\n/g, '<br>')}</p>` e mantém o conteúdo original apenas no campo text do email.",
        "why": "A interpolação direta de text em um parágrafo HTML permitia que callers transformassem markup em conteúdo executável.",
        "impact": "Payloads HTML enviados como texto simples são serializados como texto no HTML do email.",
        "fix": "Aplicar escapeHtml ao texto antes de inserir a marcação de quebra de linha e cobrir script/markup nos testes de EmailService.",
    },
    {
        "id": "F-23",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS",
        "sev": "media",
        "title": "Previews HTML de templates usam DOMPurify",
        "file": "frontend/app/lib/sanitize-html.ts; frontend/app/components/admin/email-templates/email-template-preview-modal.tsx; email-template-editor.tsx",
        "line": "helper; preview modal; preview local",
        "evidence": "sanitizeHtmlPreview usa DOMPurify.sanitize com configuração explícita de tags/atributos permitidos. O helper é aplicado tanto ao dangerouslySetInnerHTML do modal quanto ao preview local do editor.",
        "why": "Os dois sinks frontend que renderizam HTML bruto foram tratados; não há confiança direta no HTML vindo do renderer de templates.",
        "impact": "Markup, scripts, event handlers e protocolos perigosos são removidos antes da renderização no painel administrativo.",
        "fix": "Adicionar DOMPurify fixado, centralizar a sanitização em helper reutilizável e cobrir os dois sinks com regressões de XSS e markup seguro.",
    },
    {
        "id": "F-24",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS / template injection",
        "sev": "baixa",
        "title": "termo-adesao-text.ts escapa placeholders dinâmicos",
        "file": "frontend/app/lib/termo-adesao-text.ts",
        "line": "1-45",
        "evidence": "fill aplica escapeHtml aos campos founderName, founderCpf, startupName, startupCnpj e companyEmail antes de substituir placeholders; o texto fixo do termo permanece intacto.",
        "why": "A função aceitava dados futuros do usuário e os inseria sem proteção contextual, criando um vetor adormecido em documento legal.",
        "impact": "Valores dinâmicos com markup são tratados como texto no termo; a substituição futura não reabre XSS por interpolação direta.",
        "fix": "Escapar cada valor dinâmico no contexto HTML antes da substituição e cobrir scripts, atributos e placeholders nos testes unitários.",
    },
    {
        "id": "F-25",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS",
        "sev": "baixa",
        "title": "Sanitização padronizada entre transparency e email-templates",
        "file": "frontend/app/components/transparency/*; frontend/app/lib/sanitize-html.ts; email-template-preview-modal.tsx; email-template-editor.tsx",
        "line": "varia",
        "evidence": "Transparency mantém rehype-sanitize para Markdown; os sinks HTML bruto de email-templates usam sanitizeHtmlPreview baseado em DOMPurify. Cada pipeline usa o sanitizer adequado ao formato de entrada.",
        "why": "A inconsistência histórica era a ausência de sanitização nos previews HTML, não uma necessidade de substituir o pipeline Markdown existente.",
        "impact": "Conteúdo Markdown e HTML bruto não são renderizados sem a camada de sanitização correspondente.",
        "fix": "Preservar rehype-sanitize no Markdown e aplicar DOMPurify centralizado em todos os previews HTML bruto.",
    },
    {
        "id": "F-26",
        "status": "resolved",
        "cat": 5,
        "cat_name": "XSS",
        "sev": "informativa",
        "title": "Transparência usa rehype-sanitize para conteúdo Markdown",
        "file": "frontend/app/components/transparency/*",
        "line": "varia",
        "evidence": "discussion-replies, post-detail e transparency-featured-report importam rehype-sanitize e o utilizam no pipeline ReactMarkdown antes de renderizar conteúdo gerado pelo usuário.",
        "why": "Este achado é um controle positivo da auditoria e permanece válido após a adição do sanitizer específico para previews HTML bruto.",
        "impact": "Conteúdo Markdown de posts e replies permanece mitigado contra markup e scripts não permitidos.",
        "fix": "Nenhuma alteração necessária; manter rehype-sanitize e sua cobertura de uso nos componentes de transparência.",
    },
]

# Pontos fortes verificados
STRENGTHS = [
    "AuthGuard centralizado valida sessao em Redis com TTL 7 dias (auth.guard.ts:46-78). Sem cookie = 401. Sem sessao no Redis = 401. Usuario inativo = 401.",
    "Cookie session_id com flags httpOnly + sameSite=lax + secure em prod (cookies.service.ts:11-16). Nenhum token em localStorage.",
    "Sessao UUID v4 criptograficamente aleatorio (auth.service.ts:192). Colisao computacionalmente impossivel.",
    "TanStack Query: queryClient.clear() em login/register/logout (hooks/use-logout-mutation.ts:19, use-login-mutation.ts:47, use-register-mutation.ts:57). Sem vazamento de cache entre contas no mesmo navegador.",
    "Backend subscriptions.service.findOne/findAll/update/remove checam ownership via req.user.id (subscriptions.service.ts:382-411, 452-477). Sem IDOR no GET/DELETE de subscriptions.",
    "Backend payments.service.findOne (linha 326-394) e generatePix (linha 420-443) checam ownership. Sem IDOR no GET/POST payment.",
    "Backend investments.service (linha 199-426) checa ownership em confirm/cancel/getConfirmation.",
    "Backend notifications.controller usa req.user.id em todas as rotas (notifications.controller.ts:78-90, 109-115, 139-145, 156-162).",
    "Frontend (transparency/*) usa rehype-sanitize em todo o conteudo gerado pelo usuario. Sem XSS no forum de discussao.",
    "Routes admin (/admin/*) tem @UseGuards(AuthGuard, AdminGuard) em 13 controllers (admin.controller.ts, admin-other.controller.ts, admin-kyc.controller.ts, admin-seals.controller.ts, etc).",
    "Helmet CSP configurado (main.ts:39-79) com imgSrc permitindo S3/CloudFront (impede hotlinking de fontes externas nao autorizadas).",
    "Pino/Logger do NestJS usado em producao (sem console.log). Sem exposicao de secrets em logs.",
    "ThrottlerGuard global (main.ts implicito via APP_GUARD se configurado em algum modulo) — defesa contra brute force.",
    "Senhas armazenadas com bcrypt salt rounds=10 (auth.service.ts:402).",
    "BFFs (routes/api/*) propagam Set-Cookie e nao armazenam tokens. Cookies HTTP-only isolam tokens do JS do browser.",
    "EFI webhooks protegidos por WebhookSignatureGuard (pagamento/efi.controller.ts:59).",
    "BackupInterceptor cria snapshot antes de mutacoes destrutivas em users (backup/backup.interceptor.ts).",
    "AuditService registra mudancas de KYC, subscription cancel, etc. (audit/audit.service.ts).",
    "Prisma unique constraints em email e publicId (schema.sqlite.prisma:32-33).",
    "TLS 1.2+ forcado em producao (secure: process.env.NODE_ENV === 'production' no cookie).",
]

# Categorias (resumo executivo)
CATEGORY_COUNTS = {
    1: 0,  # recalcular
    2: 0,
    3: 0,
    4: 0,
    5: 0,
}
for f in FINDINGS:
    CATEGORY_COUNTS[f["cat"]] += 1

SEVERITY_COUNTS = {"critica": 0, "alta": 0, "media": 0, "baixa": 0, "informativa": 0}
for f in FINDINGS:
    if f["sev"] in SEVERITY_COUNTS:
        SEVERITY_COUNTS[f["sev"]] += 1


def build_issue_document():
    """Normaliza os achados para o JSON e para o destaque visual no PDF."""
    priority_by_severity = {
        "critica": "P1",
        "alta": "P1",
        "media": "P2",
        "baixa": "P3",
        "informativa": "P3",
    }
    severity_labels = {
        "critica": "CRÍTICA",
        "alta": "ALTA",
        "media": "MÉDIA",
        "baixa": "BAIXA",
        "informativa": "INFORMATIVA",
    }
    severity_hex = {
        "critica": "#B91C1C",
        "alta": "#EA580C",
        "media": "#D97706",
        "baixa": "#2563EB",
        "informativa": "#059669",
    }
    issues = []
    for finding in FINDINGS:
        issue = dict(finding)
        issue.update(
            {
                "status": finding.get("status", "open"),
                "priority": priority_by_severity.get(finding["sev"], "P3"),
                "severity_label": severity_labels.get(
                    finding["sev"], finding["sev"].upper()
                ),
                "pdf_highlight": {
                    "color": severity_hex.get(finding["sev"], "#0F172A"),
                    "label": severity_labels.get(
                        finding["sev"], finding["sev"].upper()
                    ),
                },
                "acceptance_criteria": [
                    "Teste de regressão reproduzindo o problema antes da correção",
                    "Correção implementada",
                    "Teste de regressão aprovado após a correção",
                    "Revisão manual confirma que o vetor foi fechado",
                ],
            }
        )
        issues.append(issue)

    return {
        "schema_version": "1.0",
        "project": PROJECT_NAME,
        "report_date": REPORT_DATE,
        "source": "docs/security-audit/generate_report.py",
        "status_definitions": {
            "open": "Issue identificada e ainda não validada como corrigida",
            "in_progress": "Correção em andamento",
            "resolved": "Correção implementada e validada",
            "accepted_risk": "Risco conhecido aceito formalmente",
        },
        "summary": {
            "total": len(issues),
            "by_severity": {
                severity: sum(1 for issue in issues if issue["sev"] == severity)
                for severity in SEVERITY_COUNTS
            },
            "by_priority": {
                priority: sum(1 for issue in issues if issue["priority"] == priority)
                for priority in ("P1", "P2", "P3")
            },
            "by_category": {
                str(category): sum(1 for issue in issues if issue["cat"] == category)
                for category in sorted(CATEGORY_COUNTS)
            },
        },
        "issues": issues,
    }


def write_issue_json():
    document = build_issue_document()
    OUTPUT_JSON.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return document


# ============================================================
# Geração dos gráficos
# ============================================================
def make_donut_severity(out_path):
    labels = []
    sizes = []
    colors_list = []
    for sev, color_key in [
        ("critica", "#B91C1C"),
        ("alta", "#EA580C"),
        ("media", "#D97706"),
        ("baixa", "#2563EB"),
    ]:
        if SEVERITY_COUNTS[sev] > 0:
            labels.append(f"{sev.title()} ({SEVERITY_COUNTS[sev]})")
            sizes.append(SEVERITY_COUNTS[sev])
            colors_list.append(color_key)
    if not sizes:
        sizes = [1]
        labels = ["sem achados"]
        colors_list = ["#059669"]

    fig, ax = plt.subplots(figsize=(5, 5), dpi=160)
    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=labels,
        colors=colors_list,
        autopct="%1.0f%%",
        startangle=90,
        wedgeprops=dict(width=0.45, edgecolor="white"),
        textprops=dict(fontsize=10, color="#0F172A"),
    )
    for at in autotexts:
        at.set_color("white")
        at.set_fontweight("bold")
    ax.set_aspect("equal")
    plt.title("Achados por severidade", fontsize=12, fontweight="bold", color="#0F172A")
    plt.tight_layout()
    plt.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close()


def make_bars_category(out_path):
    cat_names = {
        1: "Cat. 1\nIsolamento",
        2: "Cat. 2\nPermissao server",
        3: "Cat. 3\nIDOR",
        4: "Cat. 4\nSegredos",
        5: "Cat. 5\nXSS / Input",
    }
    categories = list(cat_names.values())
    counts = [CATEGORY_COUNTS.get(i, 0) for i in cat_names.keys()]

    fig, ax = plt.subplots(figsize=(7, 3.5), dpi=160)
    bars = ax.bar(
        categories,
        counts,
        color=["#B91C1C", "#EA580C", "#D97706", "#2563EB", "#059669"],
    )
    for b, c in zip(bars, counts):
        if c > 0:
            ax.text(
                b.get_x() + b.get_width() / 2,
                c + 0.1,
                str(c),
                ha="center",
                va="bottom",
                fontsize=11,
                fontweight="bold",
                color="#0F172A",
            )
    ax.set_ylabel("Achados", fontsize=11, color="#0F172A")
    ax.set_title(
        "Achados por categoria", fontsize=12, fontweight="bold", color="#0F172A"
    )
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.set_ylim(0, max(counts + [3]) + 1)
    plt.tight_layout()
    plt.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close()


# ============================================================
# Geração do PDF
# ============================================================
def sev_color(sev):
    return {
        "critica": COLORS["critica"],
        "alta": COLORS["alta"],
        "media": COLORS["media"],
        "baixa": COLORS["baixa"],
        "informativa": COLORS["forte"],
    }.get(sev, COLORS["ink"])


def build_pdf():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    issue_document = write_issue_json()
    issues = issue_document["issues"]
    chart_donut = OUTPUT_DIR / "chart-donut.png"
    chart_bars = OUTPUT_DIR / "chart-bars.png"
    make_donut_severity(chart_donut)
    make_bars_category(chart_bars)

    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm,
        title=f"Relatorio de Auditoria de Seguranca - {PROJECT_NAME}",
        author="Auditoria de Seguranca",
    )

    styles = getSampleStyleSheet()
    # Custom styles
    title_style = ParagraphStyle(
        "TitleX",
        parent=styles["Title"],
        fontSize=24,
        leading=28,
        textColor=COLORS["ink"],
        spaceAfter=10,
    )
    subtitle_style = ParagraphStyle(
        "SubtitleX",
        parent=styles["Normal"],
        fontSize=11,
        textColor=COLORS["muted"],
        leading=14,
        spaceAfter=4,
    )
    h1_style = ParagraphStyle(
        "H1X",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=COLORS["ink"],
        spaceBefore=14,
        spaceAfter=8,
    )
    h2_style = ParagraphStyle(
        "H2X",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=COLORS["ink"],
        spaceBefore=10,
        spaceAfter=6,
    )
    h3_style = ParagraphStyle(
        "H3X",
        parent=styles["Heading3"],
        fontSize=12,
        leading=15,
        textColor=COLORS["ink"],
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "BodyX",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=COLORS["ink"],
        alignment=TA_JUSTIFY,
        spaceAfter=4,
    )
    body_mono = ParagraphStyle(
        "Mono",
        parent=styles["Code"],
        fontSize=8,
        leading=10.5,
        leftIndent=6,
        rightIndent=6,
        backColor=COLORS["bg"],
        borderColor=COLORS["rule"],
        borderWidth=0.5,
        borderPadding=4,
    )
    bullet_style = ParagraphStyle(
        "BulletX",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=COLORS["ink"],
        leftIndent=12,
        bulletIndent=2,
    )
    chip_style_critica = ParagraphStyle(
        "ChipC",
        parent=styles["Normal"],
        fontSize=8.5,
        textColor=white,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )
    small_muted = ParagraphStyle(
        "SmallMuted",
        parent=styles["Normal"],
        fontSize=8.5,
        textColor=COLORS["muted"],
        leading=11,
    )

    story = []

    # ==========================================
    # CAPA
    # ==========================================
    story.append(Spacer(1, 2 * cm))
    story.append(Paragraph(f"Relatorio de Auditoria de Seguranca", title_style))
    story.append(
        Paragraph(
            PROJECT_NAME,
            ParagraphStyle(
                "SubT",
                parent=styles["Title"],
                fontSize=20,
                textColor=COLORS["critica"],
                leading=24,
                spaceAfter=20,
            ),
        )
    )
    story.append(Paragraph(f"Data: {REPORT_DATE}", subtitle_style))
    story.append(
        Paragraph(
            "Escopo auditado: backend NestJS + frontend React Router 7 + auth Redis + persistencia SQLite/MySQL + integracoes (AWS S3, EFI Bank, AWS SES)",
            subtitle_style,
        )
    )
    story.append(
        Paragraph(
            "Categoriais analisadas: 5 (Isolamento por userId, Autorizacao server-side, IDOR, Segredos hardcoded, XSS/Input nao tratado)",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Nota metodologica", h3_style))
    story.append(
        Paragraph(
            "Cada categoria foi mapeada para a stack real do projeto. "
            "Para <b>Isolamento (Cat. 1)</b>: o mecanismo deste projeto eh o filtro manual por "
            "<font face='Courier'>req.user.id</font> no controller/service Prisma (nao ha RLS, middleware de tenant ou schema-per-tenant). "
            "Para <b>Autorizacao (Cat. 2)</b>: o controle esta em NestJS Guards "
            "(<font face='Courier'>AuthGuard</font>, <font face='Courier'>AdminGuard</font>, "
            "<font face='Courier'>ComplianceGuard</font>, <font face='Courier'>FinanceRoleGuard</font>, "
            "<font face='Courier'>TwoFactorGuard</font>). Frontend usa <font face='Courier'>useUserRole()</font>/<font face='Courier'>hasRole()</font> "
            "apenas para esconder UI. Para <b>IDOR (Cat. 3)</b>: 100% dos handlers com parametro "
            "<font face='Courier'>:id</font> foram percorridos. Para <b>Segredos (Cat. 4)</b>: "
            "<font face='Courier'>.env*</font>, <font face='Courier'>.env.example</font>, defaults em codigo e historico git. "
            "Para <b>XSS (Cat. 5)</b>: <font face='Courier'>dangerouslySetInnerHTML</font>, "
            "<font face='Courier'>v-html</font> e templates de email com interpolacao direta.",
            body_style,
        )
    )
    story.append(PageBreak())

    # ==========================================
    # RESUMO EXECUTIVO
    # ==========================================
    story.append(Paragraph("Resumo executivo", h1_style))
    story.append(
        Paragraph(
            f"Foram encontrados <b>{len(issues)} achados</b> no escopo auditado, distribuidos em "
            f"<b>{sum(1 for f in issues if f['sev'] == 'critica')} criticos</b>, "
            f"<b>{sum(1 for f in issues if f['sev'] == 'alta')} altos</b>, "
            f"<b>{sum(1 for f in issues if f['sev'] == 'media')} medios</b> e "
            f"<b>{sum(1 for f in issues if f['sev'] == 'baixa')} baixos</b>.",
            body_style,
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    # Graficos lado a lado
    donut_img = Image(str(chart_donut), width=8 * cm, height=8 * cm)
    bars_img = Image(str(chart_bars), width=11 * cm, height=5.5 * cm)
    chart_table = Table([[donut_img, bars_img]], colWidths=[8.5 * cm, 11.5 * cm])
    chart_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(chart_table)
    story.append(Spacer(1, 0.2 * cm))

    # Mapa visual: o JSON e o PDF usam os mesmos IDs, prioridades e cores.
    story.append(Paragraph("Mapa visual das issues", h2_style))
    story.append(
        Paragraph(
            "Cada linha corresponde a uma issue no arquivo <font face='Courier'>issues.json</font>. "
            "A coluna de severidade usa a mesma cor aplicada nos detalhes técnicos abaixo.",
            body_style,
        )
    )
    from html import escape as html_escape

    issue_map_rows = [
        [
            Paragraph("<b>ID</b>", small_muted),
            Paragraph("<b>Severidade</b>", small_muted),
            Paragraph("<b>Prioridade</b>", small_muted),
            Paragraph("<b>Issue</b>", small_muted),
        ]
    ]
    for issue in issues:
        issue_map_rows.append(
            [
                Paragraph(f"<b>{issue['id']}</b>", small_muted),
                Paragraph(issue["severity_label"], chip_style_critica),
                Paragraph(f"<b>{issue['priority']}</b>", small_muted),
                Paragraph(html_escape(issue["title"]), small_muted),
            ]
        )

    issue_map = Table(
        issue_map_rows,
        colWidths=[1.4 * cm, 2.8 * cm, 1.8 * cm, 11 * cm],
        repeatRows=1,
    )
    issue_map_style = [
        ("BACKGROUND", (0, 0), (-1, 0), COLORS["ink"]),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.5, COLORS["rule"]),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, COLORS["rule"]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for row_index, issue in enumerate(issues, start=1):
        issue_map_style.extend(
            [
                ("BACKGROUND", (1, row_index), (1, row_index), sev_color(issue["sev"])),
                ("TEXTCOLOR", (1, row_index), (1, row_index), white),
                (
                    "BACKGROUND",
                    (0, row_index), (-1, row_index),
                    COLORS["bg"] if row_index % 2 == 0 else COLORS["card"],
                ),
                ("BACKGROUND", (1, row_index), (1, row_index), sev_color(issue["sev"])),
            ]
        )
    issue_map.setStyle(TableStyle(issue_map_style))
    story.append(issue_map)
    story.append(Spacer(1, 0.4 * cm))

    # Resumo de pontos centrais (fracos e fortes)
    story.append(Paragraph("Pontos fracos centrais", h2_style))
    story.append(
        Paragraph(
            "<b>(1) F-19/F-20/F-21: Templates de email nao escapam HTML.</b> Cadeia de exploit: "
            "registro de conta com nome malicioso + clique em 'esqueci senha' = XSS no email. "
            "Combinado com F-22 (case 'simple' no email.service.ts) permite execucao de JS no webmail "
            "do destinatario. <b>Mitigacao URGENTE</b> antes de deploy em producao.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>(2) F-10: GET /tokens/:id eh IDOR direto</b> — qualquer usuario autenticado "
            "pode ler qualquer token pelo UUID. Vazamento em massa de dados de transacoes.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>(3) F-02/F-11: PUT /campaigns/:id/resources sem auth</b> — permite a qualquer "
            "visitante anonimo manipular alocacoes de recursos de qualquer campanha.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>(4) F-14: JWT_SECRET com fallback hardcoded</b> — se operador esquecer de setar a env, "
            "sistema roda com secret publicado no codigo-fonte. Bypass total de auth.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>(5) F-16: Segredos REAIS (AWS, SMTP, EFI) em .env locais</b> — credenciais precisam "
            "ser rotacionadas e movidas para gerenciador de segredos (AWS Secrets Manager/Vault).",
            body_style,
        )
    )

    story.append(Paragraph("Pontos fortes verificados", h2_style))
    for s in STRENGTHS[:8]:
        story.append(Paragraph(f"&bull; {s}", bullet_style))
    story.append(PageBreak())

    # ==========================================
    # PONTOS FORTES COMPLETOS
    # ==========================================
    story.append(Paragraph("Pontos fortes verificados (continuacao)", h1_style))
    story.append(
        Paragraph(
            "A auditoria tambem confirma o que esta CORRETAMENTE protegido no sistema. "
            "Estes pontos nao precisam de acao imediata e devem ser mantidos em PRs futuras.",
            body_style,
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    for s in STRENGTHS[8:]:
        story.append(Paragraph(f"&bull; {s}", bullet_style))
    story.append(PageBreak())

    # ==========================================
    # ACHADOS DETALHADOS POR CATEGORIA
    # ==========================================
    story.append(Paragraph("Achados detalhados por categoria", h1_style))
    story.append(
        Paragraph(
            "Tabela abaixo: Severidade | Arquivo:linha | Descricao. Chip colorido a esquerda "
            "indica a severidade. Detalhes tecnicos completos estao em cada secao.",
            body_style,
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    # Categoria por categoria
    cat_titles = {
        1: "Categoria 1 — Isolamento por userId (queries sem filtro de dono)",
        2: "Categoria 2 — Permissao definida no servidor (gates admin)",
        3: "Categoria 3 — IDOR (acesso direto a objeto por ID sem ownership)",
        4: "Categoria 4 — Chaves expostas / hardcoded",
        5: "Categoria 5 — Inputs sem tratamento (XSS / template injection)",
    }

    for cat in [1, 2, 3, 4, 5]:
        findings_cat = [f for f in issues if f["cat"] == cat]
        if not findings_cat:
            continue
        story.append(Paragraph(cat_titles[cat], h2_style))
        for f in findings_cat:
            # Chip de severidade
            sev_text = f["sev"].upper()
            chip_para = Paragraph(
                sev_text,
                ParagraphStyle(
                    "Chip",
                    parent=styles["Normal"],
                    fontSize=8,
                    textColor=white,
                    alignment=TA_CENTER,
                    fontName="Helvetica-Bold",
                ),
            )
            chip = Table([[chip_para]], colWidths=[2 * cm], rowHeights=[0.6 * cm])
            chip.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), sev_color(f["sev"])),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ]
                )
            )

            title_para = Paragraph(
                f"<b>{f['id']} &mdash; {f['title']}</b>",
                ParagraphStyle(
                    "FT",
                    parent=styles["Normal"],
                    fontSize=10,
                    leading=13,
                    textColor=COLORS["ink"],
                ),
            )

            header = Table([[chip, title_para]], colWidths=[2.2 * cm, 14 * cm])
            header.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(header)

            # Escape HTML nos campos textuais (snippet de codigo, descricoes) para o Paragraph nao interpretar tags
            from html import escape as html_escape

            evidence_escaped = html_escape(f.get("evidence", "")).replace("\n", "<br/>")
            why_escaped = html_escape(f.get("why", "")).replace("\n", "<br/>")
            impact_escaped = html_escape(f.get("impact", "")).replace("\n", "<br/>")
            fix_escaped = html_escape(f.get("fix", "Nenhum.")).replace("\n", "<br/>")
            detail_data = [
                ["Arquivo", f"{f.get('file', 'N/A')}:{f.get('line', '-')}"],
                ["Evidencia", Paragraph(evidence_escaped, body_mono)],
                ["Por que eh exploravel", Paragraph(why_escaped, body_style)],
                ["Impacto", Paragraph(impact_escaped, body_style)],
                ["Correcao sugerida", Paragraph(fix_escaped, body_style)],
            ]
            detail_table = Table(detail_data, colWidths=[3.5 * cm, 12.7 * cm])
            detail_table.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("FONT", (0, 0), (-1, -1), "Helvetica", 8.5),
                        ("TEXTCOLOR", (0, 0), (0, -1), COLORS["muted"]),
                        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8.5),
                        ("BACKGROUND", (0, 0), (-1, -1), COLORS["card"]),
                        ("BOX", (0, 0), (-1, -1), 0.5, COLORS["rule"]),
                        ("INNERGRID", (0, 0), (-1, -1), 0.3, COLORS["rule"]),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(detail_table)
            story.append(Spacer(1, 0.3 * cm))

    story.append(PageBreak())

    # ==========================================
    # RECOMENDAÇÕES PRIORIZADAS
    # ==========================================
    story.append(Paragraph("Recomendacoes priorizadas", h1_style))
    story.append(
        Paragraph(
            "Lista de acoes ordenadas por impacto. P1 = corrigir antes do proximo deploy. "
            "P2 = corrigir na proxima sprint. P3 = melhorar continuamente.",
            body_style,
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    p1_actions = [
        "F-19/20/21 (XSS email): Aplicar escapeHtml() em TODAS interpolacoes nos templates. Trocar template engine para um com auto-escape (handlebars). Validar redirectPath com @IsUrl.",
        "F-14 (JWT_SECRET fallback): Remover o fallback em auth.module.ts. Lançar erro fatal no bootstrap se process.env.JWT_SECRET for undefined.",
        "F-16 (Secrets reais em .env): Rotacionar AWS keys, SMTP password e EFI secrets AGORA. Gerar novo JWT_SECRET com openssl rand -base64 48.",
    ]
    p2_actions = [
        "F-15 (WEBHOOK_HASH_SECRET fallback): Remover o fallback em webhook-log.service.ts.",
        "F-17 (HMAC EFI fraco): Gerar HMAC secret forte para EFI.",
        "F-22 (email.service case simple): Aplicar escapeHtml() antes de quebrar linha.",
        "F-23 (preview email sem sanitize): Adicionar DOMPurify antes do dangerouslySetInnerHTML.",
    ]
    p3_actions = [
        "F-24 (termo-adesao bode expirado): Aplicar escapeHtml() em fill() preventivamente.",
        "F-25 (consistencia sanitize): Padronizar uso de DOMPurify/rehype-sanitize em todo dangerouslySetInnerHTML.",
        "Implementar validacao de startup que rejeite defaults (process.env.JWT_SECRET !== 'default-secret-change-in-production' em prod).",
        "Migrar de .env para AWS Secrets Manager ou HashiCorp Vault.",
        "Adicionar testes E2E que cubram: 'User A nao consegue alterar resource allocation de B', etc.",
        "Implementar CSP nonce em main.ts para scripts inline.",
    ]

    story.append(Paragraph("P1 — corrigir antes do proximo deploy (3 acoes)", h3_style))
    for a in p1_actions:
        story.append(Paragraph(f"&bull; {a}", bullet_style))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("P2 — corrigir na proxima sprint (4 acoes)", h3_style))
    for a in p2_actions:
        story.append(Paragraph(f"&bull; {a}", bullet_style))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("P3 — melhorias continuas (6 acoes)", h3_style))
    for a in p3_actions:
        story.append(Paragraph(f"&bull; {a}", bullet_style))
    story.append(PageBreak())

    # ==========================================
    # ISSUES PARA GITHUB
    # ==========================================
    story.append(Paragraph("ISSUES PARA O GITHUB", h1_style))
    story.append(
        Paragraph(
            "Abaixo estao issues prontas para copiar/colar no GitHub. "
            "Cada uma tem titulo, labels, descricao, evidencia, impacto, sugestao de correcao e criterios de aceite.",
            body_style,
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    for i, f in enumerate(issues, start=1):
        issue = f"""--- ISSUE {i} ---

Titulo: [Seguranca] [{f["sev"].upper()}] {f["title"]}

Labels: security, {f["sev"]}

## Descricao
{f["why"]}

## Evidencia
Arquivo: `{f.get("file", "N/A")}:{f.get("line", "-")}`

  {f.get("evidence", "Ver no codigo.")}

## Impacto
{f["impact"]}

## Sugestao de correcao
{f["fix"]}

## Criterios de aceite
- [ ] Teste de regressao que prova o bug existe antes do fix (RED)
- [ ] Fix aplicado
- [ ] Teste de regressao passa (GREEN)
- [ ] Auditoria manual confirma que o vetor esta fechado
- [ ] PR revisado por outro dev
- [ ] Documentacao (AGENTS.md ou CASE.md) atualizada com a regra

--- FIM ISSUE {i} ---"""
        # Render in monospace box
        story.append(
            Paragraph(
                f"<b>ISSUE {i} ({f['id']})</b>",
                ParagraphStyle(
                    "IssueH",
                    parent=styles["Normal"],
                    fontSize=10,
                    textColor=COLORS["ink"],
                    fontName="Helvetica-Bold",
                    spaceBefore=8,
                    spaceAfter=2,
                ),
            )
        )
        # Split lines to fit (use Preformatted to avoid HTML parsing)
        from reportlab.platypus import Preformatted

        for chunk_start in range(0, len(issue), 2000):
            chunk = issue[chunk_start : chunk_start + 2000]
            story.append(
                Preformatted(
                    chunk,
                    ParagraphStyle(
                        "Mono",
                        parent=styles["Code"],
                        fontSize=6.5,
                        leading=9,
                        fontName="Courier",
                        textColor=COLORS["ink"],
                    ),
                )
            )
        story.append(Spacer(1, 0.2 * cm))

    # Footer / cabeçalho de página
    def header_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(COLORS["muted"])
        # Cabeçalho
        canvas.drawString(
            2 * cm,
            A4[1] - 1.2 * cm,
            f"Relatorio de Auditoria de Seguranca - {PROJECT_NAME}",
        )
        canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.2 * cm, f"Data: {REPORT_DATE}")
        canvas.line(2 * cm, A4[1] - 1.4 * cm, A4[0] - 2 * cm, A4[1] - 1.4 * cm)
        # Rodape
        canvas.drawString(2 * cm, 1.2 * cm, "Confidencial - apenas para uso interno")
        canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pagina {doc.page}")
        canvas.line(2 * cm, 1.4 * cm, A4[0] - 2 * cm, 1.4 * cm)
        canvas.restoreState()

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"OK PDF gerado em: {OUTPUT_PDF}")


if __name__ == "__main__":
    build_pdf()
