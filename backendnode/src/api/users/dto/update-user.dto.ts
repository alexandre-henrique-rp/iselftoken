import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';

// Decorator customizado para validação de idade
function IsOver18(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    ValidatorConstraint({ name: 'isOver18', async: false })(IsOver18Constraint);
    Validate(IsOver18Constraint, validationOptions)(object, propertyName);
  };
}

// Validador customizado para maior de 18 anos
@ValidatorConstraint({ name: 'isOver18', async: false })
export class IsOver18Constraint implements ValidatorConstraintInterface {
  validate(dateOfBirth: Date) {
    if (!dateOfBirth) return true; // Se não for obrigatório

    const today = new Date();
    const birthDate = new Date(dateOfBirth);

    // Calcula idade exata
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 18;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Usuário deve ser maior de 18 anos';
  }
}

// Enums baseados no schema Prisma
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  FINANCEIRO = 'FINANCEIRO',
  COMPLIANCE = 'COMPLIANCE',
}

export enum Genero {
  HOMEM = 'HOMEM',
  MULHER = 'MULHER',
  OUTRO = 'OUTRO',
}

export enum TypeDocumento {
  // Documentos Brasileiros
  CPF = 'CPF',
  CNH = 'CNH',
  // Documentos Internacionais
  PASSAPORTE = 'PASSAPORTE',
  CédulaIdentidade = 'CÉDULA_IDENTIDADE',
  CarteiraMotorista = 'CARTEIRA_MOTORISTA',
  DNI = 'DNI', // Documento Nacional de Identidade (espanhol)
  CUIT = 'CUIT', // Argentina
  RUT = 'RUT', // Chile/Uruguai
  SSN = 'SSN', // Social Security Number (EUA)
  NationalID = 'NATIONAL_ID', // ID genérico internacional
  BirthCertificate = 'BIRTH_CERTIFICATE',
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Dados de Acesso
  @ApiPropertyOptional({
    description: 'Email do usuário',
    type: () => String,
    example: 'joao.araujo@gmail.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nome do usuário',
    type: () => String,
    example: 'João Araújo',
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  nome?: string;

  @ApiPropertyOptional({
    description: 'Role do usuário',
    enum: Role,
    example: Role.USER,
  })
  @IsEnum(Role, { message: 'Role inválida' })
  @IsOptional()
  role?: Role;

  // Dados Pessoais
  @ApiPropertyOptional({
    description: 'Telefone',
    type: () => String,
    example: '1234567890',
  })
  @IsString({ message: 'Telefone deve ser uma string' })
  @Transform(({ value }) => value.replace(/\D/g, ''))
  @IsOptional()
  @MaxLength(20, { message: 'Telefone deve ter no máximo 20 caracteres' })
  telefone?: string;

  @ApiPropertyOptional({
    description: 'Data de nascimento',
    type: Date,
    example: '1990-01-01',
  })
  @Transform(({ value }) => {
    if (!value) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date;
  })
  @IsDate({ message: 'Data de nascimento inválida (use formato AAAA-MM-DD)' })
  @IsOptional()
  @IsOver18({ message: 'Usuário deve ser maior de 18 anos' })
  data_nascimento?: Date;

  @ApiPropertyOptional({
    description: 'Gênero',
    enum: Genero,
    example: Genero.HOMEM,
  })
  @IsEnum(Genero, { message: 'Gênero inválido' })
  @IsOptional()
  genero?: Genero;

  // Endereço
  @ApiPropertyOptional({
    description: 'Endereço',
    type: () => String,
    example: 'Rua dos Bobos',
  })
  @IsString({ message: 'Endereço deve ser uma string' })
  @IsOptional()
  @MaxLength(255, { message: 'Endereço deve ter no máximo 255 caracteres' })
  endereco?: string;

  @ApiPropertyOptional({
    description: 'Número',
    type: () => String,
    example: '0',
  })
  @IsString({ message: 'Número deve ser uma string' })
  @IsOptional()
  @MaxLength(20, { message: 'Número deve ter no máximo 20 caracteres' })
  numero?: string;

  @ApiPropertyOptional({
    description: 'Complemento',
    type: () => String,
    example: 'Casa 1',
  })
  @IsString({ message: 'Complemento deve ser uma string' })
  @IsOptional()
  @MaxLength(255, { message: 'Complemento deve ter no máximo 255 caracteres' })
  complemento?: string;

  @ApiPropertyOptional({
    description: 'Bairro',
    type: () => String,
    example: 'Bairro',
  })
  @IsString({ message: 'Bairro deve ser uma string' })
  @IsOptional()
  @MaxLength(255, { message: 'Bairro deve ter no máximo 255 caracteres' })
  bairro?: string;

  @ApiPropertyOptional({
    description: 'Cidade',
    type: () => String,
    example: 'Cidade',
  })
  @IsString({ message: 'Cidade deve ser uma string' })
  @IsOptional()
  @MaxLength(255, { message: 'Cidade deve ter no máximo 255 caracteres' })
  cidade?: string;

  @ApiPropertyOptional({ description: 'UF', type: () => String, example: 'SP' })
  @IsString({ message: 'UF deve ser uma string' })
  @IsOptional()
  @Length(2, 2, { message: 'UF deve ter exatamente 2 caracteres' })
  uf?: string;

  @ApiPropertyOptional({
    description: 'CEP',
    type: () => String,
    example: '00000-000',
  })
  @IsString({ message: 'CEP deve ser uma string' })
  @IsOptional()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' })
  @Transform(({ value }) => value.replace(/\D/g, ''))
  cep?: string;

  @ApiPropertyOptional({
    description: 'ID do país no catálogo Country',
    example: 31,
    nullable: true,
  })
  @IsInt({ message: 'ID do país deve ser um inteiro' })
  @Min(1, { message: 'ID do país deve ser maior que zero' })
  @IsOptional()
  pais?: number | null;

  // Termos
  @ApiPropertyOptional({
    description: 'Termos aceitos',
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'Termos aceitos deve ser um boolean' })
  @IsOptional()
  termosAceitos?: boolean;

  @ApiPropertyOptional({
    description: 'Política aceita',
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'Política aceita deve ser um boolean' })
  @IsOptional()
  politicaAceita?: boolean;

  // Dados Documentais
  @ApiPropertyOptional({
    description: 'Tipo de documento',
    type: () => TypeDocumento,
    enum: TypeDocumento,
    example: TypeDocumento.CPF,
  })
  @IsString({ message: 'Tipo de documento deve ser uma string' })
  @IsOptional()
  @MaxLength(50, {
    message: 'Tipo de documento deve ter no máximo 50 caracteres',
  })
  tipo_documento?: TypeDocumento;

  @ApiPropertyOptional({
    description: 'Registro do documento',
    type: () => String,
    example: '1234567890',
  })
  @IsString({ message: 'Registro do documento deve ser uma string' })
  @Transform(({ value }) => value.replace(/\D/g, ''))
  @IsOptional()
  reg_documento?: string;

  // Status
  @ApiPropertyOptional({
    description: 'Status ativo',
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'Status ativo deve ser um boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'ID do upload do avatar recém-enviado',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do upload do avatar deve ser um número inteiro' })
  @Min(1, { message: 'ID do upload do avatar deve ser maior que zero' })
  @IsOptional()
  avatar_upload_id?: number;

  @ApiPropertyOptional({
    description: 'ID do upload do comprovante recém-enviado',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do upload do comprovante deve ser um número inteiro' })
  @Min(1, { message: 'ID do upload do comprovante deve ser maior que zero' })
  @IsOptional()
  comprovante_upload_id?: number;

  @ApiPropertyOptional({
    description: 'ID do upload do documento recém-enviado',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do upload do documento deve ser um número inteiro' })
  @Min(1, { message: 'ID do upload do documento deve ser maior que zero' })
  @IsOptional()
  documento_upload_id?: number;

  @ApiPropertyOptional({
    description: 'ID do upload do biofacial recém-enviado',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do upload do biofacial deve ser um número inteiro' })
  @Min(1, { message: 'ID do upload do biofacial deve ser maior que zero' })
  @IsOptional()
  biofacial_upload_id?: number;

  // IDs de perfis KYC já existentes (compatibilidade com fluxos legados)
  @ApiPropertyOptional({
    description: 'ID do avatar (KYCProfile legado)',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do avatar deve ser um número inteiro' })
  @Min(1, { message: 'ID do avatar deve ser maior que zero' })
  @IsOptional()
  avatar_id?: number;

  @ApiPropertyOptional({
    description: 'ID do comprovante',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do comprovante deve ser um número inteiro' })
  @Min(1, { message: 'ID do comprovante deve ser maior que zero' })
  @IsOptional()
  comprovante_id?: number;

  @ApiPropertyOptional({
    description: 'ID do documento',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do documento deve ser um número inteiro' })
  @Min(1, { message: 'ID do documento deve ser maior que zero' })
  @IsOptional()
  documento_id?: number;

  @ApiPropertyOptional({
    description: 'ID do biofacial',
    type: Number,
    example: 1,
  })
  @IsInt({ message: 'ID do biofacial deve ser um número inteiro' })
  @Min(1, { message: 'ID do biofacial deve ser maior que zero' })
  @IsOptional()
  biofacial_id?: number;
}
