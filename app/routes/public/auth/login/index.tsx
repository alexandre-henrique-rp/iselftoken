import LayoutPublic from "~/components/layout_public";
import type { Route } from "./+types";
import { LoginForm } from "./components/LoginForm";

/**
 * @name meta
 * @description Define meta tags para a pagina de login.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Login" }, { name: "description", content: "Login" }];
}

/**
 * @name Login
 * @description Renderiza a pagina de login com layout split-screen.
 */
export default function Login() {
  return (
    <LayoutPublic>
      <LoginForm />
    </LayoutPublic>
  );
}
