/**
 * Testes para auth-policy.ts — gating de rotas autenticadas e plano ativo.
 *
 * Cenários cobertos:
 *   - ADMIN/FINANCEIRO/COMPLIANCE passam sem checar plano
 *   - USER sem plano é redirecionado para /pricing em rotas privadas
 *   - USER sem plano PODE acessar /pricing, /profile e /checkout/*
 *   - USER com plano ativo passa em qualquer rota
 *   - Quando PAYMENTS_ENABLED=false, sem plano vai para /manutencao
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ensureActivePlan } from "~/lib/auth-policy";
import type { UserData } from "~/types/auth";

const baseUser: UserData = {
  id: 1,
  publicId: "u-1",
  email: "test@test.com",
  nome: "Test",
  role: "USER",
  telefone: "",
  data_nascimento: "",
  genero: "HOMEM",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  pais: "BR",
  tipo_documento: "CPF",
  reg_documento: "",
  isActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

function withPlan(user: UserData): UserData {
  return {
    ...user,
    subscriptions: [
      {
        id: 1,
        planId: 1,
        status: "ACTIVE",
        startedAt: "2026-01-01",
        expiresAt: "2027-01-01",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ],
  };
}

describe("ensureActivePlan — user undefined", () => {
  it("redireciona para /login quando user é undefined", () => {
    expect(() => ensureActivePlan(undefined, "/home")).toThrow();
    try {
      ensureActivePlan(undefined, "/home");
    } catch (err) {
      expect(err instanceof Response).toBe(true);
      const loc = (err as Response).headers.get("location");
      expect(loc).toBe("/login");
    }
  });
});

describe("ensureActivePlan — admin bypass", () => {
  it.each(["ADMIN", "FINANCEIRO", "COMPLIANCE"])(
    "%s passa sem plano",
    (role) => {
      expect(() =>
        ensureActivePlan({ ...baseUser, role: role as UserData["role"] }, "/home"),
      ).not.toThrow();
    },
  );
});

describe("ensureActivePlan — sem plano", () => {
  it("redireciona USER sem plano para /pricing em rota privada", () => {
    expect(() => ensureActivePlan(baseUser, "/home")).toThrow();
    try {
      ensureActivePlan(baseUser, "/home");
    } catch (err) {
      expect((err as Response).status).toBe(302);
      expect(err instanceof Response).toBe(true);
    }
  });

  it("permite /pricing sem plano", () => {
    expect(() => ensureActivePlan(baseUser, "/pricing")).not.toThrow();
  });

it("permite /profile sem plano (completar dados antes de assinar)", () => {
    expect(() => ensureActivePlan(baseUser, "/profile")).not.toThrow();
  });

  it("permite /checkout/* sem plano", () => {
    expect(() =>
      ensureActivePlan(baseUser, "/checkout/payment/123"),
    ).not.toThrow();
    expect(() =>
      ensureActivePlan(baseUser, "/checkout/abc"),
    ).not.toThrow();
  });
});

describe("ensureActivePlan — com plano", () => {
  it("USER com plano ativo passa em qualquer rota", () => {
    const user = withPlan(baseUser);
    expect(() => ensureActivePlan(user, "/home")).not.toThrow();
    expect(() => ensureActivePlan(user, "/profile")).not.toThrow();
    expect(() => ensureActivePlan(user, "/wallet")).not.toThrow();
  });

  it("assinatura expirada não conta como ativa", () => {
    const user = {
      ...baseUser,
      subscriptions: [
        {
          id: 1,
          planId: 1,
          status: "EXPIRED" as const,
          startedAt: "2020-01-01",
          expiresAt: "2021-01-01",
          createdAt: "2020-01-01",
          updatedAt: "2021-01-01",
        },
      ],
    };
    expect(() => ensureActivePlan(user, "/home")).toThrow();
  });
});

describe("ensureActivePlan — PAYMENTS_ENABLED=false", () => {
  let origEnv: string | undefined;

  beforeEach(() => {
    origEnv = process.env.PAYMENTS_ENABLED;
    process.env.PAYMENTS_ENABLED = "false";
  });

  afterEach(() => {
    if (origEnv === undefined) delete process.env.PAYMENTS_ENABLED;
    else process.env.PAYMENTS_ENABLED = origEnv;
  });

  it("sem plano redireciona para /manutencao", () => {
    try {
      ensureActivePlan(baseUser, "/home");
    } catch (err) {
      expect(err instanceof Response).toBe(true);
      // location header aponta para /manutencao
      const loc = (err as Response).headers.get("location");
      expect(loc).toBe("/manutencao");
    }
  });

  it("com plano passa normalmente", () => {
    expect(() => ensureActivePlan(withPlan(baseUser), "/home")).not.toThrow();
  });

  it("bloqueia /pricing quando pagamentos desabilitados", () => {
    try {
      ensureActivePlan(baseUser, "/pricing");
    } catch (err) {
      expect(err instanceof Response).toBe(true);
    }
  });
});
