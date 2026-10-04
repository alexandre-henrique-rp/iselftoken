import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminComplianceController } from './admin-compliance.controller';
import { AdminService } from './admin.service';
import { ComplianceCampaignsService } from './compliance-campaigns.service';

describe('AdminComplianceController', () => {
  let controller: AdminComplianceController;
  let complianceCampaignsService: {
    listCampaigns: jest.Mock;
    getCampaignDetail: jest.Mock;
  };

  beforeEach(async () => {
    complianceCampaignsService = {
      listCampaigns: jest.fn(),
      getCampaignDetail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminComplianceController],
      providers: [
        { provide: AdminService, useValue: {} },
        {
          provide: ComplianceCampaignsService,
          useValue: complianceCampaignsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminComplianceController>(
      AdminComplianceController,
    );
  });

  it('delega a listagem administrativa com filtros convertidos', async () => {
    const response = {
      error: false,
      data: { data: [{ id: 10, status: 'DRAFT' }], total: 1 },
    };
    complianceCampaignsService.listCampaigns.mockResolvedValue(response);

    const result = await controller.getCampaigns('DRAFT', '2', '20', 'startup');

    expect(complianceCampaignsService.listCampaigns).toHaveBeenCalledWith({
      status: 'DRAFT',
      page: 2,
      limit: 20,
      search: 'startup',
    });
    expect(result).toBe(response);
  });

  it('preserva a listagem de todos os status quando status não é informado', async () => {
    complianceCampaignsService.listCampaigns.mockResolvedValue({
      error: false,
      data: { data: [], total: 0 },
    });

    await controller.getCampaigns(undefined, undefined, undefined, undefined);

    expect(complianceCampaignsService.listCampaigns).toHaveBeenCalledWith({
      status: undefined,
      page: undefined,
      limit: undefined,
      search: undefined,
    });
  });

  it('delega o detalhe administrativo pelo ID', async () => {
    const response = {
      error: false,
      data: { id: 10, status: 'PAUSED' },
    };
    complianceCampaignsService.getCampaignDetail.mockResolvedValue(response);

    const result = await controller.getCampaign('10');

    expect(complianceCampaignsService.getCampaignDetail).toHaveBeenCalledWith(
      10,
    );
    expect(result).toBe(response);
  });
});
