// Конвеєр (001 FR-4, FR-6, FR-15): min(сума потоків, найвужча ланка). Порядок операцій — як flow() у sim.js.

export interface FlowStream {
  /** Виробіток, /хв, уже з музеєм і фактором події */
  cap: number;
  /** Відкрито й працює (в idle — лише з діловодом) */
  on: boolean;
  /** Р4: потік-частка; z = base · сума інших, далі z *= factors[k] по черзі */
  share?: { base: number; factors: number[] };
}

export interface FlowStage {
  /** Пропускна здатність, /хв, уже з музеєм і фактором події */
  cap: number;
  on: boolean;
}

export interface FlowResult {
  sum: number;
  pipe: number;
  /** Індекс найвужчої ланки (перша з мінімальних); -1, якщо ланок немає */
  which: number;
  v: number;
}

export function flow(streams: FlowStream[], stages: FlowStage[]): FlowResult {
  let sum = 0;
  let zi = -1;
  for (let i = 0; i < streams.length; i++) {
    const s = streams[i]!;
    if (s.share) { zi = i; continue; }
    if (s.on) sum += s.cap;
  }
  if (zi >= 0) {
    const z0 = streams[zi]!;
    if (z0.on && z0.share) {
      let z = z0.share.base * sum;
      for (const f of z0.share.factors) z *= f;
      sum += z;
    }
  }
  let pipe = Infinity;
  let which = -1;
  for (let j = 0; j < stages.length; j++) {
    const g = stages[j]!;
    const c = g.on ? g.cap : 0;
    if (c < pipe) { pipe = c; which = j; }
  }
  return { sum, pipe, which, v: Math.min(sum, pipe) };
}
