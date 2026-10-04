import { PartialType } from '@nestjs/swagger';
import { CreateDepoimentoDto } from './create-depoimento.dto';

export class UpdateDepoimentoDto extends PartialType(CreateDepoimentoDto) {}
