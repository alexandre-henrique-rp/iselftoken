import { DeviceContextService } from './device-context.service';

describe('DeviceContextService', () => {
  const service = new DeviceContextService();

  it('normaliza Chrome no Windows sem expor o user-agent cru', () => {
    const result = service.normalize(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    );
    expect(result.label).toBe('Chrome no Windows');
    expect(result.deviceType).toBe('desktop');
    expect(result.label).not.toContain('Mozilla');
  });

  it('degrada UA vazio ou automação para labels seguros', () => {
    expect(service.normalize(null).label).toBe('Dispositivo não identificado');
    expect(service.normalize('curl/8.0 bot').label).toBe('Bot ou automação');
  });
});
