import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from 'src/auth/auth.guard';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { CampaignsController } from './campaigns.controller';
import { UpdateResourcesDto } from './dto/update-resources.dto';
import { CampaignResourceService } from './service/campaign-resource.service';
import { CampaignsCreateService } from './service/campaigns-create.service';
import { CampaignsCrudService } from './service/campaigns-crud.service';
import { CampaignsStateService } from './service/campaigns-state.service';

describe('CampaignsController — acesso e ownership', () => {
  it('mantém o detalhe público sem AuthGuard; o filtro de status é server-side', () => {
    const guards =
      Reflect.getMetadata(
        GUARDS_METADATA,
        CampaignsController.prototype.findOne,
      ) ?? [];

    expect(guards).not.toContain(AuthGuard);
  });

  it('mantém AuthGuard na rota PUT /:id/resources', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CampaignsController.prototype.updateResources,
    );

    expect(guards).toContain(AuthGuard);
  });

  it('encaminha o usuário autenticado ao service ao substituir recursos', async () => {
    const resources = {
      replaceAll: jest.fn().mockResolvedValue([]),
    } as unknown as CampaignResourceService;
    const controller = new CampaignsController(
      {} as CampaignsCrudService,
      {} as CampaignsCreateService,
      {} as CampaignsStateService,
      resources,
    );
    const user = { id: 42, role: 'FOUNDER' } as PayloadEntity;
    const request = { user } as Parameters<
      CampaignsController['updateResources']
    >[2];
    const dto = {
      resourceAllocations: [{ categoria: 'FUNDADOR', percentual: 100 }],
    } as UpdateResourcesDto;

    await controller.updateResources('10', dto, request);

    expect(resources.replaceAll).toHaveBeenCalledWith(
      10,
      dto.resourceAllocations,
      user,
    );
  });
});
