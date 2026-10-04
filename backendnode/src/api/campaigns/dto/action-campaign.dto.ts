/**
 * DTO para executar acao em uma campanha (T033 B06).
 * State machine: OPEN->PAUSE->RESUME->FINISH, CLOSED->FINISH, etc.
 */
import { IsEnum } from 'class-validator';

export enum CampaignAction {
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  FINISH = 'FINISH',
}

export class ActionCampaignDto {
  @IsEnum(CampaignAction)
  action!: CampaignAction;
}
