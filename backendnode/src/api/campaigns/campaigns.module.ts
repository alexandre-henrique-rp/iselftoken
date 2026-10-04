import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsCrudService } from './service/campaigns-crud.service';
import { CampaignsCreateService } from './service/campaigns-create.service';
import { CampaignsStateService } from './service/campaigns-state.service';
import { CampaignResourceService } from './service/campaign-resource.service';
import { SystemConfigModule } from 'src/common/system-config/system-config.module';

/**
 * Modulo de Campaigns.
 *
 * S01.2b: importa SystemConfigModule (ja registrado no AppModule, mas
 * reimportado aqui para clareza de dependencia e para suportar testes
 * isolados do modulo).
 */
@Module({
  imports: [SystemConfigModule],
  controllers: [CampaignsController],
  providers: [
    CampaignsCrudService,
    CampaignsCreateService,
    CampaignsStateService,
    CampaignResourceService,
  ],
  exports: [
    CampaignsCrudService,
    CampaignsCreateService,
    CampaignsStateService,
    CampaignResourceService,
  ],
})
export class CampaignsModule {}
