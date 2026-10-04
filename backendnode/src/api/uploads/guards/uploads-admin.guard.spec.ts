import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { UploadsAdminGuard } from './uploads-admin.guard';

describe('UploadsAdminGuard', () => {
  let guard: UploadsAdminGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsAdminGuard],
    }).compile();

    guard = module.get<UploadsAdminGuard>(UploadsAdminGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('deve permitir acesso para role ADMIN', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 1, role: 'ADMIN' },
          }),
        }),
      } as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('deve negar acesso para role COMPLIANCE', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 1, role: 'COMPLIANCE' },
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow();
    });

    it('deve negar acesso para role FINANCEIRO', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 1, role: 'FINANCEIRO' },
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow();
    });

    it('deve negar acesso quando usuario nao existe', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: null,
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow();
    });

    it('deve negar acesso quando role nao definida', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 1, role: undefined },
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow();
    });
  });
});
