import type React from "react";

/**
 * @name Banner
 * @description Estrutura de dados para banners rotativos da home.
 */
export interface Banner {
  id: number;
  title: string;
  description: string;
  image: string;
  category: string;
}

/**
 * @name StartupCard
 * @description Estrutura base de dados de uma startup usada nos cards.
 */
export interface StartupCard {
  id: number;
  name: string;
  description: string;
  image: string;
  category: string;
  badges: string[];
  valuation?: string;
  currentValue?: string;
  totalTokens?: number;
  soldTokens?: number;
  minInvestment?: string;
  deadline?: string;
  investors?: number;
}

/**
 * @name OpportunityItem
 * @description Estrutura das oportunidades exibidas na grade de investimento.
 */
export interface OpportunityItem {
  id: number;
  name: string;
  type: string;
  image?: string;
  badges?: string[];
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * @name Testimonial
 * @description Estrutura base para depoimentos de investidores e fundadores.
 */
export interface Testimonial {
  id: number;
  text: string;
  name: string;
  role: string;
  initials: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

/**
 * @name HomePageData
 * @description Conjunto de dados necessarios para renderizar a homepage.
 */
export interface HomePageData {
  fundraisingRounds: StartupCard[];
  verifiedStartups: StartupCard[];
  acceleratedStartups: StartupCard[];
  approvalStartups: StartupCard[];
  opportunities: OpportunityItem[];
  investorTestimonials: Testimonial[];
  founderTestimonials: Testimonial[];
}
