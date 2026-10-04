import { IsObject, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewDto {
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}

export class PreviewVersionParamsDto {
  @IsObject()
  @IsNotEmpty()
  @Type(() => Object)
  data: Record<string, any>;
}
