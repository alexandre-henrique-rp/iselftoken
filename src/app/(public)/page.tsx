import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-zinc-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-blue-500">
              iSelfToken
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Link
              className="text-blue-500 hover:text-zinc-200 transition-colors"
              href="#"
            >
              iSelfToken Education
            </Link>
            <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-600/90 transition-colors">
              Entrar
            </Button>
          </nav>
          <div className="md:hidden">
            <span className="text-sm text-zinc-400">Menu</span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-black">
          <div className="container mx-auto px-6 pt-20 md:pt-28 pb-16">
            <div className="flex flex-col items-center gap-8 text-center">
              <Image
                src="/hero.png"
                alt="iSelfToken"
                width={1024}
                height={512}
                priority
                sizes="(max-width: 768px) 90vw, (max-width: 1280px) 800px, 1024px"
                className="w-full max-w-xl h-auto"
              />
              <p className="max-w-2xl text-zinc-400 text-lg md:text-xl">
                A iSelfToken conecta investidores a ativos digitais inovadores
                com alto potencial de crescimento.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="inline-flex bg-transparent items-center justify-center rounded-md border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors p-6 text-base font-medium"
                >
                  Explorar Oportunidades
                </Button>
                <Button className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-600/90 transition-colors p-6 text-base font-medium">
                  Comece a Investir
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Destaques (placeholder, sem JS para manter Server Component) */}
        <section id="explorar" className="bg-black py-12">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Rodadas de captação
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                >
                  <div className="aspect-[16/9] bg-zinc-800" />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold">Startup #{i}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-md border border-zinc-700 text-zinc-400">
                        Categoria
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">
                      Descrição breve da oportunidade de investimento com alto
                      potencial de crescimento.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Progresso</span>
                        <span className="text-zinc-100 font-medium">
                          R$ 150.000 de R$ 400.000
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: "45%" }}
                        />
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <a
                        className="inline-flex items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors py-2 text-sm"
                        href="#"
                      >
                        Ver detalhes
                      </a>
                      <a
                        className="inline-flex items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-600/90 transition-colors py-2 text-sm"
                        href="/login"
                      >
                        Login para Investir
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-zinc-950 py-16">
          <div className="container mx-auto px-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-zinc-100">
                  Pronto para começar a investir?
                </h3>
                <p className="text-zinc-400 mt-2">
                  Crie sua conta gratuita e tenha acesso às melhores
                  oportunidades.
                </p>
              </div>
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-colors px-6 py-3 text-sm font-medium"
              >
                Criar Conta Gratuita
              </a>
            </div>
          </div>
        </section>

        {/* Depoimentos */}
        <section className="bg-zinc-950 py-16">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
              O que Nossos Investidores Dizem
            </h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {["Ana Silva", "Carlos Pereira", "Juliana Costa"].map((name) => (
                <div
                  key={name}
                  className="bg-black rounded-xl border border-zinc-800"
                >
                  <div className="p-6">
                    <p className="text-zinc-400 italic">
                      A iSelfToken abriu portas para investimentos que eu não
                      teria acesso. Curadoria impecável!
                    </p>
                  </div>
                  <div className="flex items-center p-6 pt-0">
                    <div className="h-12 w-12 rounded-full bg-zinc-800 mr-4" />
                    <div>
                      <p className="font-semibold text-zinc-100">{name}</p>
                      <p className="text-sm text-blue-400">Investidor(a)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-300">
        <div className="container mx-auto px-6 py-12 border-t border-zinc-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 text-white font-bold">iSelfToken</div>
              <p className="text-sm text-zinc-400">
                Conectando investidores a ativos digitais inovadores.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Para Investidores
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Para Projetos
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-400">
                    Privacidade
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contato</h4>
              <ul className="space-y-2 text-sm">
                <li>Email</li>
                <li>Telefone</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-400">
            <p>
              &copy; {new Date().getFullYear()} iSelfToken. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
