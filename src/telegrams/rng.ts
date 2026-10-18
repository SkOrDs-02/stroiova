// Детермінований генератор (003 R1): LCG як у balance/sim.js, стан лежить у записі — відновлення не перекидає кубик.
export function next(state: number): { value: number; state: number } {
  const s = (state * 1664525 + 1013904223) % 4294967296;
  return { value: s / 4294967296, state: s };
}

/** Зручна обгортка: бере числа зі стану й віддає новий стан. */
export function roller(state: number) {
  let s = state;
  return {
    next(): number {
      const r = next(s);
      s = r.state;
      return r.value;
    },
    get state() {
      return s;
    },
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}
