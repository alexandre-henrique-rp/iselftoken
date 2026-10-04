import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum UploadApplicancy {
  APPLICABLE = 'APPLICABLE',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export class CreateUploadDto {
  @IsOptional()
  @IsInt()
  startupId?: number;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  documentType?: string;

  /**
   * T035 (B08) - "Nao se aplica" em uploads condicionais.
   * Quando applicancy=NOT_APPLICABLE, o arquivo eh opcional e o
   * compliance check NAO reprova por este documento.
   */
  @IsOptional()
  @IsEnum(UploadApplicancy)
  applicancy?: UploadApplicancy;
}
