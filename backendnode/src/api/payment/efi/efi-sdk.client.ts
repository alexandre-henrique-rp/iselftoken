import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import EfiPay from 'sdk-node-apis-efi';

/**
 * Cliente do SDK oficial da EFI (`sdk-node-apis-efi`).
 *
 * Responsável por instanciar o `EfiPay` com as credenciais e o certificado
 * mTLS (.p12) correto conforme o modo de operação:
 *
 * - `sandbox` (homologação) → certificado de homologação
 * - `prod` (produção)       → certificado de produção
 *
 * O SDK cuida internamente do handshake mTLS, do OAuth `client_credentials`
 * e do cache de token, além de escolher o endpoint correto
 * (`pix-h.api.efipay.com.br` em sandbox, `pix.api.efipay.com.br` em produção)
 * a partir da flag `sandbox`.
 *
 * Segredos (client_secret, conteúdo do certificado) NUNCA são logados.
 */
@Injectable()
export class EfiSdkClient {
  private readonly logger = new Logger(EfiSdkClient.name);
  private instance: EfiPay | null = null;

  /**
   * Modo de operação normalizado.
   *
   * `EFI_MODE` aceita `mock | dev | sandbox | prod`. Tanto `dev` quanto
   * `sandbox` apontam para o ambiente de homologação da EFI. Qualquer valor
   * fora de `prod` é tratado como sandbox por segurança (nunca cai em produção
   * por engano).
   */
  get mode(): 'mock' | 'sandbox' | 'prod' {
    const raw = (process.env['EFI_MODE'] ?? 'mock').toLowerCase();
    if (raw === 'mock') return 'mock';
    if (raw === 'prod' || raw === 'production') return 'prod';
    // dev, sandbox, homologacao, qualquer outro → sandbox
    return 'sandbox';
  }

  get isMock(): boolean {
    return this.mode === 'mock';
  }

  get isSandbox(): boolean {
    return this.mode === 'sandbox';
  }

  /**
   * Resolve o caminho absoluto do certificado .p12 conforme o modo.
   * Permite override por env (`EFI_CERT_HOMOLOG_PATH` / `EFI_CERT_PROD_PATH`).
   */
  private resolveCertificatePath(): string {
    const certsDir = path.resolve(process.cwd(), 'certs', 'efi');

    if (this.mode === 'prod') {
      const prod =
        process.env['EFI_CERT_PROD_PATH'] ??
        path.join(certsDir, 'producao-943919-iselftoken_pro.p12');
      return prod;
    }

    const homolog =
      process.env['EFI_CERT_HOMOLOG_PATH'] ??
      path.join(certsDir, 'homologacao-943919-iselftoken_hom.p12');
    return homolog;
  }

  /**
   * Retorna (e memoiza) a instância do SDK EfiPay configurada com mTLS.
   * Lança erro claro se o certificado exigido não existir no disco.
   */
  getClient(): EfiPay {
    if (this.instance) {
      return this.instance;
    }

    const certificate = this.resolveCertificatePath();

    if (!fs.existsSync(certificate)) {
      throw new Error(
        `Certificado EFI não encontrado para o modo "${this.mode}". ` +
          `Esperado em: ${certificate}. ` +
          `Verifique backendnode/certs/efi ou configure EFI_CERT_${
            this.mode === 'prod' ? 'PROD' : 'HOMOLOG'
          }_PATH.`,
      );
    }

    const clientId = process.env['EFI_CLIENT_ID'] ?? '';
    const clientSecret = process.env['EFI_CLIENT_SECRET'] ?? '';

    if (!clientId || !clientSecret) {
      throw new Error(
        'Credenciais EFI ausentes (EFI_CLIENT_ID / EFI_CLIENT_SECRET).',
      );
    }

    this.instance = new EfiPay({
      sandbox: this.mode !== 'prod',
      client_id: clientId,
      client_secret: clientSecret,
      certificate,
    });

    this.logger.log(
      `EFI SDK inicializado (modo=${this.mode}, sandbox=${this.mode !== 'prod'})`,
    );

    return this.instance;
  }

  /**
   * Chave PIX recebedora configurada (usada como `chave` na cobrança).
   */
  get pixKey(): string {
    return process.env['EFI_PIX_KEY'] ?? '';
  }
}
