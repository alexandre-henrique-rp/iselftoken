import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SessionService } from '../../auth/session/session.service';
import { StorageProviderModule } from '../../common/storage/storage-provider.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StartupModule } from '../startup/startup.module';
import { BiometricConsentController } from './biometric-consent.controller';
import { FaceBiometricService } from './biometric/face-biometric.service';
import { FaceMatchService } from './biometric/face-match.service';
import { FACE_EMBEDDER, NoopFaceEmbedder } from './biometric/face-embedder';
import { TemplateCipherService } from './biometric/template-cipher.service';
import { LivenessTelemetryController } from './liveness-telemetry.controller';
import { LivenessTelemetryService } from './liveness-telemetry.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, StorageProviderModule, StartupModule, PrismaModule],
  controllers: [
    UsersController,
    BiometricConsentController,
    LivenessTelemetryController,
  ],
  providers: [
    UsersService,
    SessionService,
    LivenessTelemetryService,
    TemplateCipherService,
    FaceBiometricService,
    FaceMatchService,
    // Extrator plugável: Noop por enquanto (troque por OnnxArcFaceEmbedder
    // quando o modelo .onnx estiver hospedado e o onnxruntime instalado).
    { provide: FACE_EMBEDDER, useClass: NoopFaceEmbedder },
  ],
  exports: [
    UsersService,
    LivenessTelemetryService,
    FaceBiometricService,
    FaceMatchService,
  ],
})
export class UsersModule {}
