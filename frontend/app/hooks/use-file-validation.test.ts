/**
 * Testes para useFileValidation (T104 - M6-S15-upload-hardening).
 * Valida tamanho max 50MB e tipo PDF-only.
 */
import { describe, it, expect } from "vitest";
import {
  validateFileSize,
  validateFileType,
  validateFile,
  type FileValidationResult,
} from "./use-file-validation";

/** Helper para criar File-like object de teste. */
function makeFile(name: string, size: number, type: string = "application/pdf"): File {
  // Cria um buffer com o tamanho exato desejado
  const buffer = new ArrayBuffer(size);
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
}

function assertOk(result: FileValidationResult) {
  expect(result.ok).toBe(true);
}

function assertError(result: FileValidationResult, contains: string) {
  expect(result.ok).toBe(false);
  expect((result as { message: string }).message).toContain(contains);
}

describe("validateFileSize", () => {
  it("retorna ok para arquivo menor que 50MB", () => {
    const file = makeFile("documento.pdf", 49 * 1024 * 1024);
    assertOk(validateFileSize(file));
  });

  it("retorna ok para arquivo exatamente 50MB", () => {
    const file = makeFile("documento.pdf", 50 * 1024 * 1024);
    assertOk(validateFileSize(file));
  });

  it("retorna erro para arquivo maior que 50MB", () => {
    const file = makeFile("documento.pdf", 51 * 1024 * 1024);
    assertError(validateFileSize(file), "50MB");
  });

  it("retorna erro para arquivo muito maior que 50MB", () => {
    const file = makeFile("video.mp4", 100 * 1024 * 1024);
    assertError(validateFileSize(file), "50MB");
  });
});

describe("validateFileType", () => {
  it("retorna ok para application/pdf com type application/pdf", () => {
    const file = makeFile("documento.pdf", 1024, "application/pdf");
    assertOk(validateFileType(file, "application/pdf,.pdf"));
  });

  it("retorna ok para arquivo .pdf (sem mime type)", () => {
    const file = makeFile("documento.pdf", 1024, "");
    assertOk(validateFileType(file, "application/pdf,.pdf"));
  });

  it("retorna erro para .png", () => {
    const file = makeFile("print.png", 1024, "image/png");
    assertError(validateFileType(file, "application/pdf,.pdf"), "PDF");
  });

  it("retorna erro para .txt", () => {
    const file = makeFile("readme.txt", 1024, "text/plain");
    assertError(validateFileType(file, "application/pdf,.pdf"), "PDF");
  });

  it("retorna erro para .exe renomeado para .pdf", () => {
    // MIME spoofing: .exe com extensao .pdf
    const file = makeFile("malware.pdf", 1024, "application/x-msdownload");
    assertError(validateFileType(file, "application/pdf,.pdf"), "PDF");
  });
});

describe("validateFile (combinado)", () => {
  it("retorna ok para PDF valido abaixo de 50MB", () => {
    const file = makeFile("contrato.pdf", 5 * 1024 * 1024, "application/pdf");
    assertOk(validateFile(file));
  });

  it("retorna erro de tamanho para PDF grande", () => {
    const file = makeFile("contrato.pdf", 51 * 1024 * 1024, "application/pdf");
    assertError(validateFile(file), "50MB");
  });

  it("retorna erro de tipo para .png (mesmo pequeno)", () => {
    const file = makeFile("print.png", 1024, "image/png");
    assertError(validateFile(file), "PDF");
  });

  it("retorna erro de tipo para .txt", () => {
    const file = makeFile("readme.txt", 512, "text/plain");
    assertError(validateFile(file), "PDF");
  });

  it("retorna erro de tipo para .exe renomeado para .pdf", () => {
    const file = makeFile("malware.pdf", 2048, "application/x-msdownload");
    assertError(validateFile(file), "PDF");
  });

  it("verifica ordem: tamanho eh validado antes do tipo", () => {
    // Arquivo grande E tipo invalido - deve retornar erro de tamanho
    const file = makeFile("malware.pdf", 51 * 1024 * 1024, "application/x-msdownload");
    const result = validateFile(file);
    assertError(result, "50MB");
  });
});
