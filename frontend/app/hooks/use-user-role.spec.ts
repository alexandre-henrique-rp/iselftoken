/**
 * Regressao da F-09: role no frontend controla somente affordances visuais.
 * A autorizacao efetiva continua sendo responsabilidade dos guards do backend.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUser } from "./use-user";
import { hasRole, useUserRole, type UserRole } from "./use-user-role";

vi.mock("./use-user", () => ({
  useUser: vi.fn(),
}));

const mockedUseUser = vi.mocked(useUser);

function setRole(role: UserRole | string | null) {
  mockedUseUser.mockReturnValue({
    user: role
      ? ({ role } as unknown as ReturnType<typeof useUser>["user"])
      : null,
  } as ReturnType<typeof useUser>);
}

describe("useUserRole e hasRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each<UserRole>(["USER", "ADMIN", "FINANCEIRO", "COMPLIANCE"])(
    "deriva a role %s do usuario autenticado",
    (role) => {
      setRole(role);

      const { result } = renderHook(() => useUserRole());

      expect(result.current).toBe(role);
    },
  );

  it("retorna null e nunca concede affordance sem usuario", () => {
    setRole(null);

    const { result } = renderHook(() => ({
      role: useUserRole(),
      allowed: hasRole(["ADMIN"]),
    }));

    expect(result.current).toEqual({ role: null, allowed: false });
  });

  it("limita hasRole a comparacao da role atual, sem substituir a autorizacao do backend", () => {
    setRole("COMPLIANCE");

    const { result } = renderHook(() => ({
      compliance: hasRole(["COMPLIANCE"]),
      admin: hasRole(["ADMIN"]),
    }));

    expect(result.current).toEqual({ compliance: true, admin: false });
  });

  it("nao concede role desconhecida por fallback", () => {
    setRole("SUPPORT");

    const { result } = renderHook(() => hasRole(["ADMIN", "COMPLIANCE"]));

    expect(result.current).toBe(false);
  });
});
