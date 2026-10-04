import { describe, expect, it } from "vitest";
import {
  landingPathForRole,
  postAuthRedirect,
} from "~/lib/post-auth-redirect";

/**
 * Cobre a regra de landing pós-login/2FA. Roles administrativos
 * (ADMIN/FINANCEIRO/COMPLIANCE) aterrissam em /admin/dashboard;
 * USER (e fallback) aterrissa em /home; requiresVerification sempre
 * vai para /2fa antes.
 */
describe("landingPathForRole", () => {
  it.each([
    ["ADMIN", "/admin/dashboard"],
    ["FINANCEIRO", "/admin/dashboard"],
    ["COMPLIANCE", "/admin/dashboard"],
    ["USER", "/home"],
    ["FOUNDER", "/home"], // fallback seguro (não quebra landing)
    ["INVESTOR", "/home"], // fallback seguro (não quebra landing)
  ])("role=%s → %s", (role, expected) => {
    expect(landingPathForRole(role)).toBe(expected);
  });
});

describe("postAuthRedirect", () => {
  it("requiresVerification=true → /2fa (precedência sobre role)", () => {
    expect(
      postAuthRedirect({ role: "ADMIN", requiresVerification: true }),
    ).toBe("/2fa");
    expect(
      postAuthRedirect({ role: "FINANCEIRO", requiresVerification: true }),
    ).toBe("/2fa");
    expect(
      postAuthRedirect({ role: "USER", requiresVerification: true }),
    ).toBe("/2fa");
  });

  it("ADMIN sem 2FA → /admin/dashboard", () => {
    expect(postAuthRedirect({ role: "ADMIN" })).toBe("/admin/dashboard");
  });

  it("FINANCEIRO sem 2FA → /admin/dashboard", () => {
    expect(postAuthRedirect({ role: "FINANCEIRO" })).toBe("/admin/dashboard");
  });

  it("COMPLIANCE sem 2FA → /admin/dashboard", () => {
    expect(postAuthRedirect({ role: "COMPLIANCE" })).toBe("/admin/dashboard");
  });

  it("USER sem 2FA → /home (default)", () => {
    expect(postAuthRedirect({ role: "USER" })).toBe("/home");
  });
});
