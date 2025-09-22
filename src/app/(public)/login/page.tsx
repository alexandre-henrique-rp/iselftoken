import Image from "next/image";

import { LoginForm } from "@/components/login-form";

const tema = ["/image-01.jpg", "/image-02.jpg", "/image-03.jpg", "/image-04.jpg"]

export default function LoginPage() {
  // fazer um sorteio aleatório para selecionar uma imagem
  const randomImage = tema[Math.floor(Math.random() * tema.length)];

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <Image
              src="/logo.png"
              alt="Logo"
              width={1000}
              height={500}
              className="w-full max-w-lg h-9 object-contain"
            />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto py-6">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src={randomImage}
          alt="Image"
          fill
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4] "
        />
      </div>
    </div>
  );
}
