import { LoginLocationResolver } from './login-location.resolver';

describe('LoginLocationResolver', () => {
  const service = new LoginLocationResolver();

  it('retorna localização indisponível', async () => {
    const result = await service.resolve();
    expect(result.location.source).toBe('UNAVAILABLE');
    expect(result.location.precision).toBe('UNAVAILABLE');
    expect(result.geo).toBeNull();
  });
});
