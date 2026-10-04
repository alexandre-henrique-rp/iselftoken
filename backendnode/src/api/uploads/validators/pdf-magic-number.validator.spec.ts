import { BadRequestException } from '@nestjs/common';
import { PdfMagicNumberValidator } from './pdf-magic-number.validator';

describe('PdfMagicNumberValidator', () => {
  let validator: PdfMagicNumberValidator;

  beforeEach(() => {
    validator = new PdfMagicNumberValidator();
  });

  describe('isValid', () => {
    it('should return true for valid PDF buffer', () => {
      // %PDF-1.4 (magic number of a valid PDF)
      const pdfBuffer = Buffer.from('%PDF-1.4');
      const mockFile = { buffer: pdfBuffer } as Express.Multer.File;

      expect(validator.isValid(mockFile)).toBe(true);
    });

    it('should return true for PDF with additional bytes after magic number', () => {
      const pdfBuffer = Buffer.from('%PDF-1.6\n%EOF');
      const mockFile = { buffer: pdfBuffer } as Express.Multer.File;

      expect(validator.isValid(mockFile)).toBe(true);
    });

    it('should throw BadRequestException for EXE file (MZ header)', () => {
      // MZ header (DOS executable)
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      const mockFile = { buffer: exeBuffer } as Express.Multer.File;

      expect(() => validator.isValid(mockFile)).toThrow(BadRequestException);
      expect(() => validator.isValid(mockFile)).toThrow(
        'Apenas arquivos PDF sao aceitos',
      );
    });

    it('should throw BadRequestException for text file', () => {
      const textBuffer = Buffer.from('Hello, this is a text file');
      const mockFile = { buffer: textBuffer } as Express.Multer.File;

      expect(() => validator.isValid(mockFile)).toThrow(BadRequestException);
      expect(() => validator.isValid(mockFile)).toThrow(
        'Apenas arquivos PDF sao aceitos',
      );
    });

    it('should throw BadRequestException for PNG image', () => {
      // PNG header
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const mockFile = { buffer: pngBuffer } as Express.Multer.File;

      expect(() => validator.isValid(mockFile)).toThrow(BadRequestException);
      expect(() => validator.isValid(mockFile)).toThrow(
        'Apenas arquivos PDF sao aceitos',
      );
    });

    it('should throw BadRequestException for JPEG image', () => {
      // JPEG header (SOI marker) - 4 bytes only, less than 5
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const mockFile = { buffer: jpegBuffer } as Express.Multer.File;

      expect(() => validator.isValid(mockFile)).toThrow(BadRequestException);
      expect(() => validator.isValid(mockFile)).toThrow(
        'Arquivo muito pequeno para ser um PDF valido',
      );
    });

    it('should throw BadRequestException for file with less than 5 bytes', () => {
      const smallBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF (only 4 bytes)
      const mockFile = { buffer: smallBuffer } as Express.Multer.File;

      expect(() => validator.isValid(mockFile)).toThrow(BadRequestException);
      expect(() => validator.isValid(mockFile)).toThrow(
        'Arquivo muito pequeno para ser um PDF valido',
      );
    });

    it('should throw BadRequestException for null buffer', () => {
      const mockFile = { buffer: null } as unknown as Express.Multer.File;

      expect(() => validator.isValid(mockFile)).toThrow(BadRequestException);
      expect(() => validator.isValid(mockFile)).toThrow(
        'Arquivo invalido ou buffer ausente',
      );
    });

    it('should throw BadRequestException for undefined buffer', () => {
      const mockFile = {} as unknown as Express.Multer.File;

      expect(() => validator.isValid(mockFile)).toThrow(BadRequestException);
      expect(() => validator.isValid(mockFile)).toThrow(
        'Arquivo invalido ou buffer ausente',
      );
    });
  });

  describe('buildErrorMessage', () => {
    it('should return the correct error message', () => {
      expect(validator.buildErrorMessage()).toBe(
        'Apenas arquivos PDF sao aceitos',
      );
    });
  });
});
