/**
 * TermsOfUseContent — conteúdo dos Termos de Uso renderizado em `/termos-de-uso`.
 *
 * Rascunho padrão para plataforma de equity crowdfunding tokenizado sob
 * Resolução CVM 88/2022. Placeholder `[INSERIR ...]` para dados que devem
 * ser preenchidos pelo time jurídico antes do lançamento.
 *
 * ATUALIZAR: quando houver alterações regulatórias ou de produto,
 * atualizar a versão e a data de vigência tanto aqui quanto no
 * loader da rota.
 */

interface TermsOfUseContentProps {
  version: string;
  effectiveDate: string;
  nextReviewDate: string;
}

export function TermsOfUseContent({
  version,
  effectiveDate,
  nextReviewDate,
}: TermsOfUseContentProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10">
      <header className="mb-10 pb-6 border-b border-border/40">
        <p className="text-xs uppercase tracking-widest text-primary mb-2">
          Documento Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
          Termos de Uso
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
        </div>
      </header>

      <article className="prose prose-invert prose-sm md:prose-base max-w-none space-y-8 text-sm md:text-base leading-relaxed">
        {/* Seção 1 — Identificação */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            1. Identificação da Plataforma
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
                <td className="py-2">iSelfToken</td>
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
                  Plataforma de intermediação de crowdfunding de capital próprio
                  (equity crowdfunding) tokenizado — Resolução CVM 88/2022
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

        {/* Seção 2 — Definições */}
        <section>
          <h2 className="text-2xl font-bold mb-3">2. Definições</h2>
          <p className="text-muted-foreground mb-3">
            Para fins destes Termos de Uso, consideram-se:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Plataforma:</strong> o
              ambiente digital operado pela IselfToken, acessível em
              iselftoken.com, destinado à intermediação de ofertas públicas de
              distribuição de valores mobiliários por meio de crowdfunding, em
              conformidade com a Resolução CVM 88/2022.
            </li>
            <li>
              <strong className="text-foreground">Usuário:</strong> toda pessoa
              física ou jurídica que aceite estes Termos e realize cadastro na
              Plataforma.
            </li>
            <li>
              <strong className="text-foreground">Investidor:</strong> Usuário
              pessoa física ou jurídica que efetue investimento em Oferta
              disponível na Plataforma.
            </li>
            <li>
              <strong className="text-foreground">Emitente:</strong> pessoa
              jurídica (startup) que solicita a intermediação de oferta de
              distribuição de valores mobiliários por meio da Plataforma.
            </li>
            <li>
              <strong className="text-foreground">Oferta:</strong> processo de
              distribuição pública ou restrita de valores mobiliários
              intermediado pela Plataforma, nos termos da Resolução CVM 88/2022.
            </li>
            <li>
              <strong className="text-foreground">Token:</strong> representação
              digital de participação societária emitida pelo Emitente,
              registrada em registro de valores mobiliários autorizado pela CVM,
              que confere ao titular direitos proporcionais ao capital social do
              Emitente.
            </li>
            <li>
              <strong className="text-foreground">Investimento Mínimo:</strong>{" "}
              valor mínimo estabelecido pelo Emitente para participação na
              Oferta, conforme Resolução CVM 88/2022.
            </li>
            <li>
              <strong className="text-foreground">
                Limite Individual de Investimento:
              </strong>{" "}
              o valor máximo que um Investidor pode aplicar em uma mesma Oferta,
              conforme definido pela CVM para investidores não qualificados.
            </li>
          </ul>
        </section>

        {/* Seção 3 — Aceite e Vigência */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            3. Aceite e Vigência dos Termos
          </h2>
          <p className="text-muted-foreground">
            3.1. Ao acessar, navegar ou utilizar a Plataforma, o Usuário declara
            que leu, compreendeu e aceitou integralmente estes Termos de Uso,
            bem como a{" "}
            <a
              href="/politica-privacidade"
              className="text-primary underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </a>
            .
          </p>
          <p className="text-muted-foreground">
            3.2. Caso o Usuário não concorde com quaisquer disposições destes
            Termos, deverá imediatamente cessar o uso da Plataforma.
          </p>
          <p className="text-muted-foreground">
            3.3. Estes Termos entram em vigor na data de sua publicação na
            Plataforma e permanecem vigentes enquanto o Usuário mantiver
            cadastro ativo ou utilizar a Plataforma.
          </p>
          <p className="text-muted-foreground">
            3.4. A IselfToken reserva-se o direito de alterar estes Termos a
            qualquer tempo, mediante notificação prévia ao Usuário por e-mail ou
            por meio da Plataforma. O uso continuado da Plataforma após a
            publicação das alterações constituirá aceitação tácita das mudanças.
          </p>
        </section>

        {/* Seção 4 — Elegibilidade */}
        <section>
          <h2 className="text-2xl font-bold mb-3">4. Elegibilidade</h2>
          <p className="text-muted-foreground">
            4.1. Para utilizar a Plataforma, o Usuário deve:
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>
              Ser maior de 18 (dezoito) anos ou emancipado, conforme legislação
              civil brasileira;
            </li>
            <li>
              Possuir capacidade civil plena para a prática de atos jurídicos;
            </li>
            <li>
              Ter CPF ou CNPJ válido e regular junto à Receita Federal do
              Brasil;
            </li>
            <li>
              Fornecer dados cadastrais verdadeiros, precisos e atualizados;
            </li>
            <li>
              Não estar incluído em listas de sanções ou impedimentos de
              investimento aplicáveis.
            </li>
          </ul>
          <p className="text-muted-foreground">
            4.2. Investidores não qualificados (pessoas físicas) estão sujeitos
            ao Limite Individual de Investimento conforme Resolução CVM 88/2022,
            Art. 5º, §4º, que limita o investimento a 10% da renda bruta anual.
          </p>
          <p className="text-muted-foreground">
            4.3. A Plataforma poderá, a seu critério, restringir o acesso a
            determinados usuários conforme requisitos regulatórios aplicáveis.
          </p>
        </section>

        {/* Seção 5 — Cadastro e Conta */}
        <section>
          <h2 className="text-2xl font-bold mb-3">5. Cadastro e Conta</h2>
          <p className="text-muted-foreground">
            5.1. O cadastro na Plataforma é gratuito e voluntário, exigindo
            informações verdadeiras e completas. O Usuário é responsável pela
            veracidade das informações fornecidas.
          </p>
          <p className="text-muted-foreground">
            5.2. O Usuário é responsável pela guarda e uso adequado de suas
            credenciais de acesso (e-mail e senha). Qualquer atividade realizada
            a partir de sua conta será de sua inteira responsabilidade.
          </p>
          <p className="text-muted-foreground">
            5.3. O Usuário compromete-se a comunicar imediatamente à IselfToken
            qualquer uso não autorizado de sua conta ou qualquer violação de
            segurança.
          </p>
          <p className="text-muted-foreground">
            5.4. A IselfToken poderá, a seu critério e mediante justificativa,
            suspender ou cancelar contas que violem estes Termos ou que
            representem risco à segurança da Plataforma.
          </p>
          <p className="text-muted-foreground">
            5.5. O cadastro está sujeito à verificação de identidade (KYC — Know
            Your Customer) e às demais verificações exigidas pela legislação
            aplicável, incluindo, mas não se limitando a: verificação de
            documento de identidade, comprovante de residência e informações
            financeiras.
          </p>
        </section>

        {/* Seção 6 — Funcionamento da Plataforma */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            6. Funcionamento da Plataforma
          </h2>
          <p className="text-muted-foreground">
            6.1. A Plataforma atua como intermediária entre Emitentes e
            Investidores no âmbito de ofertas públicas de distribuição de
            valores mobiliários por meio de crowdfunding, nos termos da
            Resolução CVM 88/2022.
          </p>
          <p className="text-muted-foreground">
            6.2. A IselfToken não é parte nas transações de investimento
            realizadas entre Investidores e Emitentes. A Plataforma facilita a
            conexão, mas não garante o sucesso das ofertas nem o retorno dos
            investimentos.
          </p>
          <p className="text-muted-foreground">
            6.3. Os Emitentes são exclusivamente responsáveis pelas informações
            prestadas nas ofertas, pelo cumprimento de suas obrigações legais e
            regulatórias, e pela prestação de contas aos Investidores.
          </p>
          <p className="text-muted-foreground">
            6.4. A IselfToken realiza due diligence nos Emitentes conforme
            procedimentos internos e exigências da Resolução CVM 88/2022, mas
            tal verificação não constitui garantia de idoneidade, solidez
            financeira ou sucesso do Emitente.
          </p>
        </section>

        {/* Seção 7 — Tokens e Ativos Digitais */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            7. Tokens e Ativos Digitais
          </h2>
          <p className="text-muted-foreground">
            7.1. Os Tokens representam participação societária no Emitente e são
            registrados em registro de valores mobiliários autorizado pela CVM.
            A aquisição de Tokens não implica relationship de trabalho, mandato
            ou associação societária com a IselfToken.
          </p>
          <p className="text-muted-foreground">
            7.2. A titularidade dos Tokens confere ao Investidor direitos
            proporcionais ao capital social do Emitente, conforme definido nos
            termos específicos de cada Oferta, podendo incluir, entre outros:
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>Direito de voto em assembleias do Emitente;</li>
            <li>Direito a dividendos, quando distribuídos;</li>
            <li>Direito de preferência em futuras rodadas de investimento;</li>
            <li>Direito de.TagAlong, quando aplicável.</li>
          </ul>
          <p className="text-muted-foreground">
            7.3. Os Tokens não constituem depósito, aplicação financeira ou
            instrumento de renda fixa. O Investidor deve estar ciente de que o
            valor dos Tokens pode variar e que não há garantia de retorno do
            capital investido.
          </p>
          <p className="text-muted-foreground">
            7.4. A IselfToken não se responsabiliza pela liquidez dos Tokens no
            mercado secundário, quando disponível. A negociação secundária está
            sujeita a regulamentação específica e pode não estar disponível para
            todos os Emitentes.
          </p>
        </section>

        {/* Seção 8 — Processo de Investimento */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            8. Processo de Investimento
          </h2>
          <p className="text-muted-foreground">
            8.1. Para investir, o Usuário deve:
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>Completar o cadastro e a verificação de identidade (KYC);</li>
            <li>Selecionar a Oferta de interesse;</li>
            <li>
              Confirmar o valor do investimento, respeitando os limites
              aplicáveis;
            </li>
            <li>Efetuar o pagamento conforme as instruções da Plataforma;</li>
            <li>Aceitar os termos específicos da Oferta e do Emitente.</li>
          </ul>
          <p className="text-muted-foreground">
            8.2. O investimento somente será considerado efetivado após a
            confirmação do pagamento pela instituição financeira parceira e a
            liberação dos Tokens na conta do Investidor.
          </p>
          <p className="text-muted-foreground">
            8.3. A IselfToken não se responsabiliza por falhas, atrasos ou
            cancelamentos de pagamentos decorrentes de problemas técnicos,
            instituições financeiras ou do Emitente.
          </p>
          <p className="text-muted-foreground">
            8.4. Os valores investidos são mantidos em conta segregada pela
            instituição financeira parceira até a conclusão do processo de
            emissão dos Tokens pelo Emitente, conforme Resolução CVM 88/2022.
          </p>
        </section>

        {/* Seção 9 — Riscos */}
        <section>
          <h2 className="text-2xl font-bold mb-3">9. Riscos</h2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">
              O INVESTIMENTO EM STARTUPS ENVOLVE RISCOS SIGNIFICATIVOS.
            </strong>{" "}
            O Investidor deve estar ciente de que:
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>Pode perder total ou parcialmente o capital investido;</li>
            <li>Não há garantia de retorno do investimento;</li>
            <li>
              Startups apresentam alta taxa de mortalidade e volatilidade;
            </li>
            <li>A liquidez dos Tokens pode ser limitada ou inexistente;</li>
            <li>
              O prazo de retorno do investimento pode ser superior ao esperado;
            </li>
            <li>
              Condições macroeconômicas, regulatórias ou de mercado podem afetar
              adversamente o investimento;
            </li>
            <li>
              O Emitente pode não atingir suas metas financeiras ou
              operacionais;
            </li>
            <li>
              A regulação de ativos digitais pode evoluir de forma que afete o
              valor ou a negociabilidade dos Tokens.
            </li>
          </ul>
          <p className="text-muted-foreground">
            9.2. O Investidor declara ter pleno conhecimento dos riscos
            envolvidos e ter tomado sua decisão de investimento de forma
            autônoma, sem dependência de recomendações da IselfToken.
          </p>
          <p className="text-muted-foreground">
            9.3. A IselfToken recomenda que o Investidor diversifique seus
            investimentos e consulte um assessor financeiro qualificado antes de
            investir.
          </p>
        </section>

        {/* Seção 10 — Taxas e Custos */}
        <section>
          <h2 className="text-2xl font-bold mb-3">10. Taxas e Custos</h2>
          <p className="text-muted-foreground">
            10.1. A utilização da Plataforma pode estar sujeita ao pagamento de
            taxas e custos conforme tabela disponível na seção de preços da
            Plataforma.
          </p>
          <p className="text-muted-foreground">
            10.2. As taxas da Plataforma são cobradas sobre o valor investido e
            serão descontadas do pagamento destinado ao Emitente, não incidindo
            diretamente sobre o Investidor, salvo disposição contrária nos
            termos específicos da Oferta.
          </p>
          <p className="text-muted-foreground">
            10.3. A IselfToken reserva-se o direito de alterar suas taxas,
            mediante comunicação prévia aos Usuários com antecedência mínima de
            30 (trinta) dias.
          </p>
          <p className="text-muted-foreground">
            10.4. Eventuais custos de instituições financeiras, taxas de
            transferência bancária ou custos de processamento de pagamentos são
            de responsabilidade do Emitente ou do Investidor, conforme indicado
            no momento da transação.
          </p>
        </section>

        {/* Seção 11 — Propriedade Intelectual */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            11. Propriedade Intelectual
          </h2>
          <p className="text-muted-foreground">
            11.1. Todo o conteúdo disponibilizado na Plataforma — incluindo, mas
            não se limitando a, textos, gráficos, logotipos, ícones, imagens,
            software, código-fonte e compilações — é propriedade da IselfToken
            ou de seus licenciados, e é protegido pelas leis de propriedade
            intelectual brasileiras e internacionais.
          </p>
          <p className="text-muted-foreground">
            11.2. É vedado ao Usuário copiar, reproduzir, distribuir, modificar,
            criar obras derivadas, exibir, publicar, baixar, armazenar ou
            transmitir qualquer conteúdo da Plataforma, salvo mediante
            autorização expressa por escrito da IselfToken.
          </p>
          <p className="text-muted-foreground">
            11.3. O uso da Plataforma concede ao Usuário uma licença limitada,
            não exclusiva, não transferível e revogável para acesso e uso
            pessoal e não comercial da Plataforma.
          </p>
        </section>

        {/* Seção 12 — Responsabilidades e Garantias */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            12. Responsabilidades e Garantias
          </h2>
          <p className="text-muted-foreground">
            12.1. A IselfToken declara que:
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>
              Operará a Plataforma com diligência e em conformidade com a
              Resolução CVM 88/2022;
            </li>
            <li>
              Manterá procedimentos adequados de due diligence sobre Emitentes;
            </li>
            <li>
              Disponibilizará informações claras e precisas sobre as Ofertas,
              conforme exigido pela regulamentação aplicável;
            </li>
            <li>
              Manterá a segurança e a integridade dos dados dos Usuários,
              conforme a Política de Privacidade.
            </li>
          </ul>
          <p className="text-muted-foreground">12.2. O Usuário declara que:</p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>
              Fornecerá informações verdadeiras e atualizadas durante o cadastro
              e em interações subsequentes com a Plataforma;
            </li>
            <li>
              Utilizará a Plataforma em conformidade com a legislação aplicável
              e estes Termos;
            </li>
            <li>
              Não utilizará a Plataforma para fins ilícitos, fraudulentos ou que
              possam prejudicar a IselfToken, outros Usuários ou Emitentes;
            </li>
            <li>
              Terá pleno conhecimento dos riscos envolvidos em investimentos em
              startups e ativos digitais.
            </li>
          </ul>
        </section>

        {/* Seção 13 — Limitação de Responsabilidade */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            13. Limitação de Responsabilidade
          </h2>
          <p className="text-muted-foreground">
            13.1. NA MÁXIMA EXTENSÃO PERMITIDA PELA LEGISLAÇÃO APLICÁVEL, A
            ISELFTOKEN NÃO SE RESPONSABILIZA POR:
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>
              Perdas ou danos decorrentes de investimentos realizados na
              Plataforma, incluindo perda total ou parcial do capital investido;
            </li>
            <li>
              Informações inexactas ou incompletas prestadas por Emitentes nas
              ofertas;
            </li>
            <li>
              Decisões de investimento tomadas pelo Usuário com base em
              informações disponíveis na Plataforma;
            </li>
            <li>
              Interrupções, falhas técnicas ou indisponibilidade temporária da
              Plataforma;
            </li>
            <li>Ações ou omissões de Emitentes, Investidores ou terceiros;</li>
            <li>
              Perdas indiretas, incidentais, especiais, consequenciais ou
              punitivas.
            </li>
          </ul>
          <p className="text-muted-foreground">
            13.2. A responsabilidade total da IselfToken, em qualquer hipótese,
            será limitada ao valor efetivamente pago pelo Usuário à IselfToken
            pelos serviços da Plataforma nos 12 (doze) meses anteriores ao
            evento que originou a responsabilidade.
          </p>
        </section>

        {/* Seção 14 — Suspensão e Cancelamento */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            14. Suspensão e Cancelamento
          </h2>
          <p className="text-muted-foreground">
            14.1. A IselfToken poderá, a qualquer tempo, suspender ou cancelar o
            acesso do Usuário à Plataforma, mediante notificação prévia, nas
            seguintes hipóteses:
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-6">
            <li>Violação de quaisquer disposições destes Termos de Uso;</li>
            <li>Uso fraudulento, indevido ou suspeito da Plataforma;</li>
            <li>
              Fornecimento de informações falsas ou enganosas durante o
              cadastro;
            </li>
            <li>
              Solicitação de autoridade reguladora competente (CVM, BACEN,
              etc.);
            </li>
            <li>
              Inatividade prolongada da conta, conforme política da Plataforma.
            </li>
          </ul>
          <p className="text-muted-foreground">
            14.2. O Usuário poderá solicitar o cancelamento de sua conta a
            qualquer momento, mediante comunicação ao suporte da Plataforma,
            desde que não possua investimentos ativos ou pendentes de
            liquidação.
          </p>
          <p className="text-muted-foreground">
            14.3. O cancelamento da conta não dispensa o Usuário de eventuais
            obrigações pendentes, incluindo, mas não se limitando a, pagamentos
            de taxas ou penalidades contratadas.
          </p>
        </section>

        {/* Seção 15 — Proteção de Dados */}
        <section>
          <h2 className="text-2xl font-bold mb-3">15. Proteção de Dados</h2>
          <p className="text-muted-foreground">
            15.1. O tratamento de dados pessoais dos Usuários é regido pela{" "}
            <a
              href="/politica-privacidade"
              className="text-primary underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </a>{" "}
            da IselfToken, em conformidade com a Lei Geral de Proteção de Dados
            (Lei nº 13.709/2018 — LGPD) e demais normas aplicáveis.
          </p>
          <p className="text-muted-foreground">
            15.2. Ao utilizar a Plataforma, o Usuário consente com a coleta,
            armazenamento e tratamento de seus dados pessoais conforme descrito
            na Política de Privacidade.
          </p>
        </section>

        {/* Seção 16 — Comunicações */}
        <section>
          <h2 className="text-2xl font-bold mb-3">16. Comunicações</h2>
          <p className="text-muted-foreground">
            16.1. A IselfToken poderá comunicar-se com o Usuário por meio de
            e-mail, notificações na Plataforma ou outros canais adequados,
            incluindo, mas não se limitando a: confirmações de transações,
            atualizações de Ofertas, notificações regulatórias e comunicações
            administrativas.
          </p>
          <p className="text-muted-foreground">
            16.2. O Usuário é responsável por manter seus dados de contato
            atualizados na Plataforma. A ausência de atualização não exonera o
            Usuário das comunicações enviadas pela IselfToken.
          </p>
        </section>

        {/* Seção 17 — Legislação Aplicável e Foro */}
        <section>
          <h2 className="text-2xl font-bold mb-3">
            17. Legislação Aplicável e Foro
          </h2>
          <p className="text-muted-foreground">
            17.1. Estes Termos são regidos e interpretados de acordo com as leis
            da República Federativa do Brasil, especialmente a Resolução CVM
            88/2022, a Lei nº 6.385/1976 (Lei do Mercado de Valores Mobiliários)
            e a Lei nº 13.709/2018 (LGPD).
          </p>
          <p className="text-muted-foreground">
            17.2. Fica eleito o foro da Comarca de São Paulo — SP para dirimir
            quaisquer questões oriundas destes Termos, com renúncia a qualquer
            outro, por mais privilegiado que seja.
          </p>
          <p className="text-muted-foreground">
            17.3. As partes procuram resolver amigavelmente eventuais
            controvérsias. Caso não seja possível, a controvérsia será submetida
            à mediação antes da via judicial, conforme regulamento da Câmara de
            Mediação e Arbitragem [INSERIR CÂMARA].
          </p>
        </section>

        {/* Seção 18 — Disposições Gerais */}
        <section>
          <h2 className="text-2xl font-bold mb-3">18. Disposições Gerais</h2>
          <p className="text-muted-foreground">
            18.1. A eventual inaplicabilidade ou invalidade de qualquer
            disposição destes Termos não afetará a validade das demais
            disposições, que permanecerão em pleno vigor e efeito.
          </p>
          <p className="text-muted-foreground">
            18.2. A tolerância da IselfToken quanto a eventuais violações destes
            Termos não constituirá precedente, renúncia ou modificação de
            quaisquer disposições aqui previstas.
          </p>
          <p className="text-muted-foreground">
            18.3. O Usuário não poderá ceder ou transferir seus direitos e
            obrigações decorrentes destes Termos sem o consentimento prévio e
            por escrito da IselfToken.
          </p>
          <p className="text-muted-foreground">
            18.4. Estes Termos constituem o acordo integral entre as partes
            quanto ao seu objeto e substituem todos os acordos, entendimentos e
            declarações anteriores, verbais ou escritos, sobre o mesmo tema.
          </p>
        </section>

        {/* Seção 19 — Contato */}
        <section>
          <h2 className="text-2xl font-bold mb-3">19. Contato</h2>
          <p className="text-muted-foreground">
            Em caso de dúvidas, sugestões ou reclamações relacionadas a estes
            Termos de Uso, o Usuário poderá entrar em contato com a IselfToken
            por meio dos seguintes canais:
          </p>
          <table className="w-full text-xs md:text-sm">
            <tbody>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold w-1/3 align-top">
                  E-mail
                </th>
                <td className="py-2">
                  <a
                    href="mailto:suporte@iselftoken.com.br"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    suporte@iselftoken.com.br
                  </a>
                </td>
              </tr>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Encarregado de Dados (DPO)
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
              <tr>
                <th className="text-left py-2 pr-4 font-semibold align-top">
                  Endereço
                </th>
                <td className="py-2">
                  Av. Paulista 1337, Bela Vista, São Paulo — SP, CEP 01310-100
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="mt-12 pt-6 border-t border-border/40 text-xs text-muted-foreground">
          <p>
            Versão {version} — Vigência desde {effectiveDate} — Próxima revisão:{" "}
            {nextReviewDate}
          </p>
          <p className="mt-1">
            © 2026 IselfToken Tecnologia Ltda. Todos os direitos reservados.
          </p>
        </footer>
      </article>
    </div>
  );
}
