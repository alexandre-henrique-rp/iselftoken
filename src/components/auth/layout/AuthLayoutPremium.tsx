/**
 * AuthLayoutPremium - Layout split-screen sofisticado
 * Design minimalista com experiência premium
 */

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AuthLayoutPremiumProps {
  /** Children (formulário) */
  children: React.ReactNode;
  /** Título da página */
  title?: string;
  /** Imagem de fundo personalizada */
  backgroundImage?: string;
  /** Mostrar link para login */
  showLoginLink?: boolean;
}

const AuthLayoutPremium: React.FC<AuthLayoutPremiumProps> = ({
  children,
  title = 'iSelfToken',
  backgroundImage = '/image-05.jpg',
  showLoginLink = true
}) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black">
      {/* Lado esquerdo - Formulário */}
      <div className="relative flex flex-col justify-center p-4 sm:p-6 md:p-10 lg:p-16">
        {/* Logo no superior esquerdo */}
        <div className="absolute top-6 left-6 lg:top-8 lg:left-8">
          <Link 
            href="/" 
            className="flex items-center gap-2 font-medium"
          >
            <h1 
              className="font-bold tracking-tight"
              style={{ 
                fontSize: 'clamp(20px, 4vw, 28px)',
                fontWeight: '300',
                letterSpacing: '-0.5px',
                color: '#d500f9'
              }}
            >
              {title}
            </h1>
          </Link>
        </div>

        <div className="w-full max-w-lg mx-auto space-y-8">
          {/* Formulário */}
          <div className="space-y-6">
            {children}
          </div>

          {/* Link para login */}
          {showLoginLink && (
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Já tem conta?{' '}
                <Link 
                  href="/login"
                  className="text-purple-400 hover:text-purple-300 transition-colors duration-200 underline underline-offset-4 hover:underline-offset-2"
                >
                  Entrar
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lado direito - Imagem */}
      <div 
        className="relative hidden lg:block overflow-hidden"
        style={{
          background: 'oklch(0.090 0.004 49.25)',
        }}
      >
        {/* Imagem de fundo */}
        <Image
          src={backgroundImage}
          alt="Pessoa preenchendo formulário"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 0vw, 50vw"
        />

        {/* Overlay com blur e gradiente */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(9, 9, 9, 0.7) 0%, rgba(9, 9, 9, 0.4) 50%, rgba(9, 9, 9, 0.6) 100%)',
            backdropFilter: 'blur(2px)',
          }}
        />

        {/* Conteúdo sobreposto */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-md">
            <h2 
              className="text-3xl font-light text-white leading-tight"
              style={{ 
                fontWeight: '300',
                letterSpacing: '1px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}
            >
              Invista em startups promissoras via tokenização de equity
            </h2>
            <p className="text-gray-300 text-base leading-relaxed">
              A iSelfToken conecta investidores e fundadores de startups em uma plataforma segura e acessível.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">Plataforma regulada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">Investimento acessível</span>
              </div>
            </div>
          </div>
        </div>

        {/* Elementos decorativos */}
        <div className="absolute top-8 right-8">
          <div 
            className="w-20 h-20 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #d500f9 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
        </div>
        
        <div className="absolute bottom-8 left-8">
          <div 
            className="w-32 h-32 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #d500f9 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthLayoutPremium;