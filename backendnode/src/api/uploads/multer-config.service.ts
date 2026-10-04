import { Injectable } from '@nestjs/common';
import { MulterModuleOptions } from '@nestjs/platform-express';

/**
 * Configuracao centralizada do Multer para todos os uploads.
 *
 * Define o limite físico global de 500MB para qualquer arquivo enviado via
 * FileInterceptor em qualquer endpoint da aplicacao.
 *
 * @example
 * // uploads.module.ts
 * MulterModule.forRootAsync({
 *   useClass: MulterConfigService,
 * })
 */
@Injectable()
export class MulterConfigService {
  /**
   * Retorna as opcoes do Multer com limite físico de 500MB.
   *
   * @returns MulterModuleOptions com limits: { fileSize: 500MB }
   */
  createMulterOptions(): MulterModuleOptions {
    return {
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB em bytes
      },
    };
  }
}
