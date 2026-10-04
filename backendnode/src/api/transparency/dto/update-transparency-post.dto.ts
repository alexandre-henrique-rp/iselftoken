import { PartialType } from '@nestjs/swagger';
import { CreateTransparencyPostDto } from './create-transparency-post.dto';

/**
 * DTO para atualizacao parcial de post de transparencia.
 * Todos os campos sao opcionais via PartialType (incluindo attachmentIds).
 *
 * Note: se `attachmentIds` for omitido, anexos existentes permanecem.
 * Se `attachmentIds: []` for enviado, todos os anexos sao removidos.
 * Para substituicao parcial, envie a lista completa desejada.
 */
export class UpdateTransparencyPostDto extends PartialType(
  CreateTransparencyPostDto,
) {}
