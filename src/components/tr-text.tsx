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
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isClient && ready && i18n?.isInitialized) {
      const translation = t(k);
      // Se a tradução for diferente da chave, usa a tradução; senão mantém a chave
      setTexto(translation && translation !== k ? translation : k);
    } else if (isClient) {
      setTexto(k);
    }
  }, [isClient, ready, i18n?.isInitialized, i18n?.language, k, t]);

  return (
    <Tag className={className} suppressHydrationWarning>
      {texto}
    </Tag>
  );
}
