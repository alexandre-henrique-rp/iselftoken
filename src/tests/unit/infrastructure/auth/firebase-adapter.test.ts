// Testes unitários para GenericAuthAdapter
// Segue abordagem TDD para validar comportamento do adaptador de autenticação

import { GenericAuthAdapter } from "@/infrastructure/auth/firebase-adapter";

describe("GenericAuthAdapter", () => {
  let authService: GenericAuthAdapter;

  beforeEach(() => {
    authService = new GenericAuthAdapter();
  });

  describe("login", () => {
    test("deve retornar sucesso com dados de usuário para credenciais válidas", async () => {
      const email = "teste@exemplo.com";
      const password = "senha123";
      const result = await authService.login(email, password);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.user.email).toBe(email);
      expect(result.data?.user.id).toBeDefined();
      expect(result.data?.token).toBeDefined();
    });

    test("deve retornar falha para credenciais inválidas", async () => {
      const email = "";
      const password = "";
      const result = await authService.login(email, password);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe("logout", () => {
    test("deve executar logout sem erros", async () => {
      await expect(authService.logout()).resolves.toBeUndefined();
    });
  });

  describe("getSession", () => {
    test("deve retornar dados de sessão simulados", async () => {
      const session = await authService.getSession();

      expect(session).toBeDefined();
      expect(session?.user).toBeDefined();
      expect(session?.user.id).toBeDefined();
      expect(session?.user.email).toBeDefined();
      expect(session?.token).toBeDefined();
    });
  });
});
