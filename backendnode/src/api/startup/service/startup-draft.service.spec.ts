import { Test, TestingModule } from '@nestjs/testing';
import { StartupDraftService } from './startup-draft.service';

describe('StartupDraftService', () => {
  let service: StartupDraftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StartupDraftService],
    }).compile();

    service = module.get(StartupDraftService);
  });

  describe('saveDraft()', () => {
    it('deve salvar rascunho e retornar timestamp', async () => {
      const result = await service.saveDraft(1, { nome: 'Teste' });
      expect(result.error).toBe(false);
      expect(result.data.savedAt).toBeDefined();
    });
  });

  describe('getDraft()', () => {
    it('deve retornar null se nao existe draft', async () => {
      const result = await service.getDraft(999);
      expect(result.error).toBe(false);
      expect(result.data.data).toBeNull();
    });

    it('deve retornar dados do draft salvo', async () => {
      await service.saveDraft(1, { nome: 'X' });
      const result = await service.getDraft(1);
      expect(result.error).toBe(false);
      expect(result.data.data.nome).toBe('X');
      expect(result.data.savedAt).toBeDefined();
    });
  });

  describe('deleteDraft()', () => {
    it('deve remover draft existente', async () => {
      await service.saveDraft(1, { nome: 'X' });
      const result = await service.deleteDraft(1);
      expect(result.error).toBe(false);

      const after = await service.getDraft(1);
      expect(after.data.data).toBeNull();
    });

    it('deve retornar ok mesmo sem draft', async () => {
      const result = await service.deleteDraft(999);
      expect(result.error).toBe(false);
    });
  });
});
