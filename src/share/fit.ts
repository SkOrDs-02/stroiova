// Підгін тексту картинки (007 FR-28): основний текст ужимається з 36 до 28 px кроком 2 px; що не влазить при 28 px - обрізається
// по межі речення з «…». Шрифт машинописний (моноширинний), тож ширина рядка рахується в знаках. Чиста функція.

export interface FitBox {
  /** Ширина й висота поля тексту, px на картинці 1080 */
  width: number;
  height: number;
}

export interface FitOptions {
  maxFs: number;
  minFs: number;
  step: number;
  /** Ширина знака моноширинного шрифту як частка кегля */
  charW: number;
  /** Міжрядковий інтервал як частка кегля */
  lineH: number;
}

/** 007 FR-28: 36 -> 28 px кроком 2 px */
export const FIT: FitOptions = { maxFs: 36, minFs: 28, step: 2, charW: 0.6, lineH: 1.35 };

export interface Fitted {
  text: string;
  fontSize: number;
  lines: number;
  truncated: boolean;
}

/** Розбити текст на рядки по словах; довге слово переноситься як є (рядок ширший за поле не допускаємо - ріжемо слово) */
export function wrap(text: string, perLine: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      let w = word;
      while (w.length > perLine) {
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(w.slice(0, perLine));
        w = w.slice(perLine);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= perLine) line += ` ${w}`;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

function linesAt(text: string, fs: number, box: FitBox, o: FitOptions): { lines: number; max: number } {
  const perLine = Math.max(1, Math.floor(box.width / (fs * o.charW)));
  return { lines: wrap(text, perLine).length, max: Math.max(1, Math.floor(box.height / (fs * o.lineH))) };
}

/** Речення тексту разом з розділовими знаками й пробілами між ними */
function sentences(text: string): string[] {
  return text.match(/[^.!?…]+[.!?…]+[»"')]*\s*|[^.!?…]+$/g) ?? [text];
}

/**
 * Найбільший кегль від `maxFs` до `minFs`, при якому текст влазить; не влазить і при `minFs` - лишаємо стільки цілих речень,
 * скільки влазить разом із «…» (жодного - то перше речення ріжемо по словах).
 */
export function fitText(text: string, box: FitBox, o: FitOptions = FIT): Fitted {
  for (let fs = o.maxFs; fs >= o.minFs; fs -= o.step) {
    const r = linesAt(text, fs, box, o);
    if (r.lines <= r.max) return { text, fontSize: fs, lines: r.lines, truncated: false };
  }
  const fs = o.minFs;
  const parts = sentences(text);
  let kept = '';
  for (const p of parts) {
    const next = (kept + p).trimEnd();
    if (linesAt(`${next} …`, fs, box, o).lines > linesAt('', fs, box, o).max) break;
    kept += p;
  }
  let out = kept.trimEnd();
  if (!out) {
    // перше речення довше за поле: ріжемо по словах
    const words = text.split(/\s+/);
    for (const w of words) {
      const next = out ? `${out} ${w}` : w;
      if (linesAt(`${next} …`, fs, box, o).lines > linesAt('', fs, box, o).max) break;
      out = next;
    }
  }
  const final = `${out} …`;
  return { text: final, fontSize: fs, lines: linesAt(final, fs, box, o).lines, truncated: true };
}
