import { IsInt } from 'class-validator';

export class FulfillDocumentRequestDto {
  @IsInt()
  startupDocumentId!: number;
}
