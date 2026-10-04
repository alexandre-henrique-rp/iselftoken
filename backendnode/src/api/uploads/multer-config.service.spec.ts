import { MulterConfigService } from './multer-config.service';

describe('MulterConfigService', () => {
  let service: MulterConfigService;

  beforeEach(() => {
    service = new MulterConfigService();
  });

  describe('createMulterOptions', () => {
    it('should return MulterModuleOptions with 500MB file size limit', () => {
      const options = service.createMulterOptions();

      expect(options).toBeDefined();
      expect(options.limits).toBeDefined();
      expect(options.limits!.fileSize).toBe(500 * 1024 * 1024); // 500MB in bytes
    });

    it('should set fileSize to exactly 524288000 bytes (500MB)', () => {
      const options = service.createMulterOptions();
      const expectedSize = 500 * 1024 * 1024;

      expect(options.limits!.fileSize).toBe(expectedSize);
    });
  });
});
