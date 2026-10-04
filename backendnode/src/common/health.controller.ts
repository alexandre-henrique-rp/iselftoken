import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Controller, Get, Optional } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from './dto/response.dto';

@Controller()
@ApiTags('Health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    // Opcional para não quebrar contextos de teste sem o MessagingModule.
    @Optional() private readonly amqp?: AmqpConnection,
  ) {}

  @Get('health')
  getHealth() {
    return ResponseDto.success('OK', 200, {
      status: 'up',
      timestamp: new Date().toISOString(),
    });
  }

  @Get('ready')
  async getReady() {
    let dbStatus = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    // Status do broker RabbitMQ (mensageria de pagamentos). `connected` é
    // exposto pelo AmqpConnection do golevelup.
    const rabbitStatus = this.amqp?.connected ? 'up' : 'down';

    const allUp = dbStatus === 'up' && rabbitStatus === 'up';
    return ResponseDto.success(
      allUp ? 'Ready' : 'Not ready',
      allUp ? 200 : 503,
      {
        database: dbStatus,
        rabbitmq: rabbitStatus,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
