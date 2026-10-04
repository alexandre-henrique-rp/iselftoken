import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CertificateService } from './certificate.service';

/**
 * Cron job for certificate expiration management.
 *
 * This service runs daily at 3:00 AM to:
 * - Mark expired certificates as 'expired' status
 * - Log the number of certificates processed
 *
 * @description Daily cron job for certificate expiration management.
 */
@Injectable()
export class CertExpirationCron {
  private readonly logger = new Logger(CertExpirationCron.name);

  constructor(private readonly certificateService: CertificateService) {}

  /**
   * Daily cron job to mark expired certificates.
   * Runs every day at 03:00 AM.
   */
  @Cron('0 3 * * *')
  async handleCertificateExpiration(): Promise<void> {
    this.logger.log(
      '[CertExpirationCron] Starting daily certificate expiration check',
    );

    try {
      const count = await this.certificateService.markExpiredCertificates();
      this.logger.log(
        `[CertExpirationCron] Completed. Marked ${count} certificates as expired`,
      );
    } catch (error) {
      this.logger.error(
        `[CertExpirationCron] Error during certificate expiration check`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
