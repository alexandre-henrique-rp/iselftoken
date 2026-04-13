import LayoutPublic from "~/components/layout_public";
import type { Route } from "../af2/+types";

import type { JSX } from "react";
import { RegisterForm } from "./components/RegisterForm";

/**
 * @name meta
 * @description Define meta tags da pagina de cadastro.
 *
 * @param {Route.MetaArgs} _args - Argumentos de meta fornecidos pela rota (não utilizados).
 * @returns {Array<{ title?: string; name?: string; content?: string }>} Lista de metadados da página.
 *
 * @example
 * // Exemplo de retorno positivo
 * const metaTags = meta({});
 * // Resultado esperado: [{ title: "Cadastro" }, { name: "description", content: "Cadastro de novo usuário" }]
 *
 * Fluxo de execução:
 * 1. Define o título da página para SEO e navegação.
 * 2. Define a descrição para contextualizar o conteúdo da rota.
 */
export function meta({}: Route.MetaArgs) {
  // Metadados da rota
  // Motivo: Fornecer informações básicas para SEO e UX
  return [
    // Título principal da página
    { title: "Cadastro" },
    // Descrição curta para motores de busca
    { name: "description", content: "Cadastro de novo usuário" },
  ];
}

/**
 * @name Cadastro
 * @description Renderiza a pagina de cadastro publica.
 *
 * @returns {JSX.Element} Layout completo da pagina de cadastro.
 *
 * @example
 * // Exemplo de retorno positivo
 * const element = <Cadastro />;
 *
 * Fluxo de execução:
 * 1. Aplica o layout público padrão da aplicação.
 * 2. Exibe o formulário de cadastro dentro do layout.
 */
export default function Cadastro({}): JSX.Element {
  return (
    // Layout compartilhado para páginas públicas
    // Motivo: Garantir consistência visual com outras rotas públicas
    <LayoutPublic>
      {/* Formulário responsável pelo cadastro do usuário */}
      <RegisterForm />
    </LayoutPublic>
  );
}
