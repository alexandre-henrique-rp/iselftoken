import React from 'react';

/**
 * Componente de loading personalizado com animação circular contínua de três elementos.
 * Inspirado em https://dribbble.com/shots/22910477-PRELOADER-Loading-page-or-Preloading-screen.
 * Otimizado para movimento suave, responsividade e prevenção de travamentos.
 * @returns JSX.Element
 */
export function Loading() {
  return (
    <div data-testid="loading-container" className="flex justify-center items-center min-h-screen bg-black">
      <style>
        {`
          @keyframes moveDot { 
            0% { transform: rotate(0deg) translate(50px) rotate(0deg); } 
            33% { transform: rotate(120deg) translate(50px) rotate(-120deg); } 
            66% { transform: rotate(240deg) translate(50px) rotate(-240deg); } 
            100% { transform: rotate(360deg) translate(50px) rotate(-360deg); } 
          }
        `}
      </style>
      <div className="relative w-16 h-16 sm:w-24 md:w-32 will-change-transform">
        <div 
          data-testid="dot-1" 
          role="img" 
          aria-label="Ponto 1 animado" 
          className="absolute w-6 h-6 sm:w-8 md:w-8 bg-blue-500 rounded-full" 
          style={{ 
            animation: 'moveDot 3s linear infinite',
            animationDelay: '0s' 
          }} 
        />
        <div 
          data-testid="dot-2" 
          role="img" 
          aria-label="Ponto 2 animado" 
          className="absolute w-6 h-6 sm:w-8 md:w-8 bg-red-500 rounded-full" 
          style={{ 
            animation: 'moveDot 3s linear infinite',
            animationDelay: '0.5s' 
          }} 
        />
        <div 
          data-testid="dot-3" 
          role="img" 
          aria-label="Ponto 3 animado" 
          className="absolute w-6 h-6 sm:w-8 md:w-8 bg-green-500 rounded-full" 
          style={{ 
            animation: 'moveDot 3s linear infinite',
            animationDelay: '1s' 
          }} 
        />
        <div 
          data-testid="dot-4" 
          role="img" 
          aria-label="Ponto 4 animado" 
          className="absolute w-6 h-6 sm:w-8 md:w-8 bg-yellow-500 rounded-full" 
          style={{ 
            animation: 'moveDot 3s linear infinite',
            animationDelay: '1.5s' 
          }} 
        />
        <div 
          data-testid="dot-5" 
          role="img" 
          aria-label="Ponto 5 animado" 
          className="absolute w-6 h-6 sm:w-8 md:w-8 bg-blue-500 rounded-full" 
          style={{ 
            animation: 'moveDot 3s linear infinite',
            animationDelay: '2s' 
          }} 
        />
        <div 
          data-testid="dot-6" 
          role="img" 
          aria-label="Ponto 6 animado" 
          className="absolute w-6 h-6 sm:w-8 md:w-8 bg-cyan-500 rounded-full" 
          style={{ 
            animation: 'moveDot 3s linear infinite',
            animationDelay: '2.5s' 
          }} 
        />
      </div>
    </div>
  );
}

export default Loading;
