import {
  classifyClientIp,
  TrustedClientContextResolver,
} from './trusted-client-context.service';

describe('TrustedClientContextResolver', () => {
  it.each([
    ['203.0.113.10', 'RESERVED'],
    ['8.8.8.8', 'PUBLIC'],
    ['127.0.0.1', 'LOOPBACK'],
    ['10.0.0.1', 'PRIVATE'],
    ['192.168.1.10', 'PRIVATE'],
    ['198.51.100.2', 'RESERVED'],
    ['not-an-ip', 'INVALID'],
    [null, 'MISSING'],
  ])('classifica %s como %s', (ip, expected) => {
    expect(classifyClientIp(ip)).toBe(expected);
  });

  it('normaliza IPv4 mapeado em IPv6', () => {
    const context = new TrustedClientContextResolver().resolve({
      ip: '::ffff:8.8.8.8',
      socket: {},
    } as never);
    expect(context.ip).toBe('8.8.8.8');
    expect(context.ipClass).toBe('PUBLIC');
  });

  it('usa req.ip e nunca headers crus enviados pelo cliente', () => {
    const context = new TrustedClientContextResolver().resolve({
      ip: '8.8.8.8',
      headers: { 'x-forwarded-for': '1.1.1.1' },
      socket: { remoteAddress: '10.0.0.1' },
    } as never);
    expect(context.ip).toBe('8.8.8.8');
    expect(context.proxyChainTrusted).toBe(true);
  });
});
