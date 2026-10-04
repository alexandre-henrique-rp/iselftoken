import Handlebars from 'handlebars';

/**
 * Dados para preenchimento do Termo de Adesao Digital.
 *
 * @description Estrutura de dados que alimenta o template Handlebars
 * para geracao do PDF do Termo de Adesao.
 */
export interface TermoAdesaoData {
  /** Dados da startup */
  startup: {
    name: string; // Nome fantasia da startup
    cnpj: string; // CNPJ com mascara (ex: 12.345.678/0001-90)
    equity: string; // Equity oferecida (ex: "10%")
  };
  /** Dados do fundador */
  founder: {
    name: string; // Nome completo do fundador
    cpf: string; // CPF com mascara (ex: ***.123.456-**)
    email: string; // Email do fundador
  };
  /** Data/hora da assinatura */
  signedAt: Date;
  /** Fingerprint SHA-256 do certificado do fundador */
  certificateFingerprintFounder: string;
  /** Fingerprint SHA-256 do certificado da startup */
  certificateFingerprintStartup: string;
  /** Hash SHA-256 do documento PDF */
  documentHash: string;
  /** URL do QR Code (substituido em S18.5) */
  qrCodeUrl: string;
  /** Versao do termo */
  termoVersao: string;
}

/**
 * Helper para formatar data em PT-BR.
 *
 * @param date - Data a ser formatada
 * @returns Data formatada dd/MM/yyyy HH:mm:ss
 */
Handlebars.registerHelper('formatDatePtBr', function (date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
});

/**
 * Helper para formatar data ISO-8601.
 *
 * @param date - Data a ser formatada
 * @returns Data formatada ISO-8601
 */
Handlebars.registerHelper('formatDateIso', function (date: Date): string {
  return new Date(date).toISOString();
});

/**
 * Template Handlebars para o Termo de Adesao Digital.
 * Texto juridico formal em PT-BR conforme Lei 14.063/2020.
 */
export const TERMO_ADESAO_TEMPLATE = `TERMO DE ADESAO DIGITAL

TERMO DE ADESAO AO SISTEMA DE CROWDFUNDING DE EQUITY
Iselftoken Plataforma de Investimentos Ltda.

---

1. DAS PARTES

1.1. Este Termo de Adesao Digital ("Termo") e celebrada entre:

(a) DO FUNDADOR: {{founder.name}}, portador(a) do CPF {{founder.cpf}}, email {{founder.email}} ("Fundador"), na qualidade de socio(a) e representante legal da startup abaixo identificada; e

(b) DA STARTUP: {{startup.name}}, pessoa juridica legally constituida, portadora do CNPJ {{startup.cnpj}}, com equity de {{startup.equity}} ("Startup").

1.2. O Fundador declara ser socio e/ou representante legal da Startup, com poderes para representa-la nos termos deste Termo.

---

2. DO OBJETO

2.1. O objeto deste Termo e a adesao da Startup ao sistema de crowdfunding de equityoferido pela Iselftoken Plataforma de Investimentos Ltda. ("Plataforma"), bem como a aquisicao de tokens de equityrepresentativos da participacao societaria na Startup.

2.2. Ao aderir a este Termo, o Fundador reconhece e concorda com todos os termos e condicoes da Plataforma, incluindo, mas nao limitado a, as regras de emissao de tokens, transferencia de participacao e direitos dos investidores.

---

3. DA DECLARACAO DE EQUITY

3.1. A Startup, por meio de seu Fundador, declara e garante que a equity oferecida na Plataforma e de {{startup.equity}}, representando a participacao societaria equivalente.

3.2. A equity oferecida esta corretamente representationada em tokens digitais na Plataforma e conforms as regras do contrato inteligente (smart contract) asociado.

3.3. O Fundador garante que a equity oferecida nao esta gravada, penhorada ou de qualquer forma alienada a terceiros.

---

4. DAS OBRIGACOES DO FUNDADOR

4.1. O Fundador se compromete a:

(a) Manter informações cadastrais atualizadas na Plataforma;
(b) Respeitar os prazos e condicoes de entrega de equity acordados com os investidores;
(c) Fornecer relatorios periodicos sobre o andamento da Startup, conforme política da Plataforma;
(d) Comunicar imediatamente qualquer mudanca relevante na situacao da Startup;
(e) Cumprir todas as obrigações legais e regulamentares aplicaveis.

---

5. DA ASSINATURA DIGITAL

5.1. Este Termo foi assinado digitalmente pelo Fundador utilizando certificado digital ICP não qualificada, em conformidade com o Art. 4 da Lei 14.063/2020 (Lei das Assinaturas Digitais).

5.2. A assinatura digital deste Termo tem a mesma validade jurídica da assinatura manuscrita, conforme art. 10 da Lei 14.063/2020.

5.3. O certificado digital utilizado pertence a:
   - Titular: {{founder.name}}
   - CPF: {{founder.cpf}}
   - Emissor: Iselftoken Intermediate CA G1
   - Validade: Conforme certificado digital

---

7. DA POLITICA DE PRIVACIDADE E LGPD

7.1. A Iselftoken se compromete a tratar os dados pessoais收集ados neste Termo em conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018 - LGPD).

7.2. Os dados pessoais do Fundador serao utilizados exclusivamente para fins de identificacao, emissao de certificados digitais e cumprimento de obrigações legais.

7.3. O Fundador tem direito a solicitacao de acesso, correcao, exclusao ou portabilidade de seus dados pessoais, nos termos da LGPD.

---

8. DAS DISPOSICOES GERAIS

8.1. Este Termo entra em vigor na data de sua assinatura digital.

8.2. Este Termo é regido pelas leis da República Federativa do Brasil.

8.3. Qualquer divergência ou litigio decorrente deste Termo sera submetido ao foro da Comarca de Sao Paulo, SP.

---

9. DA VERSÃO

9.1. Versao deste Termo: {{termoVersao}}

---

ASSINATURA DIGITAL

Documento assinado eletronicamente em {{signedAt}}.

Hash do Documento: {{documentHash}}

Plataforma Iselftoken - iselftoken.com.br
`;

export default TERMO_ADESAO_TEMPLATE;
