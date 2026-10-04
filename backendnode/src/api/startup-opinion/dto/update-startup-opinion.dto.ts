import { PartialType } from '@nestjs/swagger';
import { CreateStartupOpinionDto } from './create-startup-opinion.dto';

export class UpdateStartupOpinionDto extends PartialType(
  CreateStartupOpinionDto,
) {}
