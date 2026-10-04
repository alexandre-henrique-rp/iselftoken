import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/**
 * DTO de criacao de reply em uma thread de Discussao.
 *
 * content 1..5000 chars.
 */
export class CreateReplyDto {
  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @Length(1, 5000)
  content!: string;
}
