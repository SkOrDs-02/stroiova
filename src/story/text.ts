// Підстановки в сюжетних текстах (014 FR-12): {позивний}, {m:…|f:…}, {n}. За невідомої статі - чоловіча форма.
export type StoryGender = 'm' | 'f' | null;

export function storyText(text: string, gender: StoryGender, callsign: string, n?: number): string {
  return text
    .replace(/\{m:([^|}]*)\|f:([^}]*)\}/g, (_, m: string, f: string) => (gender === 'f' ? f : m))
    .replace(/\{позивний\}/g, callsign)
    .replace(/\{n\}/g, n == null ? '' : String(n));
}
