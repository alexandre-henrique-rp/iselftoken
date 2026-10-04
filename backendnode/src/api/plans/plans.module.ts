import { Global, Module } from '@nestjs/common';
import { PlansService } from './services/plans.service';
import { PlansController } from './plans.controller';
import { AdminValidateService } from './services/admi-validate.service';

@Global()
@Module({
  controllers: [PlansController],
  providers: [PlansService, AdminValidateService],
  exports: [PlansService, AdminValidateService],
})
export class PlansModule {}
