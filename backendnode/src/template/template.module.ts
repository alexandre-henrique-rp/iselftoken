import { Module } from '@nestjs/common';
import { PdfTemplateBuilderService } from './pdf-template-builder.service';

/**
 * Module for PDF template generation.
 *
 * @description Provides services for generating the Termo de Adesao PDF
 * using Handlebars templates and PDFKit.
 */
@Module({
  providers: [PdfTemplateBuilderService],
  exports: [PdfTemplateBuilderService],
})
export class TemplateModule {}
