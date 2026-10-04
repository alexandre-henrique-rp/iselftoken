import type { Route } from "./+types/validate-email";
import { LoginContainer } from "~/components/login/login-container";
import { AuthHero } from "~/components/auth/auth-hero";
import { ValidateEmailForm } from "~/components/auth/validate-email-form";
import { MailCheck } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verificação de Email - iSelfToken" },
    {
      name: "description",
      content: "Valide seu email para acessar a plataforma iSelfToken.",
    },
  ];
}

export default function ValidateEmail() {
  return (
    <LoginContainer
      hero={
        <AuthHero
          badgeText="Account Verification"
          title={
            <>
              Validação <br />
              <span className="text-primary drop-shadow-[0_0_20px_rgba(213,0,249,0.3)]">
                de Conta.
              </span>
            </>
          }
          subtitle="Identidade Confirmada"
          icon={MailCheck}
          footerText="Secure Authentication Flow"
        />
      }
      form={<ValidateEmailForm />}
    />
  );
}
