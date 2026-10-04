import { ApiProperty } from '@nestjs/swagger';

export class Upload {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'documento.png' })
  originalName: string;

  @ApiProperty({ example: 1024 })
  size: number;

  @ApiProperty({ example: 'image/png' })
  mineType: string;

  @ApiProperty({ example: 'png' })
  extension: string;

  @ApiProperty({ example: '/documents/uuid.png' })
  url: string;

  @ApiProperty({ example: '/documents/sm/uuid.png' })
  url_sm: string;

  @ApiProperty({ example: '/documents/md/uuid.png' })
  url_md: string;

  @ApiProperty({ example: '/documents/lg/uuid.png' })
  url_lg: string;

  @ApiProperty({
    enum: [
      'PENDING',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'NEEDS_RESUBMISSION',
    ],
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({ example: null, required: false })
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
