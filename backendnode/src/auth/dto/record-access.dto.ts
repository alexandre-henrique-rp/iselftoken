import { IsIP, IsObject, IsOptional } from 'class-validator';

export class RecordAccessDto {
  @IsOptional()
  @IsIP()
  clientIp?: string;

  @IsOptional()
  @IsObject()
  clientIpMetadata?: Record<string, unknown>;
}
