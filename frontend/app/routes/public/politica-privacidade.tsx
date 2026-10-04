import { Footer } from "~/components/landing/footer";
import { Navbar } from "~/components/landing/navbar";
import { PrivacyPolicyContent } from "~/components/landing/privacy-policy-content";
import type { Route } from "./+types/politica-privacidade";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Política de Privacidade - iSelfToken" },
    {
      name: "description",
      content:
        "Política de Privacidade da iSelfToken Tecnologia Ltda (LGPD Lei 13.709/2018). Conheça como tratamos seus dados pessoais, finalidades, bases legais, retenção, direitos do titular e canal de contato com o Encarregado (DPO).",
    },
    { name: "robots", content: "index, follow" },
    { rel: "canonical", href: "https://iselftoken.com/politica-privacidade" },
    { property: "og:title", content: "Política de Privacidade - iSelfToken" },
    {
      property: "og:description",
      content:
        "Como a iSelfToken trata seus dados pessoais (LGPD). DPO, direitos do titular, finalidades, bases legais, retenção, compartilhamento e segurança.",
    },
    {
      property: "og:url",
      content: "https://iselftoken.com/politica-privacidade",
    },
  ];
}

// Loader público — sem autenticação. Conteúdo é estático + versionado.
export async function loader() {
  return {
    version: "v1.0",
    effectiveDate: "22/08/2026",
    nextReviewDate: "22/02/2027",
  };
}

export default function PoliticaPrivacidade({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <PrivacyPolicyContent
          version={loaderData.version}
          effectiveDate={loaderData.effectiveDate}
          nextReviewDate={loaderData.nextReviewDate}
        />
      </main>
      <Footer />
    </div>
  );
}
