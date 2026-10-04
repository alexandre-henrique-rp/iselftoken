/**
 * Texto integral do Termo de Adesao da plataforma iSelftoken.
 * Versao 1.0 — compliant com Lei 14.063/2020 (assinatura avancada).
 *
 * Este arquivo deve ser importado apenas pela rota publica de leitura do termo.
 * O componente de checkbox NAO importa este arquivo — usa apenas o link para a rota.
 */

export const TERMO_VERSAO = "1.0";
export const DATA_VERSAO = "10 de julho de 2026";

export interface TermoAdesaoData {
  founderName?: string;
  founderCpf?: string;
  startupName?: string;
  startupCnpj?: string;
  data?: string;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function fill(text: string, data: TermoAdesaoData): string {
  let t = text;
  if (data.founderName)
    t = t.replace(/\{\{FOUNDER_NAME\}\}/g, escapeHtml(data.founderName));
  if (data.founderCpf)
    t = t.replace(/\{\{FOUNDER_CPF\}\}/g, escapeHtml(data.founderCpf));
  if (data.startupName)
    t = t.replace(/\{\{STARTUP_NAME\}\}/g, escapeHtml(data.startupName));
  if (data.startupCnpj)
    t = t.replace(/\{\{STARTUP_CNPJ\}\}/g, escapeHtml(data.startupCnpj));
  if (data.data) t = t.replace(/\{\{DATA\}\}/g, escapeHtml(data.data));
  return t;
}

/**
 * Retorna apenas o `<body>` do termo embrulhado num container
 * `.termo-adesao-body` — pronto para `dangerouslySetInnerHTML` dentro de
 * páginas autenticadas. O CSS do documento não é injetado aqui para não
 * sobrescrever os seletores globais do shell da aplicação.
 *
 * Mantém `getTermoAdesaoText()` (HTML completo com CSS próprio) para qualquer
 * consumidor externo que precise do documento imprimível/exportável.
 *
 * @param data - Dados opcionais para preenchimento de lacunas ({{FOUNDER_NAME}}, etc)
 * @returns HTML dark-ready (style recolocado + container wrapper)
 */
export function getTermoAdesaoBody(data: TermoAdesaoData = {}): string {
  const fullHtml = getTermoAdesaoText(data);

  const bodyMatch = fullHtml.match(/<body>([\s\S]*?)<\/body>/);

  if (!bodyMatch) return "";

  // O documento completo mantém seu CSS próprio para impressão/exportação.
  // Na rota autenticada, porém, não podemos injetar esse <style>: ele contém
  // seletores globais (body, h1, h2, p) que sobrescrevem o shell da aplicação.
  // A apresentação dark é responsabilidade de `.termo-adesao-prose` em
  // theme.css, mantendo o layout responsivo e os tokens oficiais da marca.
  return `<div class="termo-adesao-body">${bodyMatch[1]}</div>`;
}

/**
 * Retorna o texto integral do Termo de Adesao em PT-BR formal.
 * Oponente deve ler o documento antes de aceitar.
 *
 * @param data - Dados opcionais para preenchimento de lacunas ({{FOUNDER_NAME}}, etc)
 * @returns HTML string com o teor do termo
 */
export function getTermoAdesaoText(data: TermoAdesaoData = {}): string {
  const filled = (t: string) => fill(t, data);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Termo de Adesão — iSelfToken</title>
<style>
  body {
    font-family: 'Inter', 'Manrope', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.8;
    color: #1a1a2e;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 24px;
    background: #fafafa;
  }
  h1 { font-size: 1.5rem; font-weight: 900; text-align: center; margin-bottom: 8px; color: #0d1117; }
  h2 { font-size: 1.1rem; font-weight: 800; margin-top: 32px; margin-bottom: 8px; color: #1a1a2e; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px; }
  h3 { font-size: 0.95rem; font-weight: 700; margin-top: 20px; color: #333; }
  p { margin: 0 0 12px; text-align: justify; }
  ul, ol { margin: 0 0 16px 20px; }
  li { margin-bottom: 6px; }
  .header { text-align: center; margin-bottom: 32px; }
  .version { font-size: 11px; color: #888; text-align: center; margin-bottom: 32px; }
  .highlight { background: #f0f4ff; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  strong { font-weight: 700; color: #0d1117; }
  .clause-number { font-weight: 900; color: #4f46e5; }
</style>
</head>
<body>

<div class="header">
  <h1>TERMO DE ADESÃO À PLATAFORMA ISELFTOKEN</h1>
  <p><strong>iSelfToken Tecnologia e Pagamentos S.A.</strong></p>
</div>

<p class="version">Versão ${TERMO_VERSAO} — ${DATA_VERSAO}</p>

<div class="highlight">
  <p style="margin:0"><strong>Atenção:</strong> Este documento constitui o acordo de adesão entre o <strong>Usuário</strong> (doravante denominado "Usuário", "Fundador" ou "Investidor", conforme aplicável) e a <strong>iSelfToken Tecnologia e Pagamentos S.A.</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede na cidade de São Paulo, Estado de São Paulo, doravante denominada "Plataforma iSelfToken" ou simplesmente "Plataforma".</p>
</div>

<h2>1. DO OBJETO</h2>
<p>${filled('Este Termo de Adesão tem por objeto regular as condições gerais de utilização da plataforma digital iSelfToken, operada pela empresa iSelfToken Tecnologia e Pagamentos S.A., pela pessoa jurídica identificada como <strong>{{STARTUP_NAME}}</strong>, inscrita no CNPJ sob o nº <strong>{{STARTUP_CNPJ}}</strong>, representada por seu fundador <strong>{{FOUNDER_NAME}}</strong>, portador(a) do CPF nº <strong>{{FOUNDER_CPF}}</strong>, doravante denominada simplesmente "Startup" ou "Usuário Fundador".')}</p>
<p>A Plataforma iSelfToken é um ambiente virtual que permite a captação de recursos junto a investidores pessoas físicas e jurídicas interessadas em participar de ofertas de valores mobiliários de startups listadas, em conformidade com a Resolução CVM nº 88/2022 e demais regulamentações aplicáveis.</p>

<h2>2. DA ACEITAÇÃO</h2>
<p>O Usuário, ao clicar na caixa de aceite "Li e aceito o presente Termo de Adesão", ou ao utilizar qualquer funcionalidade da Plataforma, declara ter lido, compreendido e aceito integralmente o presente instrumento, sem reservas de qualquer natureza. A aceitação deste Termo é condição indispensável para o acesso e utilização dos serviços disponibilizados pela iSelfToken.</p>
<p>Caso o Usuário não concorde com qualquer das disposições aqui previstas, deverá imediatamente cessar a utilização da Plataforma.</p>

<h2>3. DA DEFINIÇÃO DOS SERVIÇOS</h2>
<p>3.1. A iSelfToken oferece uma plataforma digital de crowdfunding mobiliário, autorizada pela Comissão de Valores Mobiliários (CVM) nos termos da Resolução CVM nº 88/2022, que permite:</p>
<ul>
  <li>A listagem de ofertas de valores mobiliários de startups e empresas emergentes;</li>
  <li>A captação de recursos junto a investidores interessados;</li>
  <li>A formalização de contratos de investimento entre as partes;</li>
  <li>O suporte ao ciclo de vida do investimento, incluindo follow-ons e liquidez secundária, quando aplicável.</li>
</ul>
<p>3.2. A Plataforma não é uma instituição financeira, corretora de valores ou distribuidora de títulos e valores mobiliários, não exercendo atividades sujeitas à autorização do Banco Central do Brasil ou da CVM, exceto no que se refere à dispensa de registro de oferta pública de valores mobiliários nos termos da regulamentação específica.</p>

<h2>4. DAS OBRIGAÇÕES DO USUÁRIO FUNDADOR</h2>
<p>4.1. São obrigações do Usuário Fundador, sem prejuízo de outras disposições deste Termo ou da legislação aplicável:</p>
<ul>
  <li>Fornecer informações verdadeiras, precisas, completas e atualizadas sobre si mesmo e sobre a Startup;</li>
  <li>Manter a confidencialidade de suas credenciais de acesso à Plataforma;</li>
  <li>Anexar e manter atualizados todos os documentos obrigatórios exigidos pela regulamentação da CVM;</li>
  <li>Garantir que os valores mobiliários oferecidos estejam devidamente autorizados para oferta pública, quando aplicável;</li>
  <li>Comunicar imediatamente à iSelfToken qualquer uso não autorizado de sua conta;</li>
  <li>Responsabilizar-se integralmente pelo conteúdo das informações e documentos publicados;</li>
  <li>Efetuar o aceite digital deste Termo mediante assinatura eletrônica avançada, nos termos da Lei nº 14.063/2020.</li>
</ul>
<p>4.2. O Usuário Fundador reconhece que é o único responsável pela veracidade, legalidade e consistência das informações e documentos por ele fornecidos, isentando a iSelfToken de qualquer responsabilidade por informações falsas, enganosas ou incompletas.</p>

<h2>5. DAS OBRIGAÇÕES DO USUÁRIO INVESTIDOR</h2>
<p>5.1. São obrigações do Usuário Investidor:</p>
<ul>
  <li>Fornecer informações verdadeiras, precisas, completas e atualizadas no momento do cadastro e durante toda a vigência de sua utilização da Plataforma;</li>
  <li>Manter a confidencialidade de suas credenciais de acesso;</li>
  <li>Avaliar cuidadosamente os riscos de cada investimento antes de efetivar qualquer aplicação;</li>
  <li>Reconhecer que os investimentos em startups e empresas emergentes apresentam alto risco e que pode perder integralmente o capital aplicado;</li>
  <li>Efetuar o aceite digital deste Termo mediante assinatura eletrônica avançada, nos termos da Lei nº 14.063/2020.</li>
</ul>

<h2>6. DA ASSINATURA ELETRÔNICA AVANÇADA</h2>
<p>6.1. Nos termos da Lei nº 14.063, de 15 de setembro de 2020, o presente Termo de Adesão é firmado mediante <strong>assinatura eletrônica avançada</strong>, utilizando-se de certificado digital X.509 emitido por Autoridade Certificadora interna da iSelfToken, em conjunto com a tecnologia PAdES (PDF Advanced Electronic Signature), conforme o padrão ETSI EN 319-142.</p>
<p>6.2. Ao aceitar este Termo, o Usuário consente expressamente que a assinatura eletrônica avançada produza os mesmos efeitos legais da assinatura manuscrita, sendo válida e vinculante para todos os fins de direito.</p>
<p>6.3. O registro de aceite eletrônico, contendo a identificação do signatário, o hash SHA-256 do documento PDF, o timestamp assíncrono ISO 8601 e o fingerprint do certificado digital, constitui prova plenamente válida de que o Usuário manifestou sua vontade de forma livre e informada.</p>
<p>6.4. A iSelfToken manterá os registros de assinatura digital pelo prazo de 20 (vinte) anos após a última transação realizada pelo Usuário, em conformidade com o Marco Civil da Internet (Lei nº 12.965/2014) e a LGPD (Lei nº 13.709/2018).</p>

<h2>7. DA POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS PESSOAIS</h2>
<p>7.1. A iSelfToken utiliza os dados pessoais dos Usuários estritamente para as finalidades descritas em sua <strong>Política de Privacidade</strong>, disponível em [inserir link], que é parte integrante deste Termo como se aqui estivesse transcrita.</p>
<p>7.2. Os dados pessoais coletados incluem, exemplificativamente: nome completo, CPF, endereço de e-mail, endereço residencial, número de telefone, dados bancários e documentos de identificação.</p>
<p>7.3. A iSelfToken não compartilha dados pessoais dos Usuários com terceiros para finalidades comerciais sem o consentimento expresso do titular, ressalvadas as hipóteses de compartilhamento obrigatório previstas em lei ou por determinação de autoridade competente.</p>
<p>7.4. O Usuário possui direito de acesso, correção, eliminação, portabilidade e revogação do consentimento, os quais podem ser exercidos mediante solicitação ao Encarregado de Proteção de Dados (DPO) da iSelfToken no endereço: privacidade@iselftoken.com.br.</p>
<p>7.5. A iSelfToken implementa medidas técnicas e administrativas aptas a proteger os dados pessoais contra acesso não autorizado, alteração, destruição ou divulgação não autorizada.</p>

<h2>8. DA TAXA DE SERVIÇO E REMUNERAÇÃO</h2>
<p>8.1. A iSelfToken cobra taxa de serviço dos Usuários Fundadores pela utilização da Plataforma, nos valores e condições descritos no Regulamento de Taxas, disponível em [inserir link].</p>
<p>8.2. A taxa de serviço será descontada diretamente dos recursos captados pela Startup, antes da transferência dos valores ao Usuário Fundador, ou cobrada de outra forma expressamente acordada entre as partes.</p>
<p>8.3. A iSelfToken também poderá cobrar taxa de serviço dos Investidores, a título de contribuição pelo uso da Plataforma, nos casos e valores descritos no Regulamento de Taxas.</p>

<h2>9. DA EXCLUSÃO DE RESPONSABILIDADE</h2>
<p>9.1. A iSelfToken não é parte nas relações contratuais entre Investidores e Startups, não assumindo qualquer responsabilidade pelas obrigações assumidas pelas partes nesses contratos de investimento.</p>
<p>9.2. A iSelfToken não garante que os investimentos realizados por meio da Plataforma gerarão qualquer retorno, não sendo responsável por perdas, danos ou frustração de expectativas dos Investidores.</p>
<p>9.3. A Plataforma atua como simples intermediária técnica, não exercendo atividades de análise de crédito, análise de investimentos ou distribuição de valores mobiliários que exijam autorização de órgão regulador.</p>
<p>9.4. A iSelfToken não se responsabiliza por quaisquer danos decorrentes de caso fortuito, força maior, ação de terceiros, erro do Usuário, falha na conexão de internet, ou qualquer outra causa que não lhe seja diretamente imputável.</p>

<h2>10. DA SUSPENSÃO E CANCELAMENTO DE ACESSO</h2>
<p>10.1. A iSelfToken reserva-se o direito de suspender ou cancelar, imediatamente e sem aviso prévio, o acesso de qualquer Usuário que:</p>
<ul>
  <li>Violar qualquer disposição deste Termo;</li>
  <li>Utilizar a Plataforma para fins ilícitos ou para atividades não permitidas pela legislação aplicável;</li>
  <li>Prestar informações falsas, incompletas ou enganosas;</li>
  <li>Interferir no bom funcionamento da Plataforma;</li>
  <li>Tentar obter acesso não autorizado a sistemas ou a dados de outros Usuários.</li>
</ul>
<p>10.2. O cancelamento não dá ao Usuário direito a qualquer reembolso das taxas já pagas, nem gera qualquer direito a indenização.</p>

<h2>11. DA PROPRIEDADE INTELECTUAL</h2>
<p>11.1. Todos os direitos de propriedade intelectual sobre a Plataforma, incluindo, mas não se limitando a, software, design, identidade visual, logotipos, marcas e conteúdo proprietário, pertencem exclusivamente à iSelfToken Tecnologia e Pagamentos S.A. ou aos seus licenciantes.</p>
<p>11.2. Os Usuários não poderão copiar, modificar, distribuir, vender ou alugar qualquer parte da Plataforma sem autorização prévia e por escrito da iSelfToken.</p>

<h2>12. DO FORO E LEGISLAÇÃO APLICÁVEL</h2>
<p>12.1. Este Termo de Adesão é regido pelas leis da República Federativa do Brasil.</p>
<p>12.2. Para todas as questões oriundas deste instrumento, elegem as partes o foro da Comarca de São Paulo, Estado de São Paulo, com renúncia a qualquer outro, por mais privilegiado que seja ou venha a ser.</p>
<p>12.3. A eventual invalidade ou inexequibilidade de qualquer disposição deste Termo não afetará a validade das demais cláusulas, que permanecerão plenamente vigentes.</p>

<div class="highlight">
  <p style="margin:0"><strong>Importante:</strong> Este documento é assinado eletronicamente, nos termos da Lei nº 14.063/2020. A assinatura eletrônica avançada aplicada sobre este PDF garante a integridade do conteúdo e a identidade do signatário, produzindo plenos efeitos jurídicos.</p>
</div>

<p style="text-align:center; font-size:11px; color:#888; margin-top:40px">
  iSelfToken Tecnologia e Pagamentos S.A.<br>
  CNPJ: 00.000.000/0001-00 | Tel: +55 11 3000-0000 | privacidade@iselftoken.com.br<br>
  Documento assinado em {{DATA}} — Versão ${TERMO_VERSAO} — ${DATA_VERSAO}
</p>

</body>
</html>
  `.trim();
}
