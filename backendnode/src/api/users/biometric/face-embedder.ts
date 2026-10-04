import { Injectable, Logger } from '@nestjs/common';

/**
 * Resultado da extração de embedding facial.
 */
export interface FaceEmbedding {
  /** Vetor L2-normalizado. */
  vector: number[];
  dim: number;
  modelVersion: string;
}

/**
 * Contrato do extrator de embedding facial. A extração ocorre no SERVIDOR
 * (anti-tamper), a partir do arquivo biofacial real.
 *
 * Implementações:
 *  - `NoopFaceEmbedder` (default): desabilitado; retorna null. Permite que o
 *    resto do pipeline (cifra, persistência, LGPD) seja construído e testado
 *    sem depender do modelo ONNX/ArcFace ainda não hospedado.
 *  - `OnnxArcFaceEmbedder` (futuro): detecta+alinha a face e roda ArcFace via
 *    onnxruntime-node. Basta trocar o provider no módulo.
 */
export const FACE_EMBEDDER = Symbol('FACE_EMBEDDER');

export interface FaceEmbedder {
  /** Está habilitado/pronto para extrair? */
  isEnabled(): boolean;
  /**
   * Extrai o embedding de um buffer de mídia (imagem/frame). Retorna null se
   * não houver face detectável ou se o extrator estiver desabilitado.
   */
  extract(media: Buffer, mimeType?: string): Promise<FaceEmbedding | null>;
}

/**
 * Extrator "no-op": sempre retorna null (desabilitado). É o default seguro até
 * o modelo ArcFace/ONNX estar hospedado e o onnxruntime instalado.
 */
@Injectable()
export class NoopFaceEmbedder implements FaceEmbedder {
  private readonly logger = new Logger(NoopFaceEmbedder.name);

  isEnabled(): boolean {
    return false;
  }

  async extract(): Promise<FaceEmbedding | null> {
    this.logger.debug(
      'NoopFaceEmbedder ativo — extração de embedding desabilitada.',
    );
    return null;
  }
}
