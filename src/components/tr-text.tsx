"use client";

import { useTranslation } from 'react-i18next';
import '@/i18n';
import React from 'react';

/**
 * TrText
 * Componente client simples para renderizar uma chave de tradução.
 * Props:
 *  - k: chave no namespace 'common' (ex: 'home.hero.subtitle')
 *  - as: tag HTML a ser usada (default: 'span')
 *  - className: classes utilitárias
 */
interface TrTextProps {
  k: string;
  as?: React.ElementType;
  className?: string;
}

export function TrText({ k, as: Tag = 'span', className }: TrTextProps) {
  // Para evitar divergência de hidratação entre SSR e CSR, renderizamos a chave
  // no SSR e também no primeiro render do cliente; após montar e quando o i18n
  // estiver pronto/inicializado, atualizamos para o texto traduzido.
  const { t, i18n, ready } = useTranslation('common', { useSuspense: false });
  const [texto, setTexto] = React.useState<string>(k);

  React.useEffect(() => {
    if (ready || i18n?.isInitialized) {
      setTexto(t(k));
    } else {
      setTexto(k);
    }
    // Observa mudanças de idioma e da chave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, i18n?.language, k]);

  return (
    <Tag className={className} suppressHydrationWarning>
      {texto}
    </Tag>
  );
}
