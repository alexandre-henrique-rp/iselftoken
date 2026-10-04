import { describe, expect, it } from "vitest";
import {
  CHALLENGE_POOL,
  isChallengeSatisfied,
  pickChallenges,
  type ChallengeSignals,
} from "./challenges";

const base: ChallengeSignals = {
  deltaYaw: 0,
  deltaPitch: 0,
  blinkCount: 0,
  blendshape: () => 0,
};

describe("isChallengeSatisfied — pose", () => {
  it("look_up satisfeito com pitch bem negativo", () => {
    expect(isChallengeSatisfied("look_up", { ...base, deltaPitch: -12 })).toBe(
      true,
    );
    expect(isChallengeSatisfied("look_up", { ...base, deltaPitch: -3 })).toBe(
      false,
    );
  });

  it("look_down / look_left / look_right", () => {
    expect(
      isChallengeSatisfied("look_down", { ...base, deltaPitch: 12 }),
    ).toBe(true);
    expect(isChallengeSatisfied("look_left", { ...base, deltaYaw: 12 })).toBe(
      true,
    );
    expect(
      isChallengeSatisfied("look_right", { ...base, deltaYaw: -12 }),
    ).toBe(true);
  });
});

describe("isChallengeSatisfied — blink", () => {
  it("exige 2 piscadas", () => {
    expect(isChallengeSatisfied("blink", { ...base, blinkCount: 1 })).toBe(
      false,
    );
    expect(isChallengeSatisfied("blink", { ...base, blinkCount: 2 })).toBe(
      true,
    );
  });
});

describe("isChallengeSatisfied — blendshapes (anti-deepfake)", () => {
  it("open_mouth via jawOpen", () => {
    const s = { ...base, blendshape: (n: string) => (n === "jawOpen" ? 0.6 : 0) };
    expect(isChallengeSatisfied("open_mouth", s)).toBe(true);
    const closed = {
      ...base,
      blendshape: (n: string) => (n === "jawOpen" ? 0.1 : 0),
    };
    expect(isChallengeSatisfied("open_mouth", closed)).toBe(false);
  });

  it("smile via média dos cantos da boca", () => {
    const s = {
      ...base,
      blendshape: (n: string) =>
        n === "mouthSmileLeft" || n === "mouthSmileRight" ? 0.7 : 0,
    };
    expect(isChallengeSatisfied("smile", s)).toBe(true);
  });
});

describe("pickChallenges", () => {
  it("sorteia N desafios distintos", () => {
    let calls = 0;
    // rng determinístico: sempre pega o primeiro elemento restante.
    const rng = () => {
      calls++;
      return 0;
    };
    const picked = pickChallenges(CHALLENGE_POOL, 3, rng);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3); // sem repetição
    expect(calls).toBe(3);
  });

  it("não excede o tamanho do pool", () => {
    const picked = pickChallenges(["blink", "smile"], 5);
    expect(picked).toHaveLength(2);
  });

  it("usa Math.random por padrão sem lançar", () => {
    expect(() => pickChallenges(CHALLENGE_POOL, 2)).not.toThrow();
  });
});
