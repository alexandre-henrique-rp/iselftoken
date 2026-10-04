import { ApiProperty } from '@nestjs/swagger';
import { MarketplaceCardDto } from './marketplace-card.dto';

export class CuratedPickDto {
  @ApiProperty({ example: 12 })
  startupId: number;

  @ApiProperty({
    example:
      'Time fundador com track record em fintech B2B e produto que já fatura.',
  })
  quote: string;

  @ApiProperty({ example: 'Maria Silva' })
  curatorName: string;

  @ApiProperty({ example: 'Lead Analyst' })
  curatorRole: string;

  @ApiProperty({ example: '/avatars/curator-1.png' })
  curatorAvatar: string;

  @ApiProperty({ type: () => MarketplaceCardDto })
  startup: MarketplaceCardDto;
}
