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
  const { t } = useTranslation('common');
  return <Tag className={className}>{t(k)}</Tag>;
}
