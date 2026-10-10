// Інтеграл кусково-сталої швидкості (001 FR-3, FR-24): Σ rateAt(середина) · (x₁ − x₀).
// cuts — відсортовані точки зміни множників; порожні й зворотні відрізки пропускаються, як у sim.js.
export function integrate(cuts: number[], rateAt: (t: number) => number): number {
  let got = 0;
  for (let c = 0; c + 1 < cuts.length; c++) {
    const x0 = cuts[c]!;
    const x1 = cuts[c + 1]!;
    if (x1 <= x0) continue;
    const mid = (x0 + x1) / 2;
    got += rateAt(mid) * (x1 - x0);
  }
  return got;
}
