import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // O interceptor é global e também pode ser aplicado a consumers RabbitMQ
    // ou outros contextos não-HTTP. Nesses casos não existe request/response
    // Express para transportar correlation ID.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    if (!request || !response) {
      return next.handle();
    }

    const { method, url } = request;
    const headers = request.headers ?? (request.headers = {});
    const correlationId = headers['x-correlation-id'] || uuidv4();
    headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          JSON.stringify({
            correlationId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          }),
        );
        // TODO @dev: remover logs HTTP em produção — exposição de URLs e statusCode
      }),
    );
  }
}
