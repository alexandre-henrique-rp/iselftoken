import { Injectable } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { CreateStartupOnboardingDto } from '../dto/create-startup-onboarding.dto';
import { RequestVerificationDto } from '../dto/request-verification.dto';
import { UpdateComplementaryDto } from '../dto/update-complementary.dto';
import { UpdateStartupDto } from '../dto/update-startup.dto';
import { StartupCrudService } from './startup-crud.service';
import { StartupDraftService } from './startup-draft.service';
import { StartupQueryService } from './startup-query.service';
import { StartupRoundService } from './startup-round.service';

/**
 * Facade do módulo de startups.
 * Delega chamadas para os 4 sub-serviços: CRUD, Query, Round e Draft.
 * Mantém a mesma API pública para o controller.
 */
@Injectable()
export class StartupService {
  constructor(
    private readonly crud: StartupCrudService,
    private readonly query: StartupQueryService,
    private readonly round: StartupRoundService,
    private readonly draft: StartupDraftService,
  ) {}

  // === CRUD (delega para StartupCrudService) ===

  /** @see StartupCrudService.create */
  async create(data: CreateStartupOnboardingDto, user: PayloadEntity) {
    return this.crud.create(data, user);
  }

  /** @see StartupCrudService.updateComplementary */
  async updateComplementary(
    startupId: number,
    data: UpdateComplementaryDto,
    user: PayloadEntity,
  ) {
    return this.crud.updateComplementary(startupId, data, user);
  }

  /** @see StartupCrudService.requestVerification */
  async requestVerification(
    startupId: number,
    data: RequestVerificationDto,
    user: PayloadEntity,
  ) {
    return this.crud.requestVerification(startupId, data, user);
  }

  /** @see StartupCrudService.findPublic */
  async findPublic(slugOrId: string) {
    return this.crud.findPublic(slugOrId);
  }

  /** @see StartupCrudService.findPrivate */
  async findPrivate(slug: string, user: PayloadEntity) {
    return this.crud.findPrivate(slug, user);
  }

  /** @see StartupCrudService.findAuthenticatedMarketplace */
  async findAuthenticatedMarketplace(slug: string) {
    return this.crud.findAuthenticatedMarketplace(slug);
  }

  /** @see StartupCrudService.findPreview */
  async findPreview(slug: string, user: PayloadEntity) {
    return this.crud.findPreview(slug, user);
  }

  /** @see StartupCrudService.findOne */
  async findOne(id: number) {
    return this.crud.findOne(id);
  }

  /** @see StartupCrudService.findOneAdmin */
  async findOneAdmin(id: number) {
    return this.crud.findOneAdmin(id);
  }

  /** @see StartupCrudService.update */
  async update(id: number, data: UpdateStartupDto, user?: any) {
    return this.crud.update(id, data, user);
  }

  /** @see StartupCrudService.resubmit */
  async resubmit(id: number, user: PayloadEntity) {
    return this.crud.resubmit(id, user);
  }

  /** @see StartupCrudService.remove */
  async remove(id: number, user?: any) {
    return this.crud.remove(id, user);
  }

  // === QUERIES (delega para StartupQueryService) ===

  /** @see StartupQueryService.findAll */
  async findAll(user: PayloadEntity) {
    return this.query.findAll(user);
  }

  /** @see StartupQueryService.findAllAdmin */
  async findAllAdmin(query?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    return this.query.findAllAdmin(query);
  }

  /** @see StartupQueryService.findAllPublic */
  async findAllPublic() {
    return this.query.findAllPublic();
  }

  /**
   * Delega para `StartupQueryService.findByMarketplaceTag` com tag type-safe.
   * Substitui o buggy `findByStatus` (bug onde.categoria).
   */
  async findByMarketplaceTag(
    tag: 'featured' | 'verified' | 'accelerated' | 'approval',
  ) {
    return this.query.findByMarketplaceTag(tag);
  }

  /** @see StartupQueryService.getFounderDashboardMetrics */
  async getFounderDashboardMetrics(user: PayloadEntity) {
    return this.query.getFounderDashboardMetrics(user);
  }

  /** @see StartupQueryService.getFounderStartupOverview */
  async getFounderStartupOverview(user: PayloadEntity) {
    return this.query.getFounderStartupOverview(user);
  }

  /** @see StartupQueryService.findStartupInvestors */
  async findStartupInvestors(startupId: number, user: PayloadEntity) {
    return this.query.findStartupInvestors(startupId, user);
  }

  // === ROUNDS (delega para StartupRoundService) ===

  /** @see StartupRoundService.pauseRound */
  async pauseRound(startupId: number, campaignId: number, user: PayloadEntity) {
    return this.round.pauseRound(startupId, campaignId, user);
  }

  /** @see StartupRoundService.cancelRound */
  async cancelRound(
    startupId: number,
    campaignId: number,
    user: PayloadEntity,
  ) {
    return this.round.cancelRound(startupId, campaignId, user);
  }

  // === DRAFTS (delega para StartupDraftService) ===

  /** @see StartupDraftService.saveDraft */
  async saveDraft(userId: number, data: any): Promise<ResponseDto> {
    return this.draft.saveDraft(userId, data);
  }

  /** @see StartupDraftService.getDraft */
  async getDraft(userId: number): Promise<ResponseDto> {
    return this.draft.getDraft(userId);
  }

  /** @see StartupDraftService.deleteDraft */
  async deleteDraft(userId: number): Promise<ResponseDto> {
    return this.draft.deleteDraft(userId);
  }
}
