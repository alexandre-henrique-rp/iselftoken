import { RegisterContainer } from "~/components/auth/register-container";
import { RegisterForm } from "~/components/auth/register-form";
import type { Route } from "./+types/register";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cadastro - iSelfToken" },
    {
      name: "description",
      content: "Crie sua conta no iSelfToken e comece a investir em startups.",
    },
  ];
}

export default function Register() {
  return (
    <RegisterContainer>
      <RegisterForm />
    </RegisterContainer>
  );
}
