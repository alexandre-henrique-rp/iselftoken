import { BadRequestException, FileValidator } from '@nestjs/common';

/**
 * Valida o magic number (file signature) de um arquivo PDF.
 *
 * PDF arquivos comecam com a sequencia de bytes `%PDF-` (5 bytes).
 * Este validador verifica os primeiros 5 bytes do buffer para confirmar
 * que o arquivo realmente eh um PDF, evitando spoofing de extensao.
 *
 * @example
 * // Em um ParseFilePipeBuilder
 * .addValidator(new PdfMagicNumberValidator())
 */
export class PdfMagicNumberValidator extends FileValidator<
  Record<string, any>
> {
  private static readonly PDF_SIGNATURE = '%PDF-';
  private static readonly PDF_SIGNATURE_BUFFER = Buffer.from(
    PdfMagicNumberValidator.PDF_SIGNATURE,
  );

  /**
   * Valida que o buffer passado corresponde ao magic number de um PDF.
   *
   * @param file - Arquivo em formato Express.Multer.File
   * @returns true se o arquivo eh um PDF valido
   * @throws BadRequestException se o magic number nao corresponder
   */
  protected validationOptions: Record<string, any> = {};

  constructor(options?: Record<string, any>) {
    super(options || {});
  }

  isValid(file: Express.Multer.File): boolean {
    if (!file || !file.buffer) {
      throw new BadRequestException('Arquivo invalido ou buffer ausente');
    }

    const buffer = file.buffer;
    if (buffer.length < 5) {
      throw new BadRequestException(
        'Arquivo muito pequeno para ser um PDF valido',
      );
    }

    const fileSignature = buffer.slice(0, 5);
    if (!fileSignature.equals(PdfMagicNumberValidator.PDF_SIGNATURE_BUFFER)) {
      throw new BadRequestException('Apenas arquivos PDF sao aceitos');
    }

    return true;
  }

  buildErrorMessage(): string {
    return 'Apenas arquivos PDF sao aceitos';
  }
}
