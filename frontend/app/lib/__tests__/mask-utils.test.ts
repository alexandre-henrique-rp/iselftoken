/**
 * Testes para mask-utils.ts — padrões de máscara e handlers.
 * Cobre máscara de CNPJ alfanumérico (token A do remask + handler custom).
 */
import type { ChangeEvent } from "react";
import { describe, expect, it } from "vitest";
import {
  MASK_PATTERNS,
  applyCepMask,
  applyCnpjMask,
  applyCpfMask,
  applyPhoneMask,
  applyRgMask,
  cnpjMaskHandler,
  digitsOnlyHandlerWithMax,
  unmaskAlphanumeric,
  unmaskValue,
} from "~/lib/mask-utils";

describe("MASK_PATTERNS", () => {
  it("CNPJ deve usar token A para alfanumérico e 9 para DV", () => {
    expect(MASK_PATTERNS.CNPJ).toBe("AA.AAA.AAA/AAAA-99");
  });
});

describe("applyCnpjMask", () => {
  it("deve ser idempotente — chamar 2x produz mesma string", () => {
    const input = "AB12C3DE45F678";
    expect(applyCnpjMask(applyCnpjMask(input))).toBe(applyCnpjMask(input));
  });

  it("deve mascarar corretamente CNPJ alfanumérico", () => {
    expect(applyCnpjMask("AB12C3DE45F678")).toBe("AB.12C.3DE/45F6-78");
  });

  it("deve aceitar letras e dígitos intercalados", () => {
    expect(applyCnpjMask("12AB3CDE45F678")).toBe("12.AB3.CDE/45F6-78");
    expect(applyCnpjMask("ABCD1234567800")).toBe("AB.CD1.234/5678-00");
  });

  it("deve converter minúsculas para maiúsculas", () => {
    expect(applyCnpjMask("ab12c3de45f678")).toBe("AB.12C.3DE/45F6-78");
  });

  it("deve funcionar com entrada já mascarada parcialmente", () => {
    expect(applyCnpjMask("AB.12C")).toBe("AB.12C");
    expect(applyCnpjMask("AB.12C.3DE/45F6")).toBe("AB.12C.3DE/45F6");
  });

  it("deve formatar progressivamente com entrada curta", () => {
    expect(applyCnpjMask("A")).toBe("A");
    expect(applyCnpjMask("AB")).toBe("AB");
    expect(applyCnpjMask("AB1")).toBe("AB.1");
    expect(applyCnpjMask("AB12")).toBe("AB.12");
  });

  it("deve ignorar caracteres de máscara na entrada", () => {
    expect(applyCnpjMask("AB-12C.3DE/45F6-78")).toBe("AB.12C.3DE/45F6-78");
  });
});

describe("cnpjMaskHandler", () => {
  it("não deve quebrar com letras maiúsculas no onChange", () => {
    const event = {
      target: { value: "AB12C3DE45F678" },
    } as unknown as ChangeEvent<HTMLInputElement>;
    cnpjMaskHandler(event);
    expect(event.target.value).toBe("AB.12C.3DE/45F6-78");
  });

  it("não deve quebrar com letras minúsculas no onChange", () => {
    const event = {
      target: { value: "ab12c3de45f678" },
    } as unknown as ChangeEvent<HTMLInputElement>;
    cnpjMaskHandler(event);
    expect(event.target.value).toBe("AB.12C.3DE/45F6-78");
  });

  it("não deve quebrar com entrada parcial", () => {
    const event = {
      target: { value: "AB12C" },
    } as unknown as ChangeEvent<HTMLInputElement>;
    cnpjMaskHandler(event);
    expect(event.target.value).toBe("AB.12C");
  });
});

describe("unmaskAlphanumeric", () => {
  it("deve remover máscara e converter para maiúsculas", () => {
    expect(unmaskAlphanumeric("AB.12C.3DE/45F6-78")).toBe("AB12C3DE45F678");
  });

  it("deve converter minúsculas para maiúsculas", () => {
    expect(unmaskAlphanumeric("ab12c3de45f678")).toBe("AB12C3DE45F678");
  });

  it("deve retornar string vazia para null/undefined", () => {
    expect(unmaskAlphanumeric(null)).toBe("");
    expect(unmaskAlphanumeric(undefined)).toBe("");
  });
});

describe("unmaskValue", () => {
  it("deve remover máscara de CPF", () => {
    expect(unmaskValue("123.456.789-00")).toBe("12345678900");
  });

  it("deve retornar string vazia para null/undefined", () => {
    expect(unmaskValue(null)).toBe("");
    expect(unmaskValue(undefined)).toBe("");
  });
});

describe("applyRgMask", () => {
  it("deve formatar RG corretamente", () => {
    expect(applyRgMask("123456789")).toBe("12.345.678-9");
  });
});

describe("applyCpfMask", () => {
  it("deve formatar CPF corretamente", () => {
    expect(applyCpfMask("12345678900")).toBe("123.456.789-00");
  });
});

describe("applyPhoneMask", () => {
  it("deve formatar telefone fixo corretamente", () => {
    expect(applyPhoneMask("1134445555")).toBe("(11) 3444-5555");
  });

  it("deve formatar telefone celular corretamente", () => {
    expect(applyPhoneMask("11987654321")).toBe("(11) 9 8765-4321");
  });
});

describe("applyCepMask", () => {
  it("deve formatar CEP corretamente", () => {
    expect(applyCepMask("01310900")).toBe("01310-900");
  });
});

describe("digitsOnlyHandlerWithMax", () => {
  function makeEvent(value: string): ChangeEvent<HTMLInputElement> {
    return { target: { value } } as unknown as ChangeEvent<HTMLInputElement>;
  }

  it("deve remover tudo que nao for digito", () => {
    const e = makeEvent("12a3b4");
    digitsOnlyHandlerWithMax()(e);
    expect(e.target.value).toBe("1234");
  });

  it("deve manter string inalterada quando ja so tem digitos", () => {
    const e = makeEvent("12345");
    digitsOnlyHandlerWithMax()(e);
    expect(e.target.value).toBe("12345");
  });

  it("deve respeitar o maxLength informado", () => {
    const e = makeEvent("123456789012345");
    digitsOnlyHandlerWithMax(10)(e);
    expect(e.target.value).toBe("1234567890");
  });

  it("deve trancar entrada com letras + limite", () => {
    const e = makeEvent("abc12345xyz");
    digitsOnlyHandlerWithMax(4)(e);
    expect(e.target.value).toBe("1234");
  });

  it("deve tratar string vazia sem erro", () => {
    const e = makeEvent("");
    digitsOnlyHandlerWithMax(10)(e);
    expect(e.target.value).toBe("");
  });
});
