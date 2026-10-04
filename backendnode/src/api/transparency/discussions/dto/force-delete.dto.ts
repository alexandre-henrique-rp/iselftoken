import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO para DELETE /transparency/replies/:replyId
 * e DELETE /transparency/discussions/:discussionId
 *
 * - force: boolean, true para confirmar delete quando a thread tem replies.
 *
 * Body opcional (vazio na maioria dos casos).
 */
export class ForceDeleteDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Obrigatorio true para deletar thread COM replies (confirmacao explicita).',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
