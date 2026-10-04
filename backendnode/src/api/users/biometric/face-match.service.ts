import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FaceBiometricService } from './face-biometric.service';
import { FACE_EMBEDDER, FaceEmbedder } from './face-embedder';
import { Inject } from '@nestjs/common';

/**
 * Similaridade de cosseno entre dois vetores. Pura e testável.
 * Retorna valor em [-1, 1] (1 = idênticos). Retorna null para vetores
 * incompatíveis/vazios.
 */
export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length === 0 || a.length !== b.length) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return null;
  return dot / denom;
}

export type FaceMatchBand = 'match' | 'review' | 'no_match';

export interface FaceMatchResult {
  /** Há vetores suficientes para comparar? (extrator ativo + template + doc) */
  available: boolean;
  score?: number; // cosine [-1,1]
  band?: FaceMatchBand;
  threshold?: number;
  reason?: 'embedder_disabled' | 'no_template' | 'no_face_in_document';
}

/**
 * Compara a selfie (template persistido) com a face do documento — APOIO à
 * decisão do Compliance (área de admin), nunca aprovação automática (MVP).
 *
 * O threshold é calibrável via `FACE_MATCH_THRESHOLD` (default conservador);
 * deve ser medido no fluxo real (FAR/FRR) antes de virar decisão forte.
 */
@Injectable()
export class FaceMatchService {
  private readonly logger = new Logger(FaceMatchService.name);
  private readonly threshold: number;
  /** Margem de "zona cinzenta" abaixo do threshold que pede revisão manual. */
  private readonly reviewMargin: number;

  constructor(
    config: ConfigService,
    private readonly faceBiometric: FaceBiometricService,
    @Inject(FACE_EMBEDDER) private readonly embedder: FaceEmbedder,
  ) {
    this.threshold = Number(
      config.get<string>('FACE_MATCH_THRESHOLD') ?? '0.38',
    );
    this.reviewMargin = Number(
      config.get<string>('FACE_MATCH_REVIEW_MARGIN') ?? '0.08',
    );
  }

  /** Classifica o score em faixa (banda). */
  classify(score: number): FaceMatchBand {
    if (score >= this.threshold) return 'match';
    if (score >= this.threshold - this.reviewMargin) return 'review';
    return 'no_match';
  }

  /**
   * Status leve para o painel do Compliance, sem baixar o documento do storage.
   * Informa se o match está disponível (extrator ativo + template presente).
   */
  async status(userId: number): Promise<FaceMatchResult> {
    if (!this.embedder.isEnabled()) {
      return { available: false, reason: 'embedder_disabled' };
    }
    const selfieVector = await this.faceBiometric.getVector(userId);
    if (!selfieVector) {
      return { available: false, reason: 'no_template' };
    }
    // Extrator ativo e template presente: o match efetivo é calculado sob
    // demanda em `compareToDocument` (que baixa e processa o documento).
    return { available: true, threshold: this.threshold };
  }

  /**
   * Compara o template da selfie do usuário com a face extraída do documento.
   * `documentMedia` é o buffer do arquivo de documento (imagem).
   */
  async compareToDocument(
    userId: number,
    documentMedia: Buffer,
    mimeType?: string,
  ): Promise<FaceMatchResult> {
    if (!this.embedder.isEnabled()) {
      return { available: false, reason: 'embedder_disabled' };
    }

    const selfieVector = await this.faceBiometric.getVector(userId);
    if (!selfieVector) {
      return { available: false, reason: 'no_template' };
    }

    const docEmbedding = await this.embedder.extract(documentMedia, mimeType);
    if (!docEmbedding) {
      return { available: false, reason: 'no_face_in_document' };
    }

    const score = cosineSimilarity(selfieVector, docEmbedding.vector);
    if (score == null) {
      return { available: false, reason: 'no_face_in_document' };
    }

    const band = this.classify(score);
    this.logger.log(
      `Face match userId=${userId} score=${score.toFixed(3)} band=${band}`,
    );
    return {
      available: true,
      score,
      band,
      threshold: this.threshold,
    };
  }
}
