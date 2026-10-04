import { describe, expect, it } from "vitest";
import { couponFormSchema } from "~/lib/coupon-schema";
import { couponSearchParams, normalizeCouponsResponse } from "~/lib/queries";

describe("couponSearchParams", () => {
  it("serializa filtros administrativos sem incluir valores all", () => {
    const params = couponSearchParams({
      status: "active",
      percent: 50,
      search: "  black friday  ",
      page: 2,
      limit: 20,
    });

    expect(params.toString()).toBe(
      "status=active&percent=50&search=++black+friday++&page=2&limit=20",
    );
  });

  it("omite filtros não selecionados", () => {
    expect(
      couponSearchParams({
        status: "all",
        percent: "all",
        search: "",
      }).toString(),
    ).toBe("");
  });
});

describe("normalizeCouponsResponse", () => {
  it("normaliza o envelope paginado do backend", () => {
    const result = normalizeCouponsResponse({
      data: {
        items: [{ id: 1, code: "WELCOME" }],
        total: 21,
        page: 2,
        limit: 10,
        totalPages: 3,
      },
    });

    expect(result).toEqual({
      data: [{ id: 1, code: "WELCOME" }],
      total: 21,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });

  it("mantém compatibilidade com resposta em array e calcula paginação", () => {
    const result = normalizeCouponsResponse(
      { data: [{ id: 1, code: "WELCOME" }] },
      { page: 2, limit: 10 },
    );

    expect(result).toEqual({
      data: [{ id: 1, code: "WELCOME" }],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });
  });

  it("não retorna valores negativos ou indefinidos para payload vazio", () => {
    expect(normalizeCouponsResponse(null)).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });
});

describe("couponFormSchema", () => {
  const validCoupon = {
    code: "BLACK_FRIDAY",
    percent: 50,
    maxUses: "100",
    validFrom: "2026-11-20",
    validUntil: "2026-11-30",
    description: "Campanha de novembro",
  };

  it("aceita um cupom válido", () => {
    expect(couponFormSchema.safeParse(validCoupon).success).toBe(true);
  });

  it("rejeita percentual fora da whitelist", () => {
    const result = couponFormSchema.safeParse({ ...validCoupon, percent: 25 });

    expect(result.success).toBe(false);
  });

  it("rejeita código em minúsculas ou com caracteres inválidos", () => {
    const result = couponFormSchema.safeParse({
      ...validCoupon,
      code: "black friday",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita intervalo de validade invertido", () => {
    const result = couponFormSchema.safeParse({
      ...validCoupon,
      validFrom: "2026-12-01",
      validUntil: "2026-11-30",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["validUntil"],
          message: "A data final deve ser posterior à data inicial.",
        }),
      );
    }
  });
});
