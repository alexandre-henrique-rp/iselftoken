import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { IsCnpj } from '../../../common/validators/cnpj.validator';

export class CreateStartupDto {
  @IsString()
  nome: string;
  @IsString()
  razao_social: string;
  @IsCnpj({ alphanumeric: true })
  cnpj: string;
  @IsString()
  telefone: string;
  @IsString()
  email: string;
  @IsObject()
  pais: object;
  @IsString()
  area_atuacao: string;
  @IsString()
  estagio: string;
  @IsObject()
  redes_sociais: object;
  @IsString()
  data_fundacao: string;
  @IsString()
  site: string;
  @IsNumber()
  @IsOptional()
  logo_id?: number;
  @IsString()
  descritivo_basico: string;
  @IsString()
  youtube_url: string;
  @IsString()
  banco: string;
  @IsString()
  agencia: string;
  @IsString()
  conta: string;
  @IsString()
  pix_key: string;
  @IsString()
  titular: string;
  @IsString()
  slug: string;
}
