"use client";

import React, { useState } from "react";

export type OpportunityData = {
  name: string;
  subName: string;
  category: "Fintech" | "AI" | "EdTech" | "SaaS" | "Healthtech" | "Biotech";
  icon: "fintech" | "ai" | "education" | "saas" | "health" | "biotech";
};

type ExploreOpportunitiesProps = {
  opportunities: OpportunityData[];
  categories: string[];
  selectedCategory?: string;
};

/**
 * Componente para exibir seção de exploração de oportunidades de investimento
 * com filtros por categoria e grid de cards de startups
 */
export function ExploreOpportunities({
  opportunities,
  categories,
  selectedCategory = "All",
}: ExploreOpportunitiesProps) {
  const [activeCategory, setActiveCategory] = useState(selectedCategory);
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "fintech":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        );
      case "ai":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5a3 3 0 1 0-5.993.25a3 3 0 0 0 5.993-.25m0 14a3 3 0 1 0-5.993.25a3 3 0 0 0 5.993-.25m8-14a3 3 0 1 0-5.993.25a3 3 0 0 0 5.993-.25m0 14a3 3 0 1 0-5.993.25a3 3 0 0 0 5.993-.25M5 12a3 3 0 1 0-5.993.25A3 3 0 0 0 5 12m14 0a3 3 0 1 0-5.993.25a3 3 0 0 0 5.993-.25M12 5v7m0 7v-7m-7-2h7m7 2h-7" />
          </svg>
        );
      case "education":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22c-2 0-4-2-4-4 0-2 2-4 4-4s4 2 4 4c0 2-2 4-4 4z"></path>
            <path d="M12 14V2"></path>
            <path d="M12 2L8 6"></path>
            <path d="M12 2l4 4"></path>
          </svg>
        );
      case "saas":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
        );
      case "health":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"></path>
            <path d="M3.22 12H9.5l.5-1 2 4.44L15.5 9l.5 3H22"></path>
          </svg>
        );
      case "biotech":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2v6h.01L8 14H6v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6h-2.01L18 8V2"></path>
            <path d="M2 15h20"></path>
            <path d="M14 15l-1-1 1-1"></path>
            <path d="M10 15l1-1-1-1"></path>
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        );
    }
  };

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold tracking-tighter text-foreground text-center mb-4">
          Oportunidades de investimento
        </h2>
        <div className="flex justify-center flex-wrap gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${
                category === activeCategory
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {opportunities.map((startup, idx) => (
            <div
              key={idx}
              className="bg-zinc-700 dark:bg-zinc-900 border border-border rounded-lg p-4 flex flex-col items-start text-left h-full shadow-sm"
            >
              <div className="text-blue-600 mb-3">{getIcon(startup.icon)}</div>
              <h4 className="font-bold text-lg text-blue-600 dark:text-white">{startup.name}</h4>
              <p className="text-sm text-white dark:text-muted-foreground mb-4 flex-grow">
                {startup.subName}
              </p>
              <button className="border border-transparent text-white dark:text-white bg-white/20 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors w-full mt-auto py-2">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
