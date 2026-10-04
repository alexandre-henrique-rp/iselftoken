import { Footer } from "~/components/landing/footer";
import { Navbar } from "~/components/landing/navbar";
import { TermsOfUseContent } from "~/components/landing/terms-of-use-content";
import type { Route } from "./+types/termos-de-uso";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Termos de Uso - iSelfToken" },
    {
      name: "description",
      content:
        "Termos de Uso da plataforma iSelfToken — equity crowdfunding tokenizado sob Resolução CVM 88/2022.",
    },
    { name: "robots", content: "index, follow" },
    {
      rel: "canonical",
      href: "https://iselftoken.com/termos-de-uso",
    },
    {
      property: "og:title",
      content: "Termos de Uso - iSelfToken",
    },
    {
      property: "og:description",
      content:
        "Termos de Uso da plataforma iSelfToken — equity crowdfunding tokenizado sob Resolução CVM 88/2022.",
    },
  ];
}

export async function loader() {
  return {
    version: "v1.0",
    effectiveDate: "08/09/2026",
    nextReviewDate: "08/03/2027",
  };
}

export default function TermosDeUso({ loaderData }: Route.ComponentProps) {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <TermsOfUseContent
          version={loaderData.version}
          effectiveDate={loaderData.effectiveDate}
          nextReviewDate={loaderData.nextReviewDate}
        />
      </main>
      <Footer />
    </div>
  );
}
