import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import { AppService } from './app.service';

@Controller()
@ApiTags('App')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug-sentry')
  debugSentry(): void {
    throw new Error('Debug Sentry: Erro de teste para verificar integração');
  }

  @Get('debug-sentry-span')
  debugSentrySpan(): { status: string } {
    return Sentry.startSpan({ op: 'test', name: 'NestJS Test Span' }, () => {
      return { status: 'Span de teste criado com sucesso' };
    });
  }
}
