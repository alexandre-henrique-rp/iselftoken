import { seedImageFromUrl } from './seed-image-helper';

describe('seedImageFromUrl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve realizar download e retornar o resultado esperado', async () => {
    const mockArrayBuffer = new Uint8Array([137, 80, 78, 71]).buffer; // PNG header bytes
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (header: string) =>
          header.toLowerCase() === 'content-type' ? 'image/png' : null,
      },
      arrayBuffer: async () => mockArrayBuffer,
    } as any);

    const result = await seedImageFromUrl(
      'test-slug',
      'https://example.com/logo.png',
    );

    expect(result.ok).toBe(true);
    expect(result.uploaded).toBe(true);
    expect(result.contentType).toBe('image/png');
    expect(result.size).toBe(4);
    expect(result.url).toBeDefined();
    expect(result.url_web).toBe(result.url);
  });

  it('deve fazer fallback gracioso quando o download falha', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const sourceUrl = 'https://example.com/fail.png';
    const result = await seedImageFromUrl('test-fail', sourceUrl);

    expect(result.ok).toBe(true);
    expect(result.uploaded).toBe(false);
    expect(result.url).toBe(sourceUrl);
    expect(result.size).toBe(0);
  });
});
