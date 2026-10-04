import type { Route } from "./+types/forgot-password";
import { LoginContainer } from "~/components/login/login-container";
import { AuthHero } from "~/components/auth/auth-hero";
import { ForgotPasswordForm } from "~/components/auth/forgot-password-form";
import { ShieldCheck } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recuperar Senha - iSelfToken" },
    {
      name: "description",
      content: "Recupere o acesso à sua conta iSelfToken com segurança.",
    },
  ];
}

export default function ForgotPassword() {
  return (
    <LoginContainer
      hero={
        <AuthHero
          badgeText="Quantum-Shield Verified"
          title={
            <>
              Sua segurança é nossa <br />
              <span className="text-primary drop-shadow-[0_0_20px_rgba(213,0,249,0.3)]">
                prioridade absoluta.
              </span>
            </>
          }
          subtitle="Proteção em Camadas"
          icon={ShieldCheck}
          footerText="iSelfToken Identity Governance"
        />
      }
      form={<ForgotPasswordForm />}
    />
  );
}
