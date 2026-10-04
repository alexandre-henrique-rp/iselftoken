/**
 * Testes para MarketplacePositionCard (S3-T02).
 *
 * Cobre:
 *   - Renderiza score grande com unidade /100
 *   - Mostra badge "Em destaque por: <motivo>" se pinned
 *   - Mostra badge "Score alto" se score >= 85 e nao pinned
 *   - Mostra empty state "Vamos melhorar seu score?" se score === 0
 *   - Tooltip do breakdown mostra 9 chaves com earned/max
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  MarketplacePositionCard,
  type MarketplacePositionCardData,
} from "./marketplace-position-card";

const baseBreakdown = {
  kyc: { earned: 10, max: 10, count: 1 },
  documents: { earned: 15, max: 15, count: 5 },
  seals: { earned: 15, max: 15, count: 5 },
  traction: { earned: 10, max: 10, count: 6 },
  raised: { earned: 10, max: 10 },
  deadline: { earned: 5, max: 5, count: 1 },
  category: { earned: 5, max: 5, count: 1 },
  partnerships: { earned: 10, max: 10, count: 2 },
  activity: { earned: 20, max: 20 },
};

function buildData(overrides: Partial<MarketplacePositionCardData> = {}): MarketplacePositionCardData {
  return {
    startupId: 1,
    slug: "techinnovate",
    score: 92,
    scoreBreakdown: baseBreakdown,
    scoreLastCalculatedAt: "2026-09-22T10:00:00Z",
    pin: { manuallyPinned: false, manuallyPinnedReason: null },
    ...overrides,
  };
}

function wrap(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("MarketplacePositionCard (S3-T02)", () => {
  it("renderiza score grande com unidade /100", () => {
    wrap(<MarketplacePositionCard data={buildData({ score: 92 })} />);
    expect(screen.getByTestId("mp-score")).toHaveTextContent("92/100");
  });

  it("mostra badge 'Em destaque por: <motivo>' se pinned", () => {
    wrap(
      <MarketplacePositionCard
        data={buildData({
          score: 50,
          pin: {
            manuallyPinned: true,
            manuallyPinnedReason: "Y Combinator W26 batch",
          },
        })}
      />,
    );
    expect(screen.getByTestId("mp-pinned-badge")).toHaveTextContent(
      /Y Combinator W26 batch/,
    );
  });

  it("mostra badge 'Score alto' se score >= 85 e nao pinned", () => {
    wrap(
      <MarketplacePositionCard
        data={buildData({ score: 88, pin: { manuallyPinned: false } })}
      />,
    );
    expect(screen.getByTestId("mp-highscore-badge")).toBeInTheDocument();
    expect(screen.getByTestId("mp-highscore-badge")).toHaveTextContent(
      /Score alto/,
    );
  });

  it("NAO mostra badge 'Score alto' se score < 85 e nao pinned", () => {
    wrap(
      <MarketplacePositionCard
        data={buildData({ score: 70, pin: { manuallyPinned: false } })}
      />,
    );
    expect(screen.queryByTestId("mp-highscore-badge")).toBeNull();
  });

  it("mostra empty state 'Vamos melhorar seu score?' se score === 0", () => {
    wrap(
      <MarketplacePositionCard
        data={buildData({ score: 0, scoreBreakdown: undefined as any })}
      />,
    );
    expect(screen.getByTestId("mp-empty")).toBeInTheDocument();
    expect(screen.getByTestId("mp-empty")).toHaveTextContent(
      /melhorar seu score/i,
    );
  });

  it("botao 'Como melhorar?' expande tooltip com 9 chaves do breakdown", () => {
    wrap(<MarketplacePositionCard data={buildData()} />);
    const trigger = screen.getByTestId("mp-breakdown-trigger");
    fireEvent.click(trigger);

    const breakdown = screen.getByTestId("mp-breakdown");
    expect(breakdown).toBeInTheDocument();
    expect(breakdown).toHaveTextContent("kyc");
    expect(breakdown).toHaveTextContent("documents");
    expect(breakdown).toHaveTextContent("seals");
    expect(breakdown).toHaveTextContent("traction");
    expect(breakdown).toHaveTextContent("raised");
    expect(breakdown).toHaveTextContent("deadline");
    expect(breakdown).toHaveTextContent("category");
    expect(breakdown).toHaveTextContent("partnerships");
    expect(breakdown).toHaveTextContent("activity");
  });
});