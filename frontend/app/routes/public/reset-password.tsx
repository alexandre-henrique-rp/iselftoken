import type { Route } from "./+types/reset-password";
import { LoginContainer } from "~/components/login/login-container";
import { AuthHero } from "~/components/auth/auth-hero";
import { ResetPasswordForm } from "~/components/auth/reset-password-form";
import { ShieldAlert } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Redefinir Senha - iSelfToken" },
    {
      name: "description",
      content: "Redefina sua senha com segurança na plataforma iSelfToken.",
    },
  ];
}

export default function ResetPassword() {
  return (
    <LoginContainer
      hero={
        <AuthHero
          badgeText="Inviolável Infrastructure"
          title={
            <>
              Segurança <br />
              <span className="text-primary drop-shadow-[0_0_20px_rgba(213,0,249,0.3)]">
                Inviolável.
              </span>
            </>
          }
          subtitle="Criptografia Militar"
          icon={ShieldAlert}
          footerText="Argon2id Hashing Protection Active"
        />
      }
      form={<ResetPasswordForm />}
    />
  );
}
