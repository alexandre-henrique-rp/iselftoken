import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  limit?: number = 10;
}

export class UploadStatusQueryDto {
  @IsOptional()
  @IsEnum(UploadStatus)
  @ApiPropertyOptional({ enum: UploadStatus })
  status?: UploadStatus;
}

export class UploadTypeQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ enum: ['image', 'video', 'document'] })
  type?: 'image' | 'video' | 'document';
}

export class FindAllUploadsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UploadStatus)
  @ApiPropertyOptional({ enum: UploadStatus })
  status?: UploadStatus;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ enum: ['image', 'video', 'document'] })
  type?: 'image' | 'video' | 'document';
}

export class CreateUploadResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ckl5g8b3p0001' })
  publicId: string;

  @ApiPropertyOptional({
    example:
      'https://iselftoken-prod-image.s3.us-east-1.amazonaws.com/hash.jpg',
    description: 'URL pública estável do objeto canônico original.',
  })
  url?: string;

  @ApiPropertyOptional({
    example:
      'https://iselftoken-prod-image-md.s3.us-east-1.amazonaws.com/hash.webp',
    description: 'URL pública estável da variante média.',
  })
  url_md?: string;

  @ApiPropertyOptional({
    example:
      'https://iselftoken-prod-image-sm.s3.us-east-1.amazonaws.com/hash.webp',
    description: 'URL pública estável otimizada para web.',
  })
  url_web?: string;

  @ApiPropertyOptional({
    enum: [
      'avatar_upload_id',
      'documento_upload_id',
      'comprovante_upload_id',
      'biofacial_upload_id',
    ],
    description:
      'Campo *_upload_id do perfil correspondente ao kind enviado. ' +
      'Preenchido somente para uploads de KYC.',
  })
  profileField?:
    | 'avatar_upload_id'
    | 'documento_upload_id'
    | 'comprovante_upload_id'
    | 'biofacial_upload_id';
}

export class UploadResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ckl5g8b3p0001' })
  publicId: string;

  @ApiProperty({ example: 'image' })
  type: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: 'test.jpg' })
  originalName: string;

  @ApiProperty({ example: 1024 })
  size: number;

  @ApiProperty({ example: 'jpg' })
  extension: string;

  @ApiProperty({ example: 'image' })
  bucket: string;

  @ApiProperty({ example: 'sha256hash', description: 'SHA-256 do conte�do' })
  sha256: string;

  @ApiPropertyOptional({ example: 'https://storage.example/hash.jpg' })
  url?: string;

  @ApiPropertyOptional({ example: 'https://storage.example-md/hash.webp' })
  url_md?: string;

  @ApiPropertyOptional({ example: 'https://storage.example-sm/hash.webp' })
  url_web?: string;

  @ApiPropertyOptional({ example: 'sha256hash.jpg' })
  key?: string;

  @ApiPropertyOptional({
    example: {
      lg: { avif: { bucket: 'image', key: 'hash.avif', size: 409600 } },
    },
    description: 'Variantes do upload (JSON)',
  })
  variants?: any;

  @ApiProperty({
    example: 'READY',
    enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED', 'INFECTED'],
  })
  status: UploadStatus;

  @ApiProperty({ example: 'APPLICABLE' })
  applicancy: string;

  @ApiPropertyOptional({ example: null })
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DeleteUploadResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
