import { Injectable } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';

/**
 * Serviço de rascunhos (drafts) in-memory para startups.
 * Estado persistido apenas em memória (reinicia com o processo).
 */
@Injectable()
export class StartupDraftService {
  private drafts: Map<number, { data: any; updatedAt: Date }> = new Map();

  /**
   * Salva rascunho da startup para o usuário.
   *
   * @param userId ID do usuário
   * @param data Dados do rascunho
   * @returns ResponseDto com timestamp do save
   */
  async saveDraft(userId: number, data: any): Promise<ResponseDto> {
    try {
      this.drafts.set(userId, {
        data,
        updatedAt: new Date(),
      });

      return ResponseDto.success('Rascunho salvo automaticamente', 200, {
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      return ResponseDto.error('Erro ao salvar rascunho', 500, error);
    }
  }

  /**
   * Recupera rascunho da startup do usuário.
   *
   * @param userId ID do usuário
   * @returns ResponseDto com dados do rascunho ou null
   */
  async getDraft(userId: number): Promise<ResponseDto> {
    try {
      const draft = this.drafts.get(userId);

      if (!draft) {
        return ResponseDto.success('Nenhum rascunho encontrado', 200, {
          data: null,
        });
      }

      return ResponseDto.success('Rascunho recuperado', 200, {
        data: draft.data,
        savedAt: draft.updatedAt.toISOString(),
      });
    } catch (error) {
      return ResponseDto.error('Erro ao recuperar rascunho', 500, error);
    }
  }

  /**
   * Remove rascunho após submissão da startup.
   *
   * @param userId ID do usuário
   * @returns ResponseDto
   */
  async deleteDraft(userId: number): Promise<ResponseDto> {
    try {
      this.drafts.delete(userId);
      return ResponseDto.success('Rascunho removido', 200);
    } catch (error) {
      return ResponseDto.error('Erro ao remover rascunho', 500, error);
    }
  }
}
