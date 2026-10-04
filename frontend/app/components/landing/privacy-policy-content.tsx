/**
 * PrivacyPolicyContent — conteúdo da Política de Privacidade renderizado em
 * `/politica-privacidade`. Conteúdo sincronizado com `.harness/PRIVACIDADE.md`
 * (fonte canônica versionada). Atualizar ambos lado a lado.
 *
 * LGPD Art. 9 + Art. 18 §1º: titular deve ter acesso facilitado ao conteúdo
 * integral antes de fornecer consentimento (no caso de dado biométrico).
 */

interface PrivacyPolicyContentProps {
  version: string;
  effectiveDate: string;
  nextReviewDate: string;
}

export function PrivacyPolicyContent({
  version,
  effectiveDate,
  nextReviewDate,
}: PrivacyPolicyContentProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10">
      {/* Cabeçalho com versão e data */}
      <header className="mb-10 pb-6 border-b border-border/40">
        <p className="text-xs uppercase tracking-widest text-primary mb-2">
          Documento Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
          Política de Privacidade
        </h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-3">
          <span>
            <strong className="text-foreground">Versão:</strong> {version}
          </span>
          <span>
            <strong className="text-foreground">Vigência desde:</strong>{" "}
            {effectiveDate}
          </span>
          <span>
            <strong className="text-foreground">Próxima revisão:</strong>{" "}
            {nextReviewDate}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="text-xs px-4 py-2 rounded-md border border-border/60 hover:bg-primary/10 hover:border-primary transition-colors"
          >
            Imprimir
          </button>
          <a
            href="/politica-privacidade/baixar-pdf"
            className="text-xs px-4 py-2 rounded-md border border-border/60 hover:bg-primary/10 hover:border-primary transition-colors"
          >
            Baixar PDF
          </a>
        </div>
      </header>

      <article className="prose prose-invert prose-sm md:prose-base max-w-none space-y-8 text-sm md:text-base leading-relaxed">
        {/* Seção 1 — Identificação do Controlador */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            1. Identificação do Controlador
          </h2>
          <table className="w-full text-xs md:text-sm">
            <tbody>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold w-1/3 align-top">
                  Razão social
                </th>
                <td className="py-2">IselfToken Tecnologia Ltda</td>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Nome fantasia
                </th>
                <td className="py-2">iSelftoken</td>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  CNPJ
                </th>
                <td className="py-2">[INSERIR CNPJ]</td>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Endereço sede
                </th>
                <td className="py-2">
                  Av. Paulista 1337, Bela Vista, São Paulo — SP, CEP 01310-100
                </td>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Atividade
                </th>
                <td className="py-2">
                  Plataforma de equity crowdfunding tokenizado — Resolução CVM
                  88/2022
                </td>
              </tr>
              <tr>
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Website
                </th>
                <td className="py-2">https://iselftoken.com</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Seção 2 — DPO */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            2. Encarregado de Dados (DPO)
          </h2>
          <p className="text-muted-foreground mb-3">
            Conforme exigido pela LGPD (Art. 41 §1º + Decreto 10.474/2020 Art.
            5º), a IselfToken designou formalmente um Encarregado de Dados (Data
            Protection Officer — DPO).
          </p>
          <table className="w-full text-xs md:text-sm">
            <tbody>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold w-1/3 align-top">
                  Nome
                </th>
                <td className="py-2">[INSERIR NOME] — pendente nomeação</td>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Email
                </th>
                <td className="py-2">
                  <a
                    href="mailto:dpo@iselftoken.com.br"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    dpo@iselftoken.com.br
                  </a>
                </td>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Telefone
                </th>
                <td className="py-2">
                  +55 11 XXXXX-XXXX (seg–sex 09h–18h BRT)
                </td>
              </tr>
              <tr>
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  SLA de resposta
                </th>
                <td className="py-2">5 dias úteis (Art. 18 §5º LGPD)</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Seção 3 — Finalidades */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            3. Finalidades do Tratamento
          </h2>
          <p className="text-muted-foreground mb-3">
            A IselfToken trata dados pessoais exclusivamente para as seguintes
            finalidades:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li>
              <strong>Cadastro de usuário</strong> (investidor e fundador) —
              base Art. 7º, V (execução de contrato).
            </li>
            <li>
              <strong>Onboarding KYC</strong> (incluindo verificação biofacial)
              — base Art. 11, I (consentimento específico para biométrico) +
              Art. 7º, V para demais.
            </li>
            <li>
              <strong>Operações de pagamento</strong> (PIX + cartão via EFI
              Bank) — base Art. 7º, V (CVM 88 + BACEN).
            </li>
            <li>
              <strong>Cupons de desconto e campanhas</strong> — base Art. 7º, V
              (rastreabilidade CVM).
            </li>
            <li>
              <strong>Emissão de termos de adesão</strong> (assinatura digital)
              — base Art. 7º, V.
            </li>
            <li>
              <strong>Auditoria e AuditLog 5 anos</strong> — base Art. 7º, V.
            </li>
            <li>
              <strong>Suporte e comunicação transacional</strong> — base Art.
              7º, VI.
            </li>
            <li>
              <strong>Prevenção a fraude e segurança</strong> — base Art. 7º, V
              + VI.
            </li>
            <li>
              <strong>Compliance regulatório</strong> (CVM, BACEN, RF) — base
              Art. 7º, V.
            </li>
          </ul>
        </section>

        {/* Seção 4 — Bases Legais */}
        <section>
          <h2 className="text-2xl font-bold mb-3">4. Bases Legais</h2>
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-4 font-semibold">Hipótese</th>
                <th className="text-left py-2 pr-4 font-semibold">Artigo</th>
                <th className="text-left py-2 font-semibold">Onde se aplica</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="py-2">Obrigação legal/regulatória</td>
                <td className="py-2">Art. 7º, V</td>
                <td className="py-2">
                  Pagamentos, KYC não-biométrico, retenção 5 anos
                </td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">Execução de contrato</td>
                <td className="py-2">Art. 7º, VI</td>
                <td className="py-2">Cadastro, termos, suporte</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">Legítimo interesse</td>
                <td className="py-2">Art. 7º, IX</td>
                <td className="py-2">Antifraude, UX, métricas anonimizadas</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">Consentimento específico (sensível)</td>
                <td className="py-2">Art. 11, I</td>
                <td className="py-2">KYC biofacial (opt-in destacado)</td>
              </tr>
              <tr>
                <td className="py-2">Operador sob obrigação legal</td>
                <td className="py-2">Art. 7º, V + Art. 39</td>
                <td className="py-2">EFI Bank, Sentry</td>
              </tr>
            </tbody>
          </table>
          <p className="text-muted-foreground mt-3 text-xs">
            <strong>Importante:</strong> consentimento NÃO é a base legal
            padrão. A IselfToken trata preferencialmente sob Art. 7º, V ou VI,
            que não dependem da vontade do titular. A única hipótese de
            consentimento revogável é o dado biométrico (KYC biofacial).
          </p>
        </section>

        {/* Seção 5 — Retenção */}
        <section>
          <h2 className="text-2xl font-bold mb-3">5. Retenção de Dados</h2>
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-4 font-semibold">Categoria</th>
                <th className="text-left py-2 pr-4 font-semibold">Retenção</th>
                <th className="text-left py-2 font-semibold">Base</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="py-2">Dados financeiros e transacionais</td>
                <td className="py-2">5 anos</td>
                <td className="py-2">CVM 88 + BACEN</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">AuditLog administrativo</td>
                <td className="py-2">5 anos</td>
                <td className="py-2">Art. 37 LGPD</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">Log de acesso (IP, UA)</td>
                <td className="py-2">1 ano</td>
                <td className="py-2">Art. 15 LGPD</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">Documentos KYC</td>
                <td className="py-2">5 anos pós-relação</td>
                <td className="py-2">CVM 88</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">Biométrico</td>
                <td className="py-2">Até revogação ou 5 anos</td>
                <td className="py-2">Art. 11, I + Art. 16</td>
              </tr>
              <tr>
                <td className="py-2">Eliminação solicitada (consentimento)</td>
                <td className="py-2">90 dias para purga</td>
                <td className="py-2">Art. 16 + Art. 7º, V (exceção)</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Seção 6 — Direitos do Titular */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            6. Direitos do Titular (Art. 18)
          </h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <strong>Confirmação de tratamento</strong> — email DPO ou{" "}
              <code>GET /api/user/me/data</code> (15 dias)
            </li>
            <li>
              <strong>Acesso aos dados</strong> — email DPO ou endpoint
              autenticado (15 dias)
            </li>
            <li>
              <strong>Correção</strong> — UI Perfil ou{" "}
              <code>PATCH /api/user/profile</code> (imediato)
            </li>
            <li>
              <strong>Anonimização/bloqueio/eliminação</strong> — email DPO (30
              dias; limites Art. 7º, V)
            </li>
            <li>
              <strong>Portabilidade</strong> —{" "}
              <code>GET /api/user/data/export</code> (download JSON + 2FA + rate
              1/24h)
            </li>
            <li>
              <strong>Eliminação (consentimento)</strong> — email DPO
              (específico para biométrico, 30 dias)
            </li>
            <li>
              <strong>Informação sobre compartilhamento</strong> — ver §7
            </li>
            <li>
              <strong>Informação sobre consequência de não consentir</strong> —
              ver §4
            </li>
            <li>
              <strong>Revogação de consentimento</strong> — UI Perfil + email
              DPO (específico para biométrico, 30 dias)
            </li>
            <li>
              <strong>Revisão de decisões automatizadas</strong> — N/A (sem
              scoring de crédito)
            </li>
          </ol>
          <p className="text-muted-foreground mt-3 text-xs">
            <strong>Limites (Art. 18 §4º):</strong> dados retidos por obrigação
            legal (Art. 7º, V) não podem ser eliminados enquanto perdurar a
            obrigação. Nestes casos, a IselfToken aplica pseudonimização (Art.
            5º, XII + §6 LGPD).
          </p>
        </section>

        {/* Seção 7 — Compartilhamento */}
        <section>
          <h2 className="text-2xl font-bold mb-3">7. Compartilhamento</h2>
          <h3 className="text-lg font-semibold mt-4 mb-2">
            7.1 Operadores (Art. 39)
          </h3>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <strong>EFI Bank S.A.</strong> — processamento de pagamento
              PIX/cartão (Brasil, DPA em{" "}
              <code>backendnode/docs/efi-dpa.pdf</code>)
            </li>
            <li>
              <strong>Functional Software Inc. (Sentry)</strong> —
              observabilidade (EUA, com SCCs + DPA)
            </li>
          </ul>
          <h3 className="text-lg font-semibold mb-2">7.2 Órgãos públicos</h3>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <strong>BACEN</strong> — transações Pix (Art. 7º, V)
            </li>
            <li>
              <strong>CVM</strong> — fiscalização de crowdfunding (Art. 7º, V)
            </li>
            <li>
              <strong>Receita Federal</strong> — obrigações fiscais (Art. 7º, V)
            </li>
            <li>
              <strong>COAF</strong> — comunicação de operações suspeitas (Lei
              9.613/1998)
            </li>
            <li>
              <strong>ANPD</strong> — fiscalização de conformidade LGPD
            </li>
          </ul>
          <p className="text-muted-foreground text-xs">
            A IselfToken <strong>NÃO</strong> compartilha dados com bureaus de
            crédito, agências de marketing ou redes sociais.
          </p>
        </section>

        {/* Seção 8 — Segurança */}
        <section>
          <h2 className="text-2xl font-bold mb-3">8. Segurança (Art. 46)</h2>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <strong>Em trânsito:</strong> TLS 1.2+; mTLS cliente→EFI; mTLS
              reverso + IP whitelist <code>34.193.116.226</code> + HMAC{" "}
              <code>X-Efi-Signature</code> no webhook
            </li>
            <li>
              <strong>Em repouso:</strong> AES-256 SSE-KMS no S3; bcrypt cost
              12; 2FA email
            </li>
            <li>
              <strong>Tokenização de cartão:</strong> SDK JS EFI em iframe
              isolado (PCI-DSS SAQ A)
            </li>
            <li>
              <strong>Sessão:</strong> HTTP-only + SameSite=Strict + Redis TTL
              7d + cookie 35min sliding
            </li>
            <li>
              <strong>Rate limiting:</strong> ThrottlerGuard global + throttles
              específicos em endpoints sensíveis
            </li>
            <li>
              <strong>Auditoria:</strong> AuditLog imutável com retenção 5 anos
            </li>
            <li>
              <strong>Mascaramento de PII:</strong> CPF/CNPJ/cartão/Pix NUNCA em
              texto livre
            </li>
          </ul>
          <h3 className="text-lg font-semibold mt-4 mb-2">8.1 PCI-DSS SAQ A</h3>
          <p className="text-muted-foreground">
            A IselfToken é comerciante <strong>SAQ A</strong> (escopo reduzido)
            — PAN, CVV e data de expiração nunca chegam ao backend IselfToken.
            Declaração arquivada em{" "}
            <code>backendnode/docs/pci-dss-saq-a-2026.pdf</code>.
          </p>
        </section>

        {/* Seção 9 — Cookies */}
        <section>
          <h2 className="text-2xl font-bold mb-3">9. Cookies</h2>
          <p className="text-muted-foreground mb-3">
            Apenas cookies estritamente necessários:
          </p>
          <table className="w-full text-xs md:text-sm mb-3">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-4 font-semibold">Cookie</th>
                <th className="text-left py-2 pr-4 font-semibold">Tipo</th>
                <th className="text-left py-2 pr-4 font-semibold">Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="py-2">
                  <code>session_id</code>
                </td>
                <td className="py-2">HTTP-only, SameSite=Strict</td>
                <td className="py-2">35 min sliding</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2">
                  <code>csrf_token</code>
                </td>
                <td className="py-2">HTTP-only, SameSite=Strict</td>
                <td className="py-2">24h</td>
              </tr>
              <tr>
                <td className="py-2">
                  <code>2fa_token</code>
                </td>
                <td className="py-2">HTTP-only, SameSite=Strict</td>
                <td className="py-2">5 min</td>
              </tr>
            </tbody>
          </table>
          <p className="text-muted-foreground text-xs">
            <strong>Não utilizamos</strong> cookies de marketing, analytics ou
            terceiros.
          </p>
        </section>

        {/* Seção 10 — Transferências Internacionais */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            10. Transferências Internacionais
          </h2>
          <p className="text-muted-foreground mb-3">
            A IselfToken realiza uma única transferência internacional:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li>
              <strong>Functional Software Inc. (Sentry)</strong> — EUA —
              observabilidade com PII filtrada via{" "}
              <code>sendDefaultPii: false</code> e <code>beforeSend</code>
            </li>
          </ul>
          <p className="text-muted-foreground text-xs">
            <strong>Mecanismo:</strong> Cláusulas contratuais-padrão (SCCs) +
            DPA Sentry assinado. Avaliação trimestral da região e conformidade
            com LGPD Cap. V.
          </p>
        </section>

        {/* Seção 11 — Reclamações à ANPD */}
        <section>
          <h2 className="text-2xl font-bold mb-3">11. Reclamações à ANPD</h2>
          <p className="text-muted-foreground">
            O titular tem o direito de peticionar diretamente à{" "}
            <a
              href="https://www.gov.br/anpd"
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline-offset-2 hover:underline"
            >
              Autoridade Nacional de Proteção de Dados (ANPD)
            </a>
            , além dos canais do DPO indicados na §2.
          </p>
        </section>

        {/* Seção 12 — Histórico */}
        <section>
          <h2 className="text-2xl font-bold mb-3">12. Histórico de Revisões</h2>
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-4 font-semibold">Versão</th>
                <th className="text-left py-2 pr-4 font-semibold">Data</th>
                <th className="text-left py-2 font-semibold">Mudança</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2">
                  <strong>v1.0</strong>
                </td>
                <td className="py-2">22/08/2026</td>
                <td className="py-2">
                  Publicação inicial (S00 T00-02). Endereça achado
                  LGPD-FIND-002.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </article>

      {/* Rodapé da rota — contato DPO */}
      <footer
        id="contato-dpo"
        className="mt-16 pt-8 border-t border-border/40 text-sm"
      >
        <h2 className="text-xl font-bold mb-2">
          Fale com o Encarregado de Dados (DPO)
        </h2>
        <p className="text-muted-foreground mb-4">
          Para dúvidas, exercício de direitos (Art. 18 LGPD) ou reclamações:
        </p>
        <ul className="space-y-1 mb-6">
          <li>
            <strong>Email:</strong>{" "}
            <a
              href="mailto:dpo@iselftoken.com.br"
              className="text-primary underline-offset-2 hover:underline"
            >
              dpo@iselftoken.com.br
            </a>
          </li>
          <li>
            <strong>Telefone:</strong> +55 11 XXXXX-XXXX (seg–sex 09h–18h BRT)
          </li>
          <li>
            <strong>Endereço:</strong> Av. Paulista 1337, Bela Vista, São Paulo
            — SP, CEP 01310-100
          </li>
          <li>
            <strong>SLA de resposta inicial:</strong> 5 dias úteis (Art. 18 §5º
            LGPD)
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Você também pode peticionar diretamente à{" "}
          <a
            href="https://www.gov.br/anpd"
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline-offset-2 hover:underline"
          >
            Autoridade Nacional de Proteção de Dados (ANPD)
          </a>
          .
        </p>
      </footer>

      <section className="mt-8 pt-6 border-t border-border/40">
        <h2 className="text-lg font-bold mb-2">Documentos relacionados</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <a
              href="/termos-de-uso"
              className="text-primary underline-offset-2 hover:underline"
            >
              Termos de Uso
            </a>{" "}
            — condições gerais de uso da Plataforma (CVM 88/2022)
          </li>
        </ul>
      </section>
    </div>
  );
}
