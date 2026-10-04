import { PartialType } from '@nestjs/mapped-types';
import { CreateUploadDto } from './create-upload.dto';

export class UpdateUplaodDto extends PartialType(CreateUploadDto) {}
